/**
 * F085: the app's light or dark look. It follows the computer's setting
 * until the owner picks one with the switch; that choice is remembered in
 * this browser. index.html runs the same rules (appThemeBootScript) before
 * the app loads, so the first paint is already in the right colours.
 */

export type AppTheme = "light" | "dark";

/** Where the choice is kept. Absent means "match the computer". */
export const THEME_KEY = "crust:app-theme";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Media = (query: string) => { matches: boolean };

function storage(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The remembered choice, or null when there is none (or it can't be read, or isn't valid). */
export function storedTheme(store: Store | null = storage()): AppTheme | null {
  try {
    const v = store?.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** The computer's setting. */
export function systemTheme(media: Media | undefined = typeof matchMedia === "function" ? matchMedia : undefined): AppTheme {
  try {
    return media?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** The look to show: the remembered choice wins, else the computer's. */
export function resolveTheme(stored: AppTheme | null, system: AppTheme): AppTheme {
  return stored ?? system;
}

/** Puts the look on the page: the data attribute the tokens hang on, and the colour scheme for native controls. */
export function applyTheme(theme: AppTheme, doc: Document = document): void {
  doc.documentElement.setAttribute("data-app-theme", theme);
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = "color-scheme";
    doc.head.appendChild(meta);
  }
  meta.content = theme;
  // Puck copies <html>'s attributes into the canvas once, when it opens; keep its in-canvas controls in step.
  for (const frame of Array.from(doc.querySelectorAll("iframe"))) {
    try {
      const inner = frame.contentDocument?.documentElement;
      if (inner?.hasAttribute("data-app-theme")) inner.setAttribute("data-app-theme", theme);
    } catch {
      // Another site's page: not ours to touch.
    }
  }
}

/**
 * The switch: shows the other look. Picking the look the computer already
 * has forgets the choice, so the app follows the computer again.
 */
export function toggleTheme(current: AppTheme, system: AppTheme = systemTheme(), store: Store | null = storage()): AppTheme {
  const next: AppTheme = current === "dark" ? "light" : "dark";
  try {
    if (next === system) store?.removeItem(THEME_KEY);
    else store?.setItem(THEME_KEY, next);
  } catch {
    // Private windows and blocked storage: the switch still works for this visit.
  }
  return next;
}

/** The look on the page right now. */
export function currentTheme(doc: Document = document): AppTheme {
  return doc.documentElement.getAttribute("data-app-theme") === "dark" ? "dark" : "light";
}

/**
 * The same rules as storedTheme/systemTheme/applyTheme, as a tiny script for
 * <head> in index.html (no imports, runs before anything paints).
 * app-theme.test.ts checks index.html carries exactly this.
 */
export const appThemeBootScript =
  `(function(){var t=null;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}` +
  `if(t!=="light"&&t!=="dark"){t="light";try{if(matchMedia("(prefers-color-scheme: dark)").matches)t="dark"}catch(e){}}` +
  `document.documentElement.setAttribute("data-app-theme",t);` +
  `var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=t})()`;

/** Fired on window whenever the look changes, so every switch on screen shows it. */
export const THEME_EVENT = "crust:app-theme";

/** Sets the look and tells the switches. */
export function setTheme(theme: AppTheme): void {
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/** While no choice is remembered, follow the computer when its setting changes. */
export function followSystemTheme(): () => void {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!storedTheme()) setTheme(query.matches ? "dark" : "light");
  };
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}
