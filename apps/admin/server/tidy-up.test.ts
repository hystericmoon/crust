import { describe, expect, it } from "vitest";
import { redirectsAfterDelete, redirectsAfterRestore } from "./content";

describe("tidy-up: redirects come back when a page is restored (F040)", () => {
  const pages = (...paths: string[]) => new Set(paths);

  it("restores what the deletion removed", () => {
    const before = [
      { from: "/about-us", to: "/about" },
      { from: "/old", to: "/contact" },
    ];
    const afterDelete = redirectsAfterDelete(before, "/about");
    expect(afterDelete).toEqual([{ from: "/old", to: "/contact" }]);
    expect(redirectsAfterRestore(afterDelete, before, "/about", pages("/", "/contact"))).toEqual(before);
  });

  it("skips old addresses that are pages again or now redirect elsewhere", () => {
    const before = [
      { from: "/a", to: "/about" },
      { from: "/b", to: "/about" },
      { from: "/c", to: "/about" },
    ];
    const current = [{ from: "/b", to: "/contact" }];
    expect(redirectsAfterRestore(current, before, "/about", pages("/a"))).toEqual([
      { from: "/b", to: "/contact" },
      { from: "/c", to: "/about" },
    ]);
  });

  it("never redirects away from the restored page", () => {
    const current = [{ from: "/about", to: "/team" }];
    expect(redirectsAfterRestore(current, [], "/about", pages())).toEqual([]);
  });

  it("does nothing when no redirect pointed to the page", () => {
    const current = [{ from: "/old", to: "/contact" }];
    expect(redirectsAfterRestore(current, current, "/about", pages())).toEqual(current);
  });
});
