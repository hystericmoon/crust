// @vitest-environment happy-dom
/** Audit A307: a preview picture that can't load becomes a tidy empty box, still named by its alt text. */
import { afterEach, describe, expect, it } from "vitest";
import { installBrokenPictureGuard, tidyBrokenPicture } from "./broken-pictures";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("pictures that can't load in a design preview", () => {
  it("swaps in a blank picture, keeping the alt text for screen readers", () => {
    document.body.innerHTML = '<img id="p" src="/media/gone.jpg" srcset="/media/gone-400.jpg 400w" alt="A computer on a desk in a dark room">';
    const stop = installBrokenPictureGuard(document);
    const img = document.getElementById("p") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    expect(img.getAttribute("alt")).toBe("A computer on a desk in a dark room");
    expect(img.src.startsWith("data:image/gif")).toBe(true);
    expect(img.hasAttribute("srcset")).toBe(false);
    expect(img.dataset.loadFailed).toBe("true");
    expect(img.style.minHeight).toBe("8rem");
    stop();
  });

  it("does it once, and stops listening when the editor closes", () => {
    document.body.innerHTML = '<img id="a" src="/x.jpg" alt="x"><img id="b" alt="y">';
    const a = document.getElementById("a") as HTMLImageElement;
    const b = document.getElementById("b") as HTMLImageElement;
    const stop = installBrokenPictureGuard(document);
    a.dispatchEvent(new Event("error"));
    const first = a.src;
    a.dispatchEvent(new Event("error"));
    expect(a.src).toBe(first);
    stop();
    b.dispatchEvent(new Event("error"));
    expect(b.dataset.loadFailed).toBeUndefined();
    tidyBrokenPicture(b);
    expect(b.dataset.loadFailed).toBe("true");
  });

  it("the start-up sweep leaves lazy pictures and SVGs alone, but tidies a real failure", () => {
    document.body.innerHTML = '<img id="lazy" loading="lazy" src="/a.jpg" alt="a"><img id="svg" src="/logo.svg" alt="b"><img id="bad" src="/gone.jpg" alt="c">';
    for (const id of ["lazy", "svg", "bad"]) {
      const img = document.getElementById(id) as HTMLImageElement;
      Object.defineProperty(img, "complete", { value: true });
      Object.defineProperty(img, "naturalWidth", { value: 0 });
      Object.defineProperty(img, "currentSrc", { value: img.getAttribute("src") });
    }
    const stop = installBrokenPictureGuard(document);
    expect(document.getElementById("lazy")!.dataset.loadFailed).toBeUndefined();
    expect(document.getElementById("svg")!.dataset.loadFailed).toBeUndefined();
    expect(document.getElementById("bad")!.dataset.loadFailed).toBe("true");
    stop();
  });
});
