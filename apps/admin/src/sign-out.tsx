/** Cloudflare Access's own sign-out address (F040). */
export const SIGN_OUT_URL = "/cdn-cgi/access/logout";

/**
 * Signs out of Cloudflare Access. Nothing is lost: every edit is already
 * kept in this browser as you type.
 */
export function SignOutLink({ className = "crust-header-link" }: { className?: string }) {
  return (
    <a className={className} href={SIGN_OUT_URL}>
      Sign out
    </a>
  );
}
