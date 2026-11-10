// @vitest-environment happy-dom
/**
 * F093: one word per idea, and the builder's accessibility structure.
 * The glossary (before and after) is in DECISIONS.md under F093.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppTopBar, setAppFrame } from "./app-frame/AppTopBar";
import { dragName } from "./keyboard/KeyboardEditing";
import { spokenDrag } from "./keyboard/drag-status";
import { scrollToClear } from "./keyboard/focus-clear";
import { fixPuckChrome, LANDMARKS } from "./keyboard/puck-chrome";
import { SiteAddressGroup } from "./settings/SiteAddress";
import { HeadingShift } from "./settings/heading";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function sources(dir = "apps/admin/src"): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
/** Code without its comments (what the owner can read is in strings and JSX text). */
const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;,({])\/\/.*$/gm, "$1");

describe("words: one word per idea", () => {
  // before → after, from the DECISIONS.md glossary
  const retired: [RegExp, string][] = [
    [/\bGitHub\b/, "GitHub (say: saved, or your site)"],
    [/\brepositor(y|ies)\b/i, "repository (say: your site)"],
    [/\b(saved|safe) in this browser\b/i, "saved/safe in this browser (say: kept in this browser)"],
    [/\bsaved to this browser\b/i, "saved to this browser (say: kept in this browser)"],
  ];
  it("no screen text uses a retired word", () => {
    const found: string[] = [];
    for (const file of sources()) {
      const code = withoutComments(readFileSync(file, "utf8"));
      for (const [pattern, name] of retired) if (pattern.test(code)) found.push(`${file}: ${name}`);
    }
    expect(found).toEqual([]);
  });

  it("never uses the retired aria-grabbed (drag status is spoken instead)", () => {
    const found = sources().filter((f) => /aria-grabbed/.test(withoutComments(readFileSync(f, "utf8"))) && !/(puck-chrome\.ts|KeyboardEditing\.tsx)$/.test(f));
    expect(found).toEqual([]);
  });
});

describe("accessibility: landmarks, h1 and panel names", () => {
  it("the top bar carries the screen's one h1 and the builder names it", () => {
    setAppFrame({ siteName: "Harbour Studio", desktop: false, pending: null });
    render(<AppTopBar heading="Editing Home" />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Editing Home"]);
  });

  it("gives Puck's canvas a main landmark and its side panels and tool bar names", () => {
    document.body.innerHTML = `
      <div><nav class="_Nav_x_1"></nav>
      <div class="_Sidebar_x_1 _Sidebar--left_x_2"></div>
      <div class="_PuckCanvas_x_1 _PuckCanvas--ready_x_2"><div class="_PuckCanvas-inner_x_3"></div></div>
      <div class="_Sidebar_x_1 _Sidebar--right_x_2"></div>
      <div id="item" aria-grabbed="false"></div></div>`;
    fixPuckChrome(document);
    for (const { selector, role, label } of LANDMARKS) {
      const el = document.querySelector(selector)!;
      expect(el.getAttribute("role"), selector).toBe(role);
      expect(el.getAttribute("aria-label"), selector).toBe(label);
    }
    expect(document.querySelectorAll("[role=main]")).toHaveLength(1);
    expect(document.querySelector("nav")!.getAttribute("aria-label")).toBe("Builder tools");
    expect(document.querySelector("[aria-grabbed]")).toBeNull();
  });

  it("settings groups step down one heading level inside the Site settings sheet", () => {
    const group = <SiteAddressGroup value="https://example.com" onChange={() => undefined} onValidity={() => undefined} />;
    const { container, rerender } = render(group);
    expect(container.querySelectorAll("h3").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("h4")).toHaveLength(0);
    rerender(<HeadingShift.Provider value={1}>{group}</HeadingShift.Provider>);
    expect(container.querySelectorAll("h3")).toHaveLength(0);
    expect(container.querySelectorAll("h4").length).toBeGreaterThan(0);
  });
});

describe("accessibility: spoken drag status", () => {
  const names: Record<string, string> = { "Hero-1": "Hero", "Columns-2": "Columns", "root:default-zone": "the page" };
  const nameOf = (id: string) => names[id] ?? id;
  it("says what was picked up, where it is, and where it landed, in plain words", () => {
    expect(spokenDrag("Picked up draggable item Hero-1.", nameOf)).toBe("Picked up Hero. Use the arrow keys to move it, Space to drop it, Escape to cancel.");
    expect(spokenDrag("Draggable item Hero-1 was moved over droppable target Columns-2.", nameOf)).toBe("Hero is over Columns.");
    expect(spokenDrag("Draggable item Hero-1 is no longer over a droppable target.", nameOf)).toBe("Hero is not over a place it can go.");
    expect(spokenDrag("Draggable item Hero-1 was dropped over droppable target root:default-zone", nameOf)).toBe("Dropped Hero in the page.");
    expect(spokenDrag("Dragging was cancelled. Draggable item Hero-1 was dropped.", nameOf)).toBe("Cancelled. Hero stays where it was.");
    expect(spokenDrag("Something else", nameOf)).toBeNull();
  });
  it("names blocks and places from Puck's ids", () => {
    const hero = { type: "Hero", props: { id: "Hero-1" } };
    const puck = {
      config: { components: { Hero: { label: "Hero" } } },
      getItemById: (id: string) => (id === "Hero-1" ? hero : undefined),
    };
    expect(dragName(puck as never, "Hero-1")).toBe("Hero");
    expect(dragName(puck as never, "root:default-zone")).toBe("the page");
  });
});

describe("accessibility: focus never hidden under a floating bar", () => {
  const box = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 100 });
  it("does nothing when no bar covers the focused thing", () => {
    expect(scrollToClear(box(200, 240), [box(0, 50)], 800)).toBe(0);
  });
  it("scrolls up so a thing under a bar above it comes out below it", () => {
    expect(scrollToClear(box(40, 80), [box(20, 60)], 800)).toBeLessThan(0);
  });
  it("scrolls down so a thing under a bar below it comes out above it", () => {
    expect(scrollToClear(box(700, 740), [box(720, 800)], 800)).toBeGreaterThan(0);
  });
});
