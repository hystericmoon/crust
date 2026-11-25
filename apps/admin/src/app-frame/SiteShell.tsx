/** F100: the screen with the site menu beside it (sidebar, editor rail or phone bottom bar). */
import { useEffect, type ReactNode } from "react";
import { desktopContent } from "../desktop/content";
import { AllSitesNav, focusScreenHeading, navMode, SiteNav, takeFocusHeading, useHash } from "./SiteNav";

export function SiteShell({ children }: { children: ReactNode }) {
  const hash = useHash();
  const mode = navMode(hash, desktopContent() !== null);
  // After using the menu, focus goes to the new screen's heading (it may load a moment later).
  useEffect(() => {
    if (!takeFocusHeading()) return;
    let tries = 0;
    const id = window.setInterval(() => {
      if (focusScreenHeading() || ++tries > 20) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [hash]);
  if (!mode) return <>{children}</>;
  return (
    <div className={`sn-shell sn-shell-${mode}`}>
      {mode === "all" ? <AllSitesNav /> : <SiteNav mode={mode} />}
      <div className="sn-main">{children}</div>
    </div>
  );
}
