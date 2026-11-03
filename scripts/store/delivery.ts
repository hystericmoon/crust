/**
 * F067: what Publish store hands the delivery Worker. Every priced template
 * goes into the Worker's Workers KV namespace as two keys: its record
 * (`template:<id>`: name, release, changes) and its file (`file:<id>`). The
 * Worker (packages/delivery) serves those to buyers' download pages. A
 * template taken off sale keeps its keys, so people who bought it can still
 * download it.
 */
import type { TemplateRecord } from "../../packages/delivery/src/worker";
import { keys } from "../../packages/delivery/src/worker";
import { isPriced, type StoreTemplate } from "./model";

/** The KV namespace's title in Cloudflare (created when missing). */
export const DELIVERY_NAMESPACE = "crust-delivery";
/** Workers KV's limit per value is 25 MiB; stay clear of it. */
export const MAX_FILE_BYTES = 24 * 1024 * 1024;
/** Keep each bulk request well under Cloudflare's 100 MB. */
const MAX_REQUEST_BYTES = 60 * 1024 * 1024;

export interface KvPair {
  key: string;
  value: string;
}

/** The KV pairs for every priced template; throws when a file is missing or too big. */
export function deliveryPairs(templates: StoreTemplate[], readFile: (path: string) => string | null): KvPair[] {
  const pairs: KvPair[] = [];
  for (const { item, template } of templates.filter(({ item }) => isPriced(item))) {
    const text = readFile(item.file);
    if (text === null) throw new Error(`“${item.id}”: ${item.file} isn't there.`);
    if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error(`“${item.id}”: ${item.file} is over 24 MB, too big to deliver.`);
    if (!template.release) throw new Error(`“${item.id}”: a priced template needs a release number (F065).`);
    const record: TemplateRecord = { id: item.id, name: template.name, release: template.release, changes: item.changes ?? [] };
    pairs.push({ key: keys.template(item.id), value: JSON.stringify(record) });
    pairs.push({ key: keys.file(item.id), value: text });
  }
  return pairs;
}

/** Splits pairs into bulk requests under the size limit (files first, records last, so a record never points at a missing file). */
export function batches(pairs: KvPair[], limit = MAX_REQUEST_BYTES): KvPair[][] {
  const ordered = [...pairs.filter((p) => p.key.startsWith("file:")), ...pairs.filter((p) => !p.key.startsWith("file:"))];
  const out: KvPair[][] = [];
  let current: KvPair[] = [];
  let size = 0;
  for (const p of ordered) {
    const bytes = p.key.length + p.value.length + 32;
    if (current.length && size + bytes > limit) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += bytes;
  }
  if (current.length) out.push(current);
  return out;
}

export interface Cloudflare {
  accountId: string;
  token: string;
  fetch?: typeof fetch;
}

async function api<T>(cf: Cloudflare, method: string, path: string, body?: unknown): Promise<T> {
  const res = await (cf.fetch ?? fetch)(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/storage/kv/namespaces${path}`, {
    method,
    headers: { Authorization: `Bearer ${cf.token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: { message?: string }[] };
  if (!res.ok || data.success === false) {
    const why = data.errors?.map((e) => e.message).filter(Boolean).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Cloudflare Workers KV: ${why}. The API token needs "Workers KV Storage: Edit" (docs/setup-delivery.md).`);
  }
  return data.result as T;
}

/** The delivery namespace's id, creating it the first time. */
export async function namespaceId(cf: Cloudflare, title = DELIVERY_NAMESPACE): Promise<string> {
  for (let page = 1; page <= 20; page++) {
    const list = await api<{ id: string; title: string }[]>(cf, "GET", `?per_page=100&page=${page}`);
    const found = list.find((n) => n.title === title);
    if (found) return found.id;
    if (list.length < 100) break;
  }
  return (await api<{ id: string }>(cf, "POST", "", { title })).id;
}

/** Writes the pairs into the namespace. */
export async function upload(cf: Cloudflare, id: string, pairs: KvPair[]): Promise<number> {
  const groups = batches(pairs);
  for (const group of groups) await api(cf, "PUT", `/${id}/bulk`, group);
  return groups.length;
}
