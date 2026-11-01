import { desktopContent } from "./desktop/content";

/** Cloudflare Access's own sign-out address (F040). */
export const SIGN_OUT_URL = "/cdn-cgi/access/logout";

/**
 * Signs out of Cloudflare Access. Nothing is lost: every edit is already
 * kept in this browser as you type.
 */
export function SignOutLink({ className = "crust-header-link" }: { className?: string }) {
  // F055: the desktop app is the person's own; there's no account to leave.
  if (desktopContent()) return null;
  // F069: placed last in each bar, after a divider, so a slip aimed at
  // Save draft or New page doesn't sign the owner out.
  return (
    <>
      <span className="crust-signout-divider" aria-hidden="true" />
      <a className={`${className} crust-signout`} href={SIGN_OUT_URL}>
        Sign out
      </a>
    </>
  );
}
