// @vitest-environment happy-dom
// Audit A104: one word, "Photos", for the pictures a site owner uploads.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("audit A104: Photos everywhere in words", () => {
  it("the side rail and its panel say Photos, not Media", () => {
    const rail = read("apps/admin/src/app-frame/rail.tsx");
    expect(rail).toContain('label: "Photos", note: "Your photos"');
    expect(rail).toContain('<Panel title="Photos">');
    expect(rail).not.toContain('label: "Media"');
  });
  it("the image field buttons say Choose photo / Change photo", () => {
    const f = read("apps/admin/src/media/ImageField.tsx");
    expect(f).toContain('"Change photo" : "Choose photo"');
    expect(f).not.toMatch(/Choose image|Change image/);
  });
  it("messages say 'photo library', not 'Media library'", () => {
    expect(read("apps/admin/src/layouts/photos.tsx")).not.toMatch(/"[^"\n]*Media library|`[^`\n]*Media library/);
    expect(read("packages/blocks/src/placeholders.ts")).toContain("not in your photo library yet");
  });
});
