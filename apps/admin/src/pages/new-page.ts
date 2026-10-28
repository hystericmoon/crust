import type { Page } from "@crust/blocks";

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

/** "About Us & Team!" → "about-us-team" */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export interface NewPageInput {
  title: string;
  /** What the owner typed after the "/" prefix, e.g. "about" or "blog/first-post". */
  address: string;
  description: string;
}

export type NewPageErrors = Partial<Record<keyof NewPageInput, string>>;

/** What the owner typed after the "/" prefix, as a page path: "about/" → "/about". */
export const toPath = (address: string) => `/${address.trim().replace(/^\/+|\/+$/g, "")}`;

/** The problem with an address (typed without the leading "/"), or null. Shared by New page and Rename (F015). */
export function checkAddress(input: string, existingPaths: string[]): string | null {
  const address = input.trim().replace(/^\/+|\/+$/g, "");
  const segments = address.split("/");
  if (!address) return "Add an address, like about or contact.";
  if (segments.some((s) => !SEGMENT.test(s))) return "Use lowercase letters, numbers and dashes, starting with a letter or number (like about-us).";
  if (segments.length > 4) return "Use at most 4 levels, like blog/2026/first-post.";
  if (existingPaths.includes(`/${address}`)) return `There's already a page at /${address}.`;
  return null;
}

/** Plain-language problems, keyed by field. Empty when the page can be created. */
export function checkNewPage(input: NewPageInput, existingPaths: string[]): NewPageErrors {
  const errors: NewPageErrors = {};
  if (!input.title.trim()) errors.title = "Give the page a title.";
  else if (input.title.length > 120) errors.title = "Keep the title under 120 characters.";

  const address = checkAddress(input.address, existingPaths);
  if (address) errors.address = address;

  if (input.description.length > 300) errors.description = "Keep the description under 300 characters.";
  return errors;
}

/** A new page starts with one section holding its H1, so it passes the publish checks. */
export function createPage(input: NewPageInput): Page {
  const path = toPath(input.address);
  const id = (type: string) => `${type}-${crypto.randomUUID()}`;
  return {
    path,
    title: input.title.trim(),
    description: input.description.trim(),
    puck: {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: id("Section"),
            background: "background",
            paddingY: "lg",
            content: [{ type: "Heading", props: { id: id("Heading"), text: input.title.trim(), level: "h1", align: "left" } }],
          },
        },
      ],
    },
  };
}
