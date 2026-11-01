/**
 * F060: after the welcome screen, the builder opens the "To replace" list
 * once, on arrival. Kept for this window only (sessionStorage).
 */
const OPEN_KEY = "crust:open-to-replace";

export function setOpenToReplace() {
  try {
    sessionStorage.setItem(OPEN_KEY, "1");
  } catch {
    // Without storage the list just starts closed.
  }
}

/** Whether the list should start open; doesn't use the request up. */
export function wantsOpenToReplace(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Uses the request up: true once, then false. */
export function takeOpenToReplace(): boolean {
  const wanted = wantsOpenToReplace();
  try {
    sessionStorage.removeItem(OPEN_KEY);
  } catch {
    // Nothing to clear.
  }
  return wanted;
}
