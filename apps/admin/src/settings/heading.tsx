/**
 * F093: the settings groups are used on the Site settings screen and inside
 * the builder's Site settings sheet, one level deeper there. A group's
 * headings say their level on the screen (3, 4); the sheet shifts them by one
 * so the order never skips or repeats a level.
 */
import { createContext, useContext, type HTMLAttributes } from "react";

export const HeadingShift = createContext(0);

export function H({ level, ...rest }: { level: 3 | 4 } & HTMLAttributes<HTMLHeadingElement>) {
  const shifted = Math.min(level + useContext(HeadingShift), 6);
  const Tag = `h${shifted}` as "h3";
  return <Tag {...rest} />;
}
