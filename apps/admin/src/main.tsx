import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@puckeditor/core/puck.css";
import "@crust/blocks/styles.css";
import "./settings/settings.css";
import "./settings/chrome-groups.css";
import "./settings/theme-pack.css";
import "./settings/site-address.css";
import "./settings/template-group.css";
import "./keyboard/keyboard.css";
import "./sections/sections.css";
import "./layouts/layouts.css";
import "./placeholders/placeholders.css";
import "./responsive/responsive.css";
import "./tabs/tabs.css";
import "./items/items.css";
import "./media/media.css";
import "./posts/posts.css";
import "./seo/seo.css";
import "./quick/quick.css";
import "./chrome-canvas.css";
import "./pages/pages.css";
import { isDesktop, startDesktop } from "./desktop/desktop";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

/**
 * F055: in the desktop app, the site folder is opened first; the builder
 * (App) is loaded after that, so it starts from that site, not the one
 * built into the web admin.
 */
async function start(el: HTMLElement) {
  if (isDesktop()) {
    try {
      await startDesktop();
    } catch (e) {
      el.innerHTML = "";
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.className = "crust-start-failed";
      message.textContent = `Crust couldn't open your site folder: ${e instanceof Error ? e.message : String(e)}`;
      el.append(message);
      return;
    }
  }
  const { App } = await import("./App");
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start(root);
