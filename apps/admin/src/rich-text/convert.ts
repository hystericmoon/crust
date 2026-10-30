/**
 * Between Lexical's editor state and Crust's rich text (F042). The page file
 * only ever holds Crust's own small format; Lexical's state stays in the
 * browser while you type. Run these inside editor.read() / editor.update().
 */
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode, type ListNode } from "@lexical/list";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
} from "lexical";
import { isAllowedLink, normalizeRichText, toRichText, type RichBlock, type RichSpan, type RichText } from "@crust/blocks";

/** Words of an element, with bold, italic and links; nested lists are left to the caller. */
function spansOf(node: ElementNode, href?: string): RichSpan[] {
  const out: RichSpan[] = [];
  for (const child of node.getChildren()) {
    if ($isListNode(child)) continue;
    if ($isTextNode(child)) {
      const span: RichSpan = { text: child.getTextContent() };
      if (child.hasFormat("bold")) span.bold = true;
      if (child.hasFormat("italic")) span.italic = true;
      if (href) span.href = href;
      out.push(span);
    } else if ($isLineBreakNode(child)) {
      out.push({ text: "\n", ...(href ? { href } : {}) });
    } else if ($isLinkNode(child)) {
      const url = child.getURL().trim();
      out.push(...spansOf(child, isAllowedLink(url) ? url : undefined));
    } else if ($isElementNode(child)) {
      out.push(...spansOf(child, href));
    }
  }
  return out;
}

/** List items, with any nested list's items following their parent (Crust lists are one level). */
function itemsOf(list: ListNode): RichSpan[][] {
  const items: RichSpan[][] = [];
  for (const child of list.getChildren()) {
    if (!$isListItemNode(child)) continue;
    const own = spansOf(child);
    if (own.length) items.push(own);
    for (const inner of child.getChildren()) if ($isListNode(inner)) items.push(...itemsOf(inner));
  }
  return items;
}

/** The editor's content as Crust rich text. */
export function $readRichText(): RichText {
  const blocks: RichBlock[] = [];
  for (const node of $getRoot().getChildren()) {
    if ($isListNode(node)) blocks.push({ type: node.getListType() === "number" ? "ol" : "ul", items: itemsOf(node) });
    else if ($isElementNode(node)) blocks.push({ type: "p", children: spansOf(node) });
  }
  return normalizeRichText({ rich: 1, blocks });
}

function $spanNodes(spans: RichSpan[]): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  for (const s of spans) {
    const parts = s.text.split("\n");
    const inline: LexicalNode[] = [];
    parts.forEach((part, i) => {
      if (i > 0) inline.push($createLineBreakNode());
      if (!part) return;
      const t = $createTextNode(part);
      if (s.bold) t.toggleFormat("bold");
      if (s.italic) t.toggleFormat("italic");
      inline.push(t);
    });
    if (s.href) {
      const link = $createLinkNode(s.href);
      link.append(...inline);
      nodes.push(link);
    } else nodes.push(...inline);
  }
  return nodes;
}

/** Replaces the editor's content with `value` (rich text, or plain text from older pages). */
export function $writeRichText(value: unknown): void {
  const root = $getRoot();
  root.clear();
  const doc = toRichText(value);
  for (const b of doc.blocks) {
    if (b.type === "p") {
      const p = $createParagraphNode();
      p.append(...$spanNodes(b.children));
      root.append(p);
    } else {
      const list = $createListNode(b.type === "ol" ? "number" : "bullet");
      for (const item of b.items) {
        const li = $createListItemNode();
        li.append(...$spanNodes(item));
        list.append(li);
      }
      root.append(list);
    }
  }
  if (root.getChildrenSize() === 0) root.append($createParagraphNode());
}

/** Same content, ignoring empty trailing paragraphs the editor keeps while typing. */
export const sameRichText = (a: unknown, b: unknown): boolean => JSON.stringify(trimmed(toRichText(a))) === JSON.stringify(trimmed(toRichText(b)));

function trimmed(doc: RichText): RichText {
  const blocks = [...doc.blocks];
  while (blocks.length) {
    const last = blocks[blocks.length - 1]!;
    const empty = last.type === "p" ? !last.children.some((s) => s.text) : !last.items.some((i) => i.some((s) => s.text));
    if (!empty) break;
    blocks.pop();
  }
  return { rich: 1, blocks };
}
