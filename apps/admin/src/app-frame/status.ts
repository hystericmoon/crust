/** F086: the one status line in the top bar ("Saved · 3 changes not live"). */
import type { SavePhase } from "./autosave";

/** What the top bar says. `pending` is the number of changes not live yet; null when unknown. */
export function statusText(phase: SavePhase | null, pending: number | null): string {
  if (phase === "saving") return "Saving…";
  if (phase === "failed") return "Not saved";
  if (phase === "held") return "Kept in this browser";
  if (phase === "local") return "Kept in this browser";
  const live = pending === null ? "" : pending === 0 ? "all live" : pending === 1 ? "1 change not live" : `${pending} changes not live`;
  // Screens that don't edit anything only say what's live.
  if (phase === null) return live ? live[0]!.toUpperCase() + live.slice(1) : "";
  return live ? `Saved · ${live}` : "Saved";
}

/** The dot's colour: something to act on (warn), a problem (danger), or all good. */
export function statusTone(phase: SavePhase | null, pending: number | null): "ok" | "warn" | "danger" | "busy" {
  if (phase === "failed") return "danger";
  if (phase === "saving") return "busy";
  if (phase === "held" || phase === "local") return "warn";
  return pending ? "warn" : "ok";
}
