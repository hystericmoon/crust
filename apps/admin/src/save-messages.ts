/** What the owner is told after a save (moved out of App.tsx for F082's design editor). */
import type { ApiResult } from "./api-client";
import { desktopContent } from "./desktop/content";

/** F069: GitHub refused or couldn't be reached (not "isn't switched on yet", which is expected). */
export const saveFailed = (result: ApiResult<unknown>) => !result.ok && !result.notConfigured;

/** What to tell the owner after a save: GitHub first, the browser copy as the safety net. */
export function saveMessage(result: ApiResult<unknown>, savedLocally: boolean, what: string): string {
  // F055: in the desktop app, saving means the site folder on the computer.
  if (desktopContent()) return result.ok ? `${what} saved. Visitors see it after you publish.` : `${what} not saved: ${result.error}`;
  if (result.ok) return `${what} saved to GitHub. Visitors see it after you publish.`;
  const local = savedLocally ? " A copy is safe in this browser." : "";
  if (result.notConfigured) return `${what} saved in this browser. Saving to GitHub isn't switched on yet.`;
  return `${what} not saved to GitHub: ${result.error}${local}`;
}
