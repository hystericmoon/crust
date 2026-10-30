/**
 * Rich text as HTML (F042), the same in the builder and on the published
 * page. React escapes every word; links go through safeUrl.
 */
import { Fragment, type ReactNode } from "react";
import { toRichText, type RichSpan } from "./rich-text";
import { safeUrl } from "./url";

/** Words with their line breaks ("\n", from Shift+Enter). */
const lines = (text: string, key: string): ReactNode[] =>
  text.split("\n").flatMap((part, i) => (i === 0 ? [part] : [<br key={`${key}-br${i}`} />, part]));

function Spans({ spans }: { spans: RichSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        let node: ReactNode = <>{lines(s.text, String(i))}</>;
        if (s.italic) node = <em>{node}</em>;
        if (s.bold) node = <strong>{node}</strong>;
        if (s.href) node = <a href={safeUrl(s.href)}>{node}</a>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

/** Paragraphs and lists of a Text block; plain text from older pages works too. */
export function RichTextView({ value }: { value: unknown }) {
  const doc = toRichText(value);
  return (
    <>
      {doc.blocks.map((b, i) => {
        if (b.type === "p") return b.children.some((s) => s.text.trim()) ? <p key={i}><Spans spans={b.children} /></p> : null;
        const items = b.items.filter((item) => item.some((s) => s.text.trim()));
        if (!items.length) return null;
        const List = b.type;
        return (
          <List key={i}>
            {items.map((item, j) => (
              <li key={j}><Spans spans={item} /></li>
            ))}
          </List>
        );
      })}
    </>
  );
}
