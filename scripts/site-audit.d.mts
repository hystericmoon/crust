export type Size = "desktop" | "tablet" | "phone";
export const widths: Record<Size, number>;
export const MIN_PERFORMANCE: number;
export interface AxeIssue {
  id: string;
  help: string;
  impact: string;
  targets: string[];
}
export interface AxeResult {
  path: string;
  size: Size;
  serious: AxeIssue[];
  minor: number;
}
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  slow: string[];
}
export function sitePages(siteDir: string): Promise<string[]>;
export function axeSite(siteDir: string, sizes?: Size[]): Promise<AxeResult[]>;
export function lighthouseHome(siteDir: string): Promise<LighthouseScores>;
