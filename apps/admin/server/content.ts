/** Server-side checks on content before it's committed (never trust the browser). */
// Deep imports keep React and Puck out of the server bundle.
import type { Page, Site } from "@crust/blocks/content";
import { validateTokens } from "@crust/blocks/tokens";

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
export const MAX_BYTES = 512 * 1024;

/** True for "/" and paths like "/about" or "/blog/first-post". */
export function isValidPagePath(path: unknown): path is string {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (path === "/") return true;
  const segments = path.slice(1).replace(/\/$/, "").split("/");
  return segments.length <= 4 && segments.every((s) => SEGMENT.test(s) && s.length <= 60);
}

/** "/" → content/pages/index.json, "/blog/first" → content/pages/blog__first.json */
export function pageFileFor(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return `content/pages/${clean === "" ? "index" : clean.split("/").join("__")}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function checkPage(page: unknown): string[] {
  if (!isObject(page)) return ["The page is missing."];
  const problems: string[] = [];
  if (!isValidPagePath(page.path)) problems.push("The page address must look like /about (lowercase letters, numbers and dashes).");
  if (typeof page.title !== "string" || !page.title.trim()) problems.push("The page needs a title.");
  else if (page.title.length > 120) problems.push("The page title is longer than 120 characters.");
  if (typeof page.description !== "string") problems.push("The page description is missing.");
  else if (page.description.length > 300) problems.push("The page description is longer than 300 characters.");
  const puck = page.puck;
  if (!isObject(puck) || !Array.isArray(puck.content) || !isObject(puck.root)) problems.push("The page's blocks are missing or damaged.");
  return problems;
}

export function checkSite(site: unknown): string[] {
  if (!isObject(site)) return ["The site settings are missing."];
  const problems: string[] = [];
  if (typeof site.name !== "string" || !site.name.trim()) problems.push("The site needs a name.");
  if (typeof site.baseUrl !== "string" || !/^https?:\/\/[^\s/]+/.test(site.baseUrl)) problems.push("The site address must look like https://example.com.");
  if (typeof site.language !== "string" || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(site.language)) problems.push("The site language must be a code like en or id.");
  if (!isObject(site.tokens)) problems.push("The design tokens are missing.");
  else {
    try {
      problems.push(...validateTokens(site.tokens as unknown as Site["tokens"]).map((p) => p.message));
    } catch {
      problems.push("The design tokens are damaged.");
    }
  }
  return problems;
}

/** The file text we commit: stable formatting, trailing newline. */
export const serialize = (value: Page | Site) => `${JSON.stringify(value, null, 2)}\n`;
