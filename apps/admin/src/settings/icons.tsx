/** Small stroke icons for Site settings (24px grid, 2px stroke). Decorative: always aria-hidden. */
type IconName = "check" | "cross" | "alert" | "back";

const paths: Record<IconName, string> = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  cross: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  alert: "M12 7.5v6M12 17v.01M10.3 3.8L2.6 17.2A2 2 0 004.3 20h15.4a2 2 0 001.7-2.8L13.7 3.8a2 2 0 00-3.4 0z",
  back: "M19 12H5M11 6l-6 6 6 6",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="st-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
