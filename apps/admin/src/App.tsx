import { config, tokensToCss, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { Puck, type Data } from "@puckeditor/core";
import { useEffect, useMemo, useState } from "react";
import siteJson from "../../../content/site.json";
import samplePage from "../../../content/pages/index.json";
import { SiteSettings } from "./settings/SiteSettings";
import { loadSavedTokens, saveTokens } from "./tokens-store";

const site = siteJson as Site;
const DRAFT_KEY = "crust:draft:index";

/** Responsive canvas widths for the viewport switcher. */
const viewports = [
  { width: 1280, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
  { width: 768, height: "auto" as const, label: "Tablet", icon: "Tablet" as const },
  { width: 375, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
];

function loadDraft(): Data {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {
    // Storage unavailable or corrupt draft: fall back to the saved page.
  }
  return (samplePage as Page).puck;
}

/** Puts the site's design tokens on the page so the canvas uses them. */
function useTokenStyles(css: string) {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.crustTokens = "";
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [css]);
}

type Route = "builder" | "settings";
const routeFromHash = (): Route => (location.hash.startsWith("#/settings") ? "settings" : "builder");

function useRoute(): Route {
  const [route, setRoute] = useState(routeFromHash);
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function App() {
  const route = useRoute();
  const [saved, setSaved] = useState<SiteTokens>(() => loadSavedTokens(site.tokens));
  const [draft, setDraft] = useState<SiteTokens>(saved);
  const [status, setStatus] = useState<string>("");
  // The builder shows unsaved token edits too, so switching screens loses nothing.
  useTokenStyles(useMemo(() => tokensToCss(draft), [draft]));

  useEffect(() => {
    document.title = route === "settings" ? "Site settings · Crust" : "Crust builder";
  }, [route]);

  if (route === "settings") {
    return (
      <SiteSettings
        site={site}
        page={{ ...(samplePage as Page), puck: loadDraft() }}
        saved={saved}
        draft={draft}
        onChange={setDraft}
        onSave={(tokens) => {
          if (!saveTokens(tokens)) return false;
          setSaved(tokens);
          return true;
        }}
        onDiscard={() => setDraft(saved)}
      />
    );
  }

  return (
    <>
      <Puck
        config={config}
        data={loadDraft()}
        viewports={viewports}
        headerTitle={site.name}
        overrides={{
          headerActions: ({ children }) => (
            <>
              <a className="crust-header-link" href="#/settings">
                Site settings
              </a>
              {children}
            </>
          ),
        }}
        onPublish={(data) => {
          try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
            setStatus("Draft saved in this browser. Saving to GitHub comes in a later step.");
          } catch {
            setStatus("Couldn't save the draft in this browser.");
          }
        }}
      />
      <div role="status" aria-live="polite" className="crust-status">
        {status}
      </div>
    </>
  );
}
