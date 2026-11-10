import { useEffect, useState } from "react";
import { currentTheme, setTheme, THEME_EVENT, toggleTheme, type AppTheme } from "./theme";

/**
 * F085: the sun/moon switch in each top bar. Pressed means the dark look.
 * Picking the look the computer already has goes back to following it.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setLocal] = useState<AppTheme>(() => currentTheme());
  useEffect(() => {
    const onChange = (e: Event) => setLocal((e as CustomEvent<AppTheme>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className={`app-theme-toggle ${className}`.trim()}
      aria-label="Light or dark"
      aria-pressed={dark}
      title={dark ? "Dark look (press for light)" : "Light look (press for dark)"}
      onClick={() => setTheme(toggleTheme(theme))}
    >
      {dark ? (
        // Moon: the dark look is on.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      ) : (
        // Sun: the light look is on.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
