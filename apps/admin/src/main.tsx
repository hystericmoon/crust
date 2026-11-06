import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// F085: without Puck's Inter download (the app uses the bundled Geist; the desktop app works offline).
import "@puckeditor/core/no-external.css";
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
import "./updates/updates.css";
// F085: the app's colour and font tokens, last so they win over Puck's.
import "./app-theme/app-theme.css";
import { applyTheme, followSystemTheme, resolveTheme, storedTheme, systemTheme } from "./app-theme/theme";
import { installAppFonts } from "./app-theme/fonts";
import { isDesktop, launchDesktop } from "./desktop/desktop";
import type { FirstRunContext } from "./first-run/first-run";

// F085: index.html has already set the look; this keeps it right if that script didn't run, and follows the computer.
applyTheme(resolveTheme(storedTheme(), systemTheme()));
followSystemTheme();
installAppFonts();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

/**
 * F055: in the desktop app, the site folder is opened first; the builder
 * (App) is loaded after that, so it starts from that site, not the one
 * built into the web admin.
 */
async function start(el: HTMLElement) {
  let firstRun: FirstRunContext | null = null;
  if (isDesktop()) {
    try {
      const launched = await launchDesktop();
      // F060: a brand new Crust starts on the welcome screen.
      if ("firstRun" in launched) firstRun = launched.firstRun;
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
  if (firstRun) {
    const { FirstRun } = await import("./first-run/FirstRun");
    createRoot(el).render(
      <StrictMode>
        <FirstRun context={firstRun} />
      </StrictMode>,
    );
    return;
  }
  const { App } = await import("./App");
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start(root);
