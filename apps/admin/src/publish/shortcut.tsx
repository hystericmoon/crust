/** F024: a "Publish" link in the builder and Site settings top bars. */
import { useEffect, useState } from "react";
import { getChanges } from "../api-client";
import { localDrafts } from "../pages/store";
import { describeChanges, withoutDraftPages } from "./changes";

/** Where the link goes: the page list, with focus on the Publish panel. */
export const PUBLISH_HREF = "#/?focus=publish";

/** Changes waiting to go live, browser drafts included; null while unknown or before the first publish. */
export function usePendingCount(githubOn: boolean | null, refreshKey?: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!githubOn) return;
    let live = true;
    void getChanges().then((res) => {
      if (!live || !res.ok || !res.lastPublish) return;
      const drafts = localDrafts()
        .filter((d) => !d.savedToGitHub)
        .map((d) => d.page.path);
      setCount(describeChanges(withoutDraftPages(res, drafts), new Map()).items.length + drafts.length);
    });
    return () => {
      live = false;
    };
  }, [githubOn, refreshKey]);
  return count;
}

export function PublishShortcut({ count, className }: { count: number | null; className: string }) {
  return (
    <a className={className} href={PUBLISH_HREF}>
      Publish
      {count ? (
        <>
          {/* A no-break space: inside a flex button a leading normal space disappears. */}
          <span aria-hidden="true">{"\u00a0"}({count})</span>
          <span className="pg-sr">, {count === 1 ? "1 change" : `${count} changes`} waiting</span>
        </>
      ) : null}
    </a>
  );
}
