import { fontFaceCss } from "@crust/blocks";

/** F085, changed by F095 (owner, 2026-11-24: "I want a new character"): the app's own fonts, Instrument Sans and Geist Mono (SIL OFL 1.1), from the bundled site fonts at /fonts/. */
export const APP_FONTS = { heading: '"Instrument Sans", sans-serif', body: '"Geist Mono", monospace' };

/** Adds their @font-face rules once. */
export function installAppFonts(doc: Document = document): void {
  if (doc.querySelector("style[data-crust-app-fonts]")) return;
  const style = doc.createElement("style");
  style.dataset.crustAppFonts = "";
  style.textContent = fontFaceCss(APP_FONTS);
  doc.head.appendChild(style);
}
