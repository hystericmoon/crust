/** `npm run next`: the next feature, its planned model and the review queue. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { awaitingReview, blockedNotes, nextFeature, plannedModel, summary, type Feature } from "./next-feature";

const f = (id: string, extra: Partial<Feature> = {}): Feature => ({ id, title: `Title ${id}`, passes: false, ...extra });

describe("npm run next", () => {
  it("picks the first unbuilt feature whose dependencies all pass", () => {
    const list = [f("F1", { passes: true }), f("F2", { depends_on: ["F3"] }), f("F3", { depends_on: ["F1"] }), f("F4")];
    expect(nextFeature(list)!.id).toBe("F3");
    expect(nextFeature([f("F1", { passes: true })])).toBeNull();
  });

  it("lists built features still waiting for the owner's review", () => {
    expect(awaitingReview([f("F1", { passes: true, needs_review: true }), f("F2", { passes: true, needs_review: true, reviewed: true }), f("F3", { needs_review: true }), f("F4", { passes: true })])).toEqual(["F1"]);
  });

  it("reads the planned model from the handover's table", () => {
    const handover = "| Next feature | Model | Why |\n|---|---|---|\n| F067 Delivery | Opus | Security |\n| F065 Versions | Sonnet | Data |";
    expect(plannedModel(handover, "F067")).toBe("Opus");
    expect(plannedModel(handover, "F065")).toBe("Sonnet");
    expect(plannedModel(handover, "F099")).toBeNull();
  });

  it("quotes BLOCKED.md rows that name the feature", () => {
    expect(blockedNotes("| 2026 | F066 Checkout | Open the account |\n| 2026 | F037 | x |", "F066")).toHaveLength(1);
  });

  it("works on the real files", () => {
    const root = join(__dirname, "..");
    const { features } = JSON.parse(readFileSync(join(root, "features.json"), "utf8")) as { features: Feature[] };
    const text = summary(features, readFileSync(join(root, "HANDOVER.md"), "utf8"), readFileSync(join(root, "BLOCKED.md"), "utf8"));
    expect(text).toMatch(/^Next: /);
    expect(text).toContain("Waiting for the owner's review:");
  });
});
