// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { roleForElement } from "./pick";

const dom = (html: string) => {
  document.body.innerHTML = html;
  return (sel: string) => roleForElement(document.querySelector(sel)!);
};

describe("settings preview: which colour did I click?", () => {
  it("maps page parts to their colour roles", () => {
    const pick = dom(`
      <main>
        <section class="cr-section cr-bg-surface" id="s1"><div class="cr-container" id="c1">
          <h1 id="h">Title</h1>
          <div class="cr-text cr-tone-muted"><p id="muted">Sub</p></div>
          <div class="cr-text"><p id="p">Body</p></div>
          <div class="cr-button-row"><a class="cr-button cr-button-primary" id="btn">Go</a></div>
        </div></section>
        <section class="cr-section cr-bg-primary" id="s2">
          <h2 id="h2">On primary</h2>
          <div class="cr-button-row"><a class="cr-button cr-button-primary" id="btn2"><span id="label">Go</span></a></div>
        </section>
        <section class="cr-section cr-bg-background" id="s3">
          <article class="cr-card cr-bg-surface" id="card"><div class="cr-card-body"><a class="cr-card-link" id="link">More</a></div></article>
        </section>
      </main>`);
    expect(pick("#s1")).toBe("surface");
    expect(pick("#c1")).toBe("surface");
    expect(pick("#h")).toBe("text");
    expect(pick("#muted")).toBe("muted");
    expect(pick("#p")).toBe("text");
    expect(pick("#btn")).toBe("primary");
    expect(pick("#s2")).toBe("primary");
    expect(pick("#h2")).toBe("onPrimary");
    expect(pick("#label")).toBe("onPrimary");
    expect(pick("#s3")).toBe("background");
    expect(pick("#card")).toBe("surface");
    expect(pick("#link")).toBe("primary");
    expect(pick("main")).toBe("background");
  });
});
