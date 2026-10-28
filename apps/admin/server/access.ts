/**
 * Verifies the Cloudflare Access token that Cloudflare adds to every request
 * from a signed-in user (header Cf-Access-Jwt-Assertion). Without a valid
 * token the save API refuses to do anything, so it's safe to deploy before
 * Access is switched on.
 */

export interface AccessConfig {
  /** e.g. "myteam.cloudflareaccess.com" */
  teamDomain: string;
  /** The Access application's "Application Audience (AUD) tag". */
  aud: string;
}

export interface AccessUser {
  email: string;
}

export class AccessError extends Error {}

const b64urlToBytes = (s: string): Uint8Array<ArrayBuffer> => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = (s: string): Record<string, unknown> => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

export const normalizeTeamDomain = (d: string) => d.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

type Jwk = JsonWebKey & { kid?: string };
const certCache = new Map<string, { keys: Jwk[]; at: number }>();

async function signingKeys(teamDomain: string, fetchFn: typeof fetch, now: number): Promise<Jwk[]> {
  const cached = certCache.get(teamDomain);
  if (cached && now - cached.at < 10 * 60_000) return cached.keys;
  const res = await fetchFn(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new AccessError(`Couldn't fetch Access signing keys (${res.status}).`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  certCache.set(teamDomain, { keys, at: now });
  return keys;
}

export function clearAccessKeyCache() {
  certCache.clear();
}

export async function verifyAccessJwt(
  token: string | null,
  config: AccessConfig,
  fetchFn: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<AccessUser> {
  if (!token) throw new AccessError("Not signed in through Cloudflare Access.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new AccessError("Malformed Access token.");
  const [h, p, sig] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = b64urlJson(h);
    payload = b64urlJson(p);
  } catch {
    throw new AccessError("Malformed Access token.");
  }
  if (header.alg !== "RS256") throw new AccessError("Unexpected Access token algorithm.");

  const teamDomain = normalizeTeamDomain(config.teamDomain);
  const jwk = (await signingKeys(teamDomain, fetchFn, now)).find((k) => k.kid === header.kid);
  if (!jwk) throw new AccessError("Access token signed with an unknown key.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(sig),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!valid) throw new AccessError("Access token signature is invalid.");

  const seconds = Math.floor(now / 1000);
  if (typeof payload.exp !== "number" || payload.exp < seconds) throw new AccessError("Access token has expired. Reload the page.");
  if (typeof payload.nbf === "number" && payload.nbf > seconds + 60) throw new AccessError("Access token isn't valid yet.");
  if (payload.iss !== `https://${teamDomain}`) throw new AccessError("Access token comes from a different team.");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(config.aud)) throw new AccessError("Access token is for a different application.");
  if (typeof payload.email !== "string") throw new AccessError("Access token has no email.");
  return { email: payload.email };
}
