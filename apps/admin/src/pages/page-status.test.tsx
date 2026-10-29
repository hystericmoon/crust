// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { pageStatus } from "./list-view";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(cleanup);

const row = (over: Partial<PageRow>): PageRow => ({ path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true, ...over });

describe("page-status: one status per page", () => {
  it("names where the latest version is, most urgent first", () => {
    expect(pageStatus(row({ inRepo: false, localChanges: true }), true, true).label).toBe("Only in this browser");
    expect(pageStatus(row({ localChanges: true, unpublished: "edited" }), true, true).label).toBe("Changes not saved");
    expect(pageStatus(row({ unpublished: "new" }), true, true).label).toBe("Saved, not live yet");
    expect(pageStatus(row({ unpublished: "edited" }), true, true).label).toBe("Edits not live yet");
    expect(pageStatus(row({}), true, true).label).toBe("Live");
    // Without knowing what the last publish held, don't claim "Live".
    expect(pageStatus(row({}), true, false).label).toBe("Saved");
  });

  it("before GitHub is switched on, says what it can", () => {
    expect(pageStatus(row({}), false, false).label).toBe("Built into the app");
    expect(pageStatus(row({ localChanges: true }), false, false).label).toBe("Only in this browser");
  });

  it("shows it in its own column, with the old badges gone", () => {
    render(
      <PageList
        siteName="Demo"
        rows={[row({ path: "/", title: "Home" }), row({ localChanges: true, unpublished: "edited" })]}
        sourceNote=""
        githubOn
        liveKnown
        onCreate={() => {}}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(0, 2)).toEqual(["Title", "Status"]);
    const [, home, about] = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(home!).getAllByRole("cell")[0]!.textContent).toBe("Live");
    expect(within(about!).getAllByRole("cell")[0]!.textContent).toBe("Changes not saved");
    expect(about!.textContent).not.toContain("Edits not live yet");
  });
});
