/**
 * F058: publish from the desktop app to Cloudflare Pages or Netlify with
 * the person's own token (design/f058-publish-to-host-v1.html, direction A).
 * The app's Rust side talks to the hosts and keeps the token in the
 * computer's keychain (crates/crust-desktop/src/hosts.rs); this side asks
 * it, and holds the words and steps the Publish card shows.
 */
import type { BuildReport } from "../desktop/local-publish";
import type { Invoke } from "../desktop/tauri-folder";

export type HostKind = "cloudflare" | "netlify";

/** crust_desktop::hosts::ConnectionView */
export interface HostConnection {
  host: HostKind;
  accountName: string;
  /** The address's first part ("harbour-studio"). */
  project: string;
  url: string;
  lastPublished: number | null;
  /** False when the keychain no longer has the token. */
  hasToken: boolean;
}

export interface HostStatus {
  connection: HostConnection | null;
  /** The address the connect dialog starts with. */
  suggestedName: string;
}

export interface HostAccount {
  id: string;
  name: string;
}

export interface HostProgress {
  done: number;
  total: number;
}

export interface HostPublished {
  url: string;
  uploaded: number;
  files: number;
}

/**
 * What went wrong, as the app reports it. `kind`: "token" (ask for a new
 * token), "offline", "taken" (`suggestion` is a free address), "name",
 * "gone" (the project was deleted on the host), "disconnected", "problems"
 * (the page checks stopped it), "other".
 */
export class HostFailure extends Error {
  constructor(
    readonly kind: string,
    message: string,
    readonly suggestion?: string,
  ) {
    super(message);
    this.name = "HostFailure";
  }
}

/** Turns whatever the app rejected with into a HostFailure. */
export function asHostFailure(e: unknown): HostFailure {
  if (e instanceof HostFailure) return e;
  if (e && typeof e === "object" && "kind" in e && "message" in e) {
    const { kind, message, suggestion } = e as { kind: unknown; message: unknown; suggestion?: unknown };
    return new HostFailure(String(kind), String(message), typeof suggestion === "string" ? suggestion : undefined);
  }
  return new HostFailure("other", e instanceof Error ? e.message : String(e));
}

/** Listens to an app event; returns how to stop (Tauri's `listen`). */
export type Listen = <T>(event: string, handler: (payload: T) => void) => Promise<() => void>;

export interface HostsApi {
  status(): Promise<HostStatus>;
  checkToken(host: HostKind, token: string): Promise<HostAccount[]>;
  connect(host: HostKind, token: string, account: HostAccount, name: string): Promise<HostConnection>;
  replaceToken(token: string): Promise<HostConnection>;
  disconnect(): Promise<void>;
  openTokenPage(host: HostKind): Promise<void>;
  /** Opens the live site in the browser. */
  openSite(): Promise<void>;
  /** Builds the site with every check on, then uploads it. */
  publish(onProgress: (p: HostProgress) => void): Promise<{ published: HostPublished; report: BuildReport }>;
}

/** `build(hostUrl)` builds the site to upload; hostUrl stands in for an unset site address. */
export function hostsApi(invoke: Invoke, listen: Listen, build: (hostUrl?: string) => Promise<BuildReport>): HostsApi {
  const call = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    try {
      return (await invoke(cmd, args)) as T;
    } catch (e) {
      throw asHostFailure(e);
    }
  };
  return {
    status: () => call<HostStatus>("host_status"),
    checkToken: (host, token) => call<HostAccount[]>("host_check_token", { host, token }),
    connect: (host, token, account, name) => call<HostConnection>("host_connect", { host, token, account, name }),
    replaceToken: (token) => call<HostConnection>("host_replace_token", { token }),
    disconnect: () => call<void>("host_disconnect"),
    openTokenPage: (host) => call<void>("host_open_token_page", { host }),
    openSite: () => call<void>("host_open_site"),
    async publish(onProgress) {
      let report: BuildReport;
      const { connection } = await call<HostStatus>("host_status");
      if (!connection) throw new HostFailure("disconnected", "This site isn't connected to a host yet.");
      try {
        report = await build(connection.url);
      } catch (e) {
        throw new HostFailure("problems", e instanceof Error ? e.message : String(e));
      }
      const stop = await listen<HostProgress>("host-progress", onProgress);
      try {
        const published = await call<HostPublished>("host_publish");
        return { published, report };
      } finally {
        stop();
      }
    },
  };
}

let current: HostsApi | null = null;

/** The desktop app's hosts; null on the web. */
export const desktopHosts = (): HostsApi | null => current;

export function setDesktopHosts(api: HostsApi | null) {
  current = api;
}

// ------------------------------------------------------------------ words

export const HOSTS: Record<HostKind, { name: string; product: string; domain: string; maxName: number; steps: string[]; permission?: string }> = {
  cloudflare: {
    name: "Cloudflare",
    product: "Cloudflare Pages",
    domain: ".pages.dev",
    maxName: 58,
    steps: [
      "Open your Cloudflare token page and sign in.",
      "Choose Create Token, then Create Custom Token.",
      "Name it “Crust”. Under Permissions pick Account, Cloudflare Pages, Edit.",
      "Choose Continue to summary, then Create Token, and copy the token.",
    ],
    permission: "Account · Cloudflare Pages · Edit",
  },
  netlify: {
    name: "Netlify",
    product: "Netlify",
    domain: ".netlify.app",
    maxName: 63,
    steps: [
      "Open your Netlify token page and sign in.",
      "Under Personal access tokens choose New access token.",
      "Describe it as “Crust”, pick how long it lasts, and generate it.",
      "Copy the token.",
    ],
  },
};

/** What's wrong with an address, in words for under the field; null if fine. */
export function addressProblem(host: HostKind, name: string): string | null {
  const max = HOSTS[host].maxName;
  if (!name) return "Type an address.";
  if (name.length > max) return `Use a shorter address (at most ${max} characters).`;
  if (!/^[a-z0-9-]+$/.test(name)) return "Use only lowercase letters, numbers and dashes.";
  if (name.startsWith("-") || name.endsWith("-")) return "Don't start or end the address with a dash.";
  return null;
}

/** Typing helper: "Harbour Studio" → "harbour-studio" as you type. */
export const tidyAddress = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");

/** "Today, 9:41", "Yesterday, 18:02", or "Oct 30, 9:41". */
export function whenPublished(ms: number, now = Date.now(), locale?: string): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date(now)) - day(date)) / 86_400_000);
  if (days === 0) return `today, ${time}`;
  if (days === 1) return `yesterday, ${time}`;
  return `${date.toLocaleDateString(locale, { month: "short", day: "numeric" })}, ${time}`;
}

/** "Uploading 14 of 38 files…" */
export function describeProgress(p: HostProgress | null): string {
  if (!p) return "Building your site: pages, photos, search…";
  if (p.total === 0) return "Nothing new to upload. Finishing…";
  if (p.done >= p.total) return "Finishing…";
  return `Uploading ${p.done} of ${p.total} ${p.total === 1 ? "file" : "files"}…`;
}
