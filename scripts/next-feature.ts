/**
 * `npm run next`: what a new session needs from features.json and
 * HANDOVER.md, without reading them whole (owner, 2026-11-03, option B of
 * https://claude.ai/artifact/XYA5nqaqQCfjb9oM6VuMq9). Prints the next
 * feature (first with passes false whose depends_on all pass), its
 * done_check, the model the owner planned for it, BLOCKED.md mentions, and
 * the features waiting for the owner's review.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Feature {
  id: string;
  title: string;
  description?: string;
  depends_on?: string[];
  done_check?: string;
  passes: boolean;
  needs_review?: boolean;
  reviewed?: boolean;
}

/** The first unbuilt feature whose dependencies all pass, or null. */
export function nextFeature(features: Feature[]): Feature | null {
  const passes = new Set(features.filter((f) => f.passes).map((f) => f.id));
  return features.find((f) => !f.passes && (f.depends_on ?? []).every((d) => passes.has(d))) ?? null;
}

/** Built features the owner still has to try and mark reviewed. */
export function awaitingReview(features: Feature[]): string[] {
  return features.filter((f) => f.passes && f.needs_review && !f.reviewed).map((f) => f.id);
}

/** The model from HANDOVER.md's "Model plan" table row for a feature, or null. */
export function plannedModel(handover: string, id: string): string | null {
  const row = handover.split("\n").find((l) => l.startsWith("|") && l.includes(`${id} `));
  const cells = row?.split("|").map((c) => c.trim()).filter(Boolean);
  return cells && cells.length >= 2 ? cells[1]! : null;
}

/** BLOCKED.md rows that name the feature. */
export function blockedNotes(blocked: string, id: string): string[] {
  return blocked.split("\n").filter((l) => l.startsWith("|") && l.includes(id));
}

export function summary(features: Feature[], handover: string, blocked: string): string {
  const next = nextFeature(features);
  const review = awaitingReview(features);
  const lines: string[] = [];
  if (!next) lines.push("Next: nothing unbuilt has all its dependencies passing. Ask the owner what's next.");
  else {
    lines.push(`Next: ${next.id} ${next.title}`);
    lines.push(`  model:      ${plannedModel(handover, next.id) ?? "not in the model plan: ask the owner"}`);
    lines.push(`  done_check: ${next.done_check ?? "(none)"}`);
    lines.push(`  depends_on: ${(next.depends_on ?? []).join(", ") || "nothing"}`);
    lines.push(`  needs_review: ${next.needs_review ? "yes (design snapshot first if visual)" : "no"}`);
    if (next.description) lines.push(`  ${next.description}`);
    for (const b of blockedNotes(blocked, next.id)) lines.push(`  BLOCKED.md: ${b.replace(/\s+/g, " ").slice(0, 300)}`);
  }
  const left = features.filter((f) => !f.passes).map((f) => f.id);
  lines.push(`Unbuilt: ${left.length ? left.join(", ") : "none"}`);
  lines.push(`Waiting for the owner's review: ${review.length}${review.length ? ` (${review.join(", ")})` : ""}`);
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const { features } = JSON.parse(read("features.json")) as { features: Feature[] };
  console.log(summary(features, read("HANDOVER.md"), read("BLOCKED.md")));
}
