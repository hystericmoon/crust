/**
 * Finding an address on the map for the Map block (F079): OpenStreetMap's
 * free search (Nominatim). It's asked only when the owner presses "Find on
 * the map" in the builder, never by the published site. Its rules allow
 * occasional searches like this from a browser (one at a time, no bulk).
 */
import { cleanPin, type MapPin } from "@crust/blocks";

export const GEOCODER = "https://nominatim.openstreetmap.org/search";

export type Found = { pin: MapPin; label: string };

/** The first place OpenStreetMap finds for an address, or null when it finds none. Throws when the search can't be reached. */
export async function findAddress(address: string, fetcher: typeof fetch = fetch): Promise<Found | null> {
  const q = address.replace(/\s+/g, " ").trim();
  if (!q) return null;
  const res = await fetcher(`${GEOCODER}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`The map search answered ${res.status}.`);
  const list: unknown = await res.json();
  const first = Array.isArray(list) ? (list[0] as { lat?: unknown; lon?: unknown; display_name?: unknown } | undefined) : undefined;
  const pin = first ? cleanPin({ lat: Number(first.lat), lng: Number(first.lon) }) : null;
  return pin ? { pin, label: typeof first?.display_name === "string" ? first.display_name : `${pin.lat}, ${pin.lng}` } : null;
}
