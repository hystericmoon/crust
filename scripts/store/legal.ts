/**
 * F068: the store's licence, terms and refund pages, the line under every buy
 * button that links to them, and the gate that keeps real payments off until
 * the owner has approved the wording. Snapshot: design/f068-legal-v1.html
 * (A on every choice: one price for unlimited sites, full refund within 14
 * days for any reason, three short pages).
 *
 * The wording is Claude's draft; the owner decides it (BLOCKED.md). Until
 * `LEGAL.approved` is set, every legal page says "Draft" at the top and the
 * store refuses live mode.
 */
import type { Page, RichText } from "@crust/blocks";
import { kit, type Block } from "../starter-templates/kit";
import { PROVIDERS, type Checkout } from "./checkout";

export interface LegalSettings {
  /** The date the owner approved the wording ("2026-11-10"), or null while it's a draft. */
  approved: string | null;
  /** The name templates are sold under (a person or a business). */
  seller: string | null;
  /** Where buyers write for refunds and questions. */
  contact: string | null;
  /** Days after buying in which a refund is given for any reason. */
  refundDays: number;
}

/** The owner's decisions. Claude changes these only when he says so. */
export const LEGAL: LegalSettings = { approved: null, seller: null, contact: null, refundDays: 14 };

export const LICENCE_PATH = "/licence";
export const TERMS_PATH = "/terms";
export const REFUNDS_PATH = "/refunds";
export const LEGAL_PATHS = [LICENCE_PATH, TERMS_PATH, REFUNDS_PATH] as const;

/** The licence in one sentence: the default for a priced template's `licence` in store/list.json. */
export const LICENCE_SUMMARY = "Use it for as many sites as you like, your own or your clients'. Don't resell or share the template file.";

type Run = { text: string; bold?: boolean; href?: string };
const rich = (...paragraphs: Run[][]): RichText => ({ rich: 1, blocks: paragraphs.map((children) => ({ type: "p", children })) }) as RichText;

/** Under every buy button: what buying agrees to, and the refund promise, each linked. */
export function buyLegalLine(k: ReturnType<typeof kit>, legal: LegalSettings = LEGAL): Block {
  return k.text(
    rich([
      { text: "By buying you agree to the " },
      { text: "licence", href: LICENCE_PATH },
      { text: " and " },
      { text: "terms", href: TERMS_PATH },
      { text: ". Not right for you? " },
      { text: `Full refund within ${legal.refundDays} days`, href: REFUNDS_PATH },
      { text: "." },
    ]),
    { tone: "muted" },
  );
}

/** What the live-mode gate needs from the owner before real payments. */
export function legalProblems(legal: LegalSettings = LEGAL): string[] {
  const problems: string[] = [];
  if (!legal.approved) problems.push("The licence, terms and refund pages are still drafts. The owner approves their wording before the store takes real payments (F068).");
  if (!legal.seller) problems.push("The terms don't say who sells the templates yet (the owner's name or business).");
  if (!legal.contact) problems.push("The terms and refund pages have no contact email yet.");
  return problems;
}

/** Live mode needs approved wording, a seller and a contact. Test mode and a store with nothing for sale don't. */
export function legalGate(priced: number, checkout: Checkout | null, legal: LegalSettings = LEGAL): string[] {
  return priced && checkout?.mode === "live" ? legalProblems(legal) : [];
}

const page = (path: string, title: string, description: string, content: Block[]): Page => ({ path, title, description, puck: { root: { props: {} }, content } });

function legalPage(prefix: string, path: string, title: string, description: string, intro: string, parts: [string, (string | Run[])[]][], legal: LegalSettings): Page {
  const k = kit(prefix);
  const para = (p: string | Run[]) => k.text(typeof p === "string" ? p : rich(p), { tone: "default" });
  return page(path, title, description, [
    ...(legal.approved
      ? []
      : [k.section("surface", [k.text(rich([{ text: "Draft.", bold: true }, { text: " This wording hasn't been approved yet and may change before the store sells anything." }]), { tone: "default" })], { paddingY: "sm", width: "narrow" })]),
    k.section("background", [
      // F068 review: a normal-size title (not Display), so a short legal page doesn't shout.
      k.heading(title, { level: "h1", mark: false, ...(legal.approved ? { eyebrow: `Updated ${legal.approved}` } : {}) }),
      k.text(intro, { tone: "default" }),
      ...parts.flatMap(([heading, paragraphs]) => [k.heading(heading, { level: "h2", mark: false }), ...paragraphs.map(para)]),
    ], { paddingY: "xl", width: "narrow" }),
  ]);
}

