import { config, tokensToCss, type Page, type Site } from "@crust/blocks";
import { Puck, type Data } from "@puckeditor/core";
import { useEffect, useState } from "react";
import siteJson from "../../../content/site.json";
import samplePage from "../../../content/pages/index.json";

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

export function App() {
  useTokenStyles(tokensToCss(site.tokens));
  const [status, setStatus] = useState<string>("");

  return (
    <>
      <Puck
        config={config}
        data={loadDraft()}
        viewports={viewports}
        headerTitle={site.name}
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
