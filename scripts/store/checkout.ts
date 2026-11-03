/**
 * F066: checkout. A priced template's "Get" button is a plain link to the
 * payment company's own hosted checkout (a merchant of record: they sell on
 * our behalf, add sales tax or VAT and pay out). No script, no server, so the
 * store stays a static site that works without JavaScript.
 * Snapshot: design/f066-checkout-v1.html (A: Polar; A: a test note under the
 * button).
 *
 * store/list.json may carry
 *   "checkout": { "provider": "polar" | "lemonsqueezy", "mode": "test" | "live" }
 * With it, every buy link must be that company's checkout link for that mode
 * (a sandbox link can't slip into a live store, or the other way round), the
 * link gets the template's id for the "order paid" message (F067), and test
 * mode puts a note under each button. Real payments also need the owner's
 * switch on the Publish store workflow (`checkoutGate`).
 *
 * Nothing here touches the disk.
 */

export type CheckoutProvider = "polar" | "lemonsqueezy";
export type CheckoutMode = "test" | "live";

export interface Checkout {
  provider: CheckoutProvider;
  mode: CheckoutMode;
}

interface ProviderFacts {
  /** The company's name as buyers see it. */
  name: string;
  /** Plain-words shape of a checkout link, for problems. */
  example: Record<CheckoutMode, string>;
  /** Whether a link is this company's checkout link for a mode. */
  matches: (url: URL, mode: CheckoutMode) => boolean;
  /** Adds the template's id so the "order paid" message names it (F067). */
  tag: (url: URL, templateId: string) => void;
}

const POLAR_LINK = /^polar_cl_[A-Za-z0-9]+$/;

export const PROVIDERS: Record<CheckoutProvider, ProviderFacts> = {
  // Polar: checkout links. Live: https://buy.polar.sh/polar_cl_…; sandbox:
  // https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_…/redirect.
  // reference_id is copied into the order's metadata.
  polar: {
    name: "Polar",
    example: {
      live: "https://buy.polar.sh/polar_cl_…",
      test: "https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_…/redirect",
    },
    matches: (url, mode) => {
      const parts = url.pathname.split("/").filter(Boolean);
      if (mode === "live") return url.hostname === "buy.polar.sh" && parts.length === 1 && POLAR_LINK.test(parts[0]!);
      return (
        url.hostname === "sandbox-api.polar.sh" &&
        parts.length === 4 &&
        parts[0] === "v1" &&
        parts[1] === "checkout-links" &&
        POLAR_LINK.test(parts[2]!) &&
        parts[3] === "redirect"
      );
    },
    tag: (url, id) => url.searchParams.set("reference_id", id),
  },
  // Lemon Squeezy: https://<store>.lemonsqueezy.com/checkout/buy/<variant uuid>.
  // Test mode is a setting of the Lemon Squeezy store, not of the link.
  lemonsqueezy: {
    name: "Lemon Squeezy",
    example: {
      live: "https://<your store>.lemonsqueezy.com/checkout/buy/…",
      test: "https://<your store>.lemonsqueezy.com/checkout/buy/…",
    },
    matches: (url) => /^[a-z0-9-]+\.lemonsqueezy\.com$/.test(url.hostname) && /^\/checkout\/buy\/[0-9a-f-]{8,}$/.test(url.pathname),
    tag: (url, id) => url.searchParams.set("checkout[custom][template]", id),
  },
};

/** Test cards every supported company accepts in test mode (Stripe's). */
export const TEST_CARD = "4242 4242 4242 4242";
/** The store page buyers come back to after paying (set as the "success" address in the company's dashboard). */
export const THANKS_PATH = "/thanks";

/** Reads list.json's "checkout". Missing → null (buy links are used as written, as before F066). */
export function readCheckout(value: unknown): { checkout: Checkout | null; problems: string[] } {
  if (value === undefined) return { checkout: null, problems: [] };
  const v = (value ?? {}) as Record<string, unknown>;
  const problems: string[] = [];
  const provider = v.provider;
  const mode = v.mode;
  if (typeof provider !== "string" || !(provider in PROVIDERS)) problems.push(`"checkout": "provider" should be ${Object.keys(PROVIDERS).map((p) => `"${p}"`).join(" or ")}.`);
  if (mode !== "test" && mode !== "live") problems.push(`"checkout": "mode" should be "test" or "live".`);
  return problems.length ? { checkout: null, problems } : { checkout: { provider: provider as CheckoutProvider, mode: mode as CheckoutMode }, problems: [] };
}

/** A problem with a template's buy link under the store's checkout, or null. */
export function buyLinkProblem(where: string, buy: string, checkout: Checkout): string | null {
  const facts = PROVIDERS[checkout.provider];
  let url: URL;
  try {
    url = new URL(buy);
  } catch {
    url = new URL("https://invalid.invalid");
  }
  if (url.protocol === "https:" && facts.matches(url, checkout.mode)) return null;
  const other: CheckoutMode = checkout.mode === "test" ? "live" : "test";
  const wrongMode = url.protocol === "https:" && facts.matches(url, other) && facts.example.live !== facts.example.test;
  return wrongMode
    ? `${where}: its "buy" link is a ${other === "test" ? "test (sandbox)" : "live"} ${facts.name} link, but the store's checkout is in ${checkout.mode} mode.`
    : `${where}: its "buy" link should be a ${facts.name} checkout link for ${checkout.mode} mode, like ${facts.example[checkout.mode]}`;
}

/** Where a template's buy button goes: the link, tagged with the template's id when the company is known. */
export function checkoutUrl(buy: string, templateId: string, checkout: Checkout | null): string {
  if (!checkout) return buy;
  const url = new URL(buy);
  PROVIDERS[checkout.provider].tag(url, templateId);
  return url.toString();
}

/** The quiet line under every buy button. */
export function checkoutLine(checkout: Checkout | null): string {
  return checkout
    ? `Secure checkout by ${PROVIDERS[checkout.provider].name}. Tax is added where it applies, and you get a receipt by email.`
    : "Tax is added at checkout where it applies.";
}

/** Test mode only: the note under each buy button (lead in bold, then the rest). */
export function testNote(checkout: Checkout | null): [string, string] | null {
  if (!checkout || checkout.mode !== "test") return null;
  return ["Test checkout.", ` No real payment is taken. To try it, pay with the card ${TEST_CARD}, any future date and any three digits.`];
}

/**
 * The Publish store workflow's gate. A priced template needs a checkout
 * setting, and live mode needs the owner's "Take real payments" switch.
 * Returns problems in plain words; empty means the store may be published.
 */
export function checkoutGate(priced: number, checkout: Checkout | null, realPayments: boolean): string[] {
  if (!priced) return realPayments ? ['"Take real payments" is on, but nothing in the store has a price yet. Nothing was published.'] : [];
  if (!checkout) return ['A template has a price, so store/list.json needs "checkout" (the payment company and "test" or "live") before the store can be published.'];
  if (checkout.mode === "live" && !realPayments) return ['The store\'s checkout is in live mode. Publish it with "Take real payments" switched on, or set "mode": "test".'];
  if (checkout.mode === "test" && realPayments) return ['"Take real payments" is on, but the store\'s checkout is still in test mode. Set "mode": "live" with live checkout links first.'];
  return [];
}
