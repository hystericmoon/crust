/** F086: stroke icons for the top bar and the left icon bar (24px grid). Decorative: always aria-hidden. */
const paths = {
  down: "M6 9l6 6 6-6",
  desktop: "M4 5h16v11H4zM8 20h8M12 16v4",
  tablet: "M6 3h12v18H6zM11 18h2",
  phone: "M8 3h8v18H8zM11 18h2",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3",
  redo: "M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3",
  add: "M12 5v14M5 12h14",
  panel: "M3 4h18v16H3zM15 4v16",
  sliders: "M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  pages: "M14 3H6v18h12V7l-4-4zM14 3v4h4",
  brush: "M18 3l-9 9 3 3 9-9-3-3zM9 12c-3 0-4 2-4 4s-1 3-2 3c2 2 8 2 9-4",
  media: "M3 4h18v16H3zM21 16l-5-5-9 9M9 8a2 2 0 100 4 2 2 0 000-4z",
  blog: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h4",
  site: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  help: "M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9a2.5 2.5 0 113.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
} as const;

export type FrameIconName = keyof typeof paths;

export function FrameIcon({ name, size = 16 }: { name: FrameIconName; size?: number }) {
  return (
    <svg className="af-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
