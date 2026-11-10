/**
 * F060: the first time the app opens (design snapshot
 * design/f060-first-run-v1.html, direction A). There's no site yet: the
 * person picks a starter template or a blank page, names the site, and
 * lands in the builder with the "To replace" list open. Shown once: as soon
 * as the first site has its settings, the app opens straight into it.
 */
import { markNewSite } from "../page-first/store";
import type { LocalStore } from "../../server/local-store";
import { CHROME_KEY } from "../chrome-store";
import { TOKENS_KEY } from "../tokens-store";
import { newSiteFiles } from "../desktop/desktop";
import type { Invoke } from "../desktop/tauri-folder";
import { siteNameProblem, tidyName, type DeletedSite, type SiteSummary } from "../sites/sites";
import { applyOnGitHub, type ApplyStep } from "../templates/start";
import type { Template } from "../templates/sources";
import { setOpenToReplace } from "./arrival";

export { setOpenToReplace, takeOpenToReplace, wantsOpenToReplace } from "./arrival";

/** What the welcome screen needs from the app. */
export interface FirstRunContext {
  invoke: Invoke;
  /** The open (still empty) site's files. */
  store: LocalStore;
  /** The open site's folder name; changes when the site is named. */
  id: string;
  /** Where the site folder is, to say where sites are kept. */
  folder: string;
}

let current: FirstRunContext | null = null;

/** Set when the app starts on the welcome screen; null otherwise (and on the web). */
export const firstRunContext = (): FirstRunContext | null => current;

export function setFirstRunContext(context: FirstRunContext | null) {
  current = context;
}

/**
 * True only for a brand new Crust: the open site has no settings yet, it's
 * the only site, it has no pages, and nothing was ever deleted. (Deleting
 * every site also leaves one empty site; that one just starts blank, as
 * before.)
 */
export function isFirstRun(hasSettings: boolean, id: string, sites: SiteSummary[], deleted: DeletedSite[]): boolean {
  return !hasSettings && deleted.length === 0 && sites.length === 1 && sites[0]!.id === id && sites[0]!.pages === 0;
}

/** Asks the app whether this is the first run. If the app can't say, it isn't: the site starts blank, as before. */
export async function checkFirstRun(store: LocalStore, invoke: Invoke, id: string): Promise<boolean> {
  if (await store.readFile("content/site.json")) return false;
  try {
    const [sites, deleted] = await Promise.all([invoke("sites_list"), invoke("sites_deleted")]);
    return isFirstRun(false, id, sites as SiteSummary[], deleted as DeletedSite[]);
  } catch {
    return false;
  }
}

export const BLANK = "blank";
export const BLANK_NAME = "My site";

/** The order starters appear in; any others follow alphabetically. */
const ORDER = ["harbour", "signal", "corner"];
export const starterOrder = (a: string, b: string) => {
  const rank = (id: string) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
  return rank(a) - rank(b) || a.localeCompare(b);
};

/** The name the field suggests for a start: the template's own site name, or "My site". */
export const suggestedName = (template: Template | null) => template?.site.name || BLANK_NAME;

export type MakeStep = { kind: "site" } | { kind: "photos"; done: number; total: number } | { kind: "pages" };

/** The progress line under the button. */
export function stepText(step: MakeStep): string {
  if (step.kind === "site") return "Making your site…";
  if (step.kind === "photos") return `Adding photos (${step.done} of ${step.total})…`;
  return "Adding the template's pages…";
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Makes the first site: its settings and Home page under the chosen name
 * (the folder is renamed to match), then the template on top, through the
 * same steps as Start from a template. Resolves to null when it worked, or
 * what went wrong in plain words. Safe to run again after a failure.
 */
export async function makeFirstSite(
  context: FirstRunContext,
  name: string,
  template: Template | null,
  onStep: (step: MakeStep) => void = () => undefined,
): Promise<string | null> {
  const problem = siteNameProblem(name, []);
  if (problem) return problem;
  const tidy = tidyName(name);
  try {
    onStep({ kind: "site" });
    await context.store.commitFiles(newSiteFiles(tidy), "Start a new site");
    if (tidy !== context.id) context.id = (await context.invoke("sites_rename", { id: context.id, name: tidy })) as string;
  } catch (e) {
    return `Your site wasn't made: ${message(e)}`;
  }
  if (!template) return null;
  const failed = await applyOnGitHub(template, (step: ApplyStep, done = 0, total = 0) => {
    if (step === "photos") onStep({ kind: "photos", done, total });
    else if (step === "pages") onStep({ kind: "pages" });
  });
  // "Nothing was replaced" is about an existing site; here, the site is blank until it works.
  if (failed) return `${failed.replace(/^Nothing was replaced\. /, "")} Try again, or start blank.`;
  // The template's look is saved in the site's settings already. A working copy
  // kept in the window would also show in other sites made later (they share it).
  try {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(CHROME_KEY);
  } catch {
    // Nothing kept.
  }
  return null;
}

/** Into the builder on the Home page; the app starts again with the new site. */
export function landInBuilder(withTemplate: boolean) {
  if (withTemplate) setOpenToReplace();
  // F087: a new site opens with its Next steps.
  markNewSite();
  window.location.hash = "#/edit?path=%2F";
  window.location.reload();
}