const contactRuns = (legal: LegalSettings, lead: string): Run[] =>
  legal.contact ? [{ text: `${lead}write to ` }, { text: legal.contact, href: `mailto:${legal.contact}` }] : [{ text: `${lead}reply to your receipt email` }];

export function licencePage(legal: LegalSettings = LEGAL): Page {
  return legalPage(
    "licence",
    LICENCE_PATH,
    "Licence",
    "What you may do with a template from the Crust store: as many sites as you like, for yourself or for clients.",
    "When you buy a template from this store, you get a licence to use it. In short: make as many sites with it as you like, and don't pass the template itself on.",
    [
      ["You can", ["Use the template for any number of websites, for yourself or for clients, paid or unpaid.", "Change anything in it: words, photos, colours, fonts and pages.", "Keep the sites you've published up for as long as you like."]],
      ["You can't", ["Sell, share or give away the template file, or a copy of it with small changes.", "Offer the template, or something made mainly from it, as a template of your own, in this store or anywhere else."]],
      ["Fonts and photos", ["Fonts and sample photos come with their own free licences, which allow use on your sites."]],
      ["Free templates", ["The templates that come with Crust are free. Use them for as many sites as you like, under the same rules."]],
      ["If you're refunded", [[{ text: "A refund ends the licence for new sites; sites you've already published can stay up. See " }, { text: "Refunds", href: REFUNDS_PATH }, { text: "." }]]],
    ],
    legal,
  );
}

export function termsPage(checkout: Checkout | null, legal: LegalSettings = LEGAL): Page {
  const company = checkout ? PROVIDERS[checkout.provider].name : "Our payment company";
  return legalPage(
    "terms",
    TERMS_PATH,
    "Terms",
    "Who sells the templates in the Crust store, what you get when you buy one, and what happens if something is wrong.",
    "These terms apply when you buy a template from this store.",
    [
      ["Who you're buying from", [
        `Templates are made by ${legal.seller ?? "the maker of Crust"}. ${company} handles the payment and sells the templates on our behalf as the merchant of record, the company that takes your payment and deals with tax. ${checkout ? company : "It"} adds tax where it applies and sends your receipt, and its buyer terms cover the payment itself.`,
      ]],
      ["What you get", [
        [{ text: "A template file to open in Crust, the free app, and a personal download page. Updates to the template are free and appear on the same page. What you may do with the template is in the " }, { text: "licence", href: LICENCE_PATH }, { text: "." }],
      ]],
      ["If something is wrong", [
        [{ text: "If a template doesn't open or doesn't match its store page, tell us and we'll fix it or refund you, even after the " }, { text: `${legal.refundDays}-day refund window`, href: REFUNDS_PATH }, { text: ". Beyond that, templates come as they are, and we're not liable for more than you paid." }],
      ]],
      ["Changes and questions", [
        [{ text: "If these terms change, the new version applies to purchases made after the change. Questions: " }, ...contactRuns(legal, ""), { text: "." }],
      ]],
    ],
    legal,
  );
}

export function refundsPage(legal: LegalSettings = LEGAL): Page {
  return legalPage(
    "refunds",
    REFUNDS_PATH,
    "Refunds",
    `Not right for you? A full refund within ${legal.refundDays} days of buying a template, for any reason.`,
    `Not right for you? You can have a full refund within ${legal.refundDays} days of buying, for any reason.`,
    [
      ["How", [[...contactRuns(legal, "To ask for one, "), { text: " with your order number. The money goes back the way you paid, usually within 5 to 10 working days." }]]],
      ["What happens next", ["Your download page stops working, and the licence ends for any new sites. Sites you've already published can stay up."]],
      [`After ${legal.refundDays} days`, ["If the template doesn't open or doesn't match its store page, we'll still fix it or refund you."]],
    ],
    legal,
  );
}

/** The three pages, in the order the footer lists them. */
export function legalPages(checkout: Checkout | null, legal: LegalSettings = LEGAL): Page[] {
  return [licencePage(legal), termsPage(checkout, legal), refundsPage(legal)];
}
