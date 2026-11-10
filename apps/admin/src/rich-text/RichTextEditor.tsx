/**
 * The Text block's editor (F042, direction A of design/f042-rich-text-v1.html):
 * a small toolbar on top of the field, in the builder's panel and in Quick
 * edit. Lexical (MIT) does the editing; the page file gets Crust's own rich
 * text format (see convert.ts).
 *
 * Keyboard: ⌘B / ⌘I, ⌘K for a link, ⌘⇧8 / ⌘⇧7 for lists, "- " or "1. " to
 * start a list. The toolbar is one Tab stop; arrow keys move inside it.
 */
import { $createLinkNode, $isLinkNode, $toggleLink, LinkNode } from "@lexical/link";
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode, REMOVE_LIST_COMMAND } from "@lexical/list";
import { ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getNearestNodeOfType } from "@lexical/utils";
import { isAllowedLink, toRichText, type RichText } from "@crust/blocks";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { $readRichText, $writeRichText, sameRichText } from "./convert";
import "./rich-text.css";

const EXTERNAL = "crust-external";

export interface RichTextEditorProps {
  /** Shown above the field and used as its accessible name. */
  label: string;
  /** Read out after the label but not shown, e.g. ", part 4" in Quick edit. */
  labelSuffix?: string;
  value: unknown;
  onChange: (value: RichText) => void;
  id?: string;
  /** F090: typing on the page. The bar floats above the text and the field takes the block's own look. */
  floating?: boolean;
  /** F090: put the cursor in the text as soon as it appears. */
  autoFocus?: boolean;
}

export function RichTextEditor({ label, labelSuffix, value, onChange, id, floating, autoFocus }: RichTextEditorProps) {
  const own = useId();
  // Puck can draw a field twice (one copy hidden), so ids get our own suffix.
  const editorId = `${id ?? "rt"}-${own.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const labelId = `${editorId}-label`;
  const initialConfig = {
    namespace: "crust-text",
    nodes: [ListNode, ListItemNode, LinkNode],
    onError: (error: Error) => {
      throw error;
    },
    theme: {
      text: { bold: "rt-bold", italic: "rt-italic" },
      list: { ul: "rt-ul", ol: "rt-ol", listitem: "rt-li" },
      link: "rt-link-node",
      paragraph: "rt-p",
    },
    editorState: () => $writeRichText(value),
  };
  return (
    <div className={floating ? "rt rt-floating" : "rt"} data-crust-rich="">
      <span className="rt-label" id={labelId}>
        {label}
        {labelSuffix ? <span className="rt-sr">{labelSuffix}</span> : null}
      </span>
      <LexicalComposer initialConfig={initialConfig}>
        <Field editorId={editorId} labelId={labelId} value={value} onChange={onChange} autoFocus={autoFocus} />
      </LexicalComposer>
    </div>
  );
}

function Field({ editorId, labelId, value, onChange, autoFocus }: { editorId: string; labelId: string; value: unknown; onChange: (v: RichText) => void; autoFocus?: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (autoFocus) editor.focus(undefined, { defaultSelection: "rootEnd" });
  }, [editor, autoFocus]);
  const [linkOpen, setLinkOpen] = useState(false);
  const openLink = useCallback(() => setLinkOpen(true), []);
  const onKeyDown = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    // Shortcuts typed here are the editor's: Puck's own ⌘Z (undo the page)
    // and ⌘I (preview interactions) listen on the whole document.
    if (!["Meta", "Control", "Shift", "Alt"].includes(e.key)) e.stopPropagation();
    if (e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "k" && !e.shiftKey) {
      e.preventDefault();
      openLink();
    } else if (e.shiftKey && (e.code === "Digit8" || key === "*")) {
      e.preventDefault();
      toggleList(editor, "ul");
    } else if (e.shiftKey && (e.code === "Digit7" || key === "&")) {
      e.preventDefault();
      toggleList(editor, "ol");
    }
  };
  return (
    <div className="rt-field" onKeyDown={onKeyDown}>
      <Toolbar editorId={editorId} onLink={openLink} linkOpen={linkOpen} />
      <div className="rt-body">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            id={editorId}
            className="rt-editor"
            aria-labelledby={labelId}
            aria-multiline
            role="textbox"
            spellCheck
            aria-placeholder="Write something here."
            placeholder={<div className="rt-placeholder">Write something here.</div>}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={isAllowedLink} />
      <MarkdownShortcutPlugin transformers={[UNORDERED_LIST, ORDERED_LIST]} />
      <SyncPlugin value={value} onChange={onChange} />
      {linkOpen ? <LinkForm onClose={() => setLinkOpen(false)} /> : null}
    </div>
  );
}

/** Keeps the editor and the block's prop in step, in both directions. */
function SyncPlugin({ value, onChange }: { value: unknown; onChange: (v: RichText) => void }) {
  const [editor] = useLexicalComposerContext();
  const last = useRef<unknown>(value);
  // What we sent and the builder hasn't echoed back yet. Echoes arrive late,
  // after newer keystrokes, so they must never be written back over them.
  const pending = useRef<RichText[]>([]);
  const emit = useRef(onChange);
  emit.current = onChange;

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(EXTERNAL) || (dirtyElements.size === 0 && dirtyLeaves.size === 0)) return;
        const doc = editorState.read($readRichText);
        if (sameRichText(doc, last.current)) return;
        const trimmed = toRichText(doc);
        while (trimmed.blocks.length && isEmptyBlock(trimmed.blocks[trimmed.blocks.length - 1]!)) trimmed.blocks.pop();
        last.current = trimmed;
        pending.current = [...pending.current.slice(-49), trimmed];
        emit.current(trimmed);
      }),
    [editor],
  );

  // Another block selected, undo in the builder, or Quick edit's reset: show the new text.
  useEffect(() => {
    const echo = pending.current.findIndex((p) => sameRichText(p, value));
    if (echo !== -1) {
      pending.current = pending.current.slice(echo + 1);
      return;
    }
    if (sameRichText(value, last.current) || sameRichText(value, editor.getEditorState().read($readRichText))) return;
    // While you're typing here, this field is the source of truth: the
    // builder can send back data a few keystrokes old (its page settings
    // resolve after each change). Selecting another block moves focus away first.
    const field = editor.getRootElement()?.closest(".rt-field");
    if (field && field.contains(field.ownerDocument.activeElement)) return;
    pending.current = [];
    last.current = value;
    editor.update(() => $writeRichText(value), { tag: EXTERNAL });
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  }, [editor, value]);
  return null;
}

const isEmptyBlock = (b: RichText["blocks"][number]) =>
  b.type === "p" ? !b.children.some((s) => s.text) : !b.items.some((i) => i.some((s) => s.text));

type Active = { bold: boolean; italic: boolean; link: boolean; list: "ul" | "ol" | null };

function useActive(editor: LexicalEditor): Active {
  const [active, setActive] = useState<Active>({ bold: false, italic: false, link: false, list: null });
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) =>
        editorState.read(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return;
          const node = sel.anchor.getNode();
          const list = $getNearestNodeOfType(node, ListNode);
          const link = $isLinkNode(node) || $isLinkNode(node.getParent());
          const next: Active = { bold: sel.hasFormat("bold"), italic: sel.hasFormat("italic"), link, list: list ? (list.getListType() === "number" ? "ol" : "ul") : null };
          setActive((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        }),
      ),
    [editor],
  );
  return active;
}

function toggleList(editor: LexicalEditor, type: "ul" | "ol") {
  let current: "ul" | "ol" | null = null;
  editor.getEditorState().read(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    const list = $getNearestNodeOfType(sel.anchor.getNode(), ListNode);
    if (list && $isListNode(list)) current = list.getListType() === "number" ? "ol" : "ul";
  });
  if (current === type) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
  else editor.dispatchCommand(type === "ul" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined);
}

const icons: Record<string, ReactNode> = {
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" strokeWidth="2.4" strokeLinejoin="round" />,
  italic: <path d="M15 5h-4M13 19H9M15 5l-4 14" />,
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />,
  ul: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <circle cx="5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="5" cy="18" r="1.2" fill="currentColor" />
    </>
  ),
  ol: <path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 13.5c0-1 2.5-1.5 2.5 0 0 1-2.5 2-2.5 3h2.5" />,
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl+";

function Toolbar({ editorId, onLink, linkOpen }: { editorId: string; onLink: () => void; linkOpen: boolean }) {
  const [editor] = useLexicalComposerContext();
  const active = useActive(editor);
  const [focus, setFocus] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttons: { key: string; label: string; pressed: boolean; run: () => void }[] = [
    { key: "bold", label: `Bold (${mod}B)`, pressed: active.bold, run: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold") },
    { key: "italic", label: `Italic (${mod}I)`, pressed: active.italic, run: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic") },
    { key: "link", label: `Link (${mod}K)`, pressed: active.link || linkOpen, run: onLink },
    { key: "ul", label: `Bulleted list (${mod}${isMac ? "⇧" : "Shift+"}8)`, pressed: active.list === "ul", run: () => toggleList(editor, "ul") },
    { key: "ol", label: `Numbered list (${mod}${isMac ? "⇧" : "Shift+"}7)`, pressed: active.list === "ol", run: () => toggleList(editor, "ol") },
  ];
  // Roving tabindex (WAI-ARIA toolbar): one Tab stop, arrows inside.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: focus + 1, ArrowLeft: focus - 1, Home: 0, End: buttons.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (moves[e.key]! + buttons.length) % buttons.length;
    setFocus(next);
    ref.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  return (
    <div className="rt-toolbar" role="toolbar" aria-label="Format text" aria-controls={editorId} ref={ref} onKeyDown={onKeyDown}>
      {buttons.map((b, i) => (
        <span key={b.key} className="rt-tool-wrap">
          {b.key === "ul" ? <span className="rt-sep" aria-hidden="true" /> : null}
          <button
            type="button"
            className="rt-tool"
            aria-label={b.label}
            data-tip={b.label}
            aria-pressed={b.pressed}
            tabIndex={i === focus ? 0 : -1}
            // Keep the text selection while clicking a button.
            onMouseDown={(e) => e.preventDefault()}
            onFocus={() => setFocus(i)}
            onClick={b.run}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {icons[b.key]}
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

/** Add, change or remove the link on the selected words. */
function LinkForm({ onClose }: { onClose: () => void }) {
  const [editor] = useLexicalComposerContext();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [url, setUrl] = useState("");
  const [hasLink, setHasLink] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      const node = sel.anchor.getNode();
      const link = $isLinkNode(node) ? node : $isLinkNode(node.getParent()) ? node.getParent() : null;
      if (link && $isLinkNode(link)) {
        setUrl(link.getURL());
        setHasLink(true);
      }
    });
    input.current?.focus();
  }, [editor]);

  const close = () => {
    onClose();
    editor.focus();
  };
  const apply = () => {
    const href = url.trim();
    if (!isAllowedLink(href)) {
      setError("This address can't be used. Use a page like /menu, a web address starting with https://, or mailto:you@example.com.");
      input.current?.focus();
      return;
    }
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      // No words selected (and not in a link): the address itself becomes the linked words.
      if (sel.isCollapsed() && !$isLinkNode(sel.anchor.getNode().getParent())) {
        const link = $createLinkNode(href);
        link.append($createTextNode(href));
        sel.insertNodes([link]);
        return;
      }
      $toggleLink(href);
    });
    close();
  };
  const remove = () => {
    editor.update(() => $toggleLink(null));
    close();
  };
  return (
    <div
      className="rt-link"
      role="group"
      aria-label="Link"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <label className="rt-link-label" htmlFor={inputId}>
        Link address
      </label>
      <input
        ref={input}
        id={inputId}
        className="rt-link-input"
        type="text"
        inputMode="url"
        autoComplete="off"
        placeholder="/menu, https://… or mailto:…"
        value={url}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
      />
      {error ? (
        <p className="rt-link-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <div className="rt-link-actions">
        <button type="button" className="rt-btn rt-btn-primary" onClick={apply}>
          Apply link
        </button>
        {hasLink ? (
          <button type="button" className="rt-btn" onClick={remove}>
            Remove link
          </button>
        ) : null}
        <button type="button" className="rt-btn" onClick={close}>
          Cancel
        </button>
      </div>
    </div>
  );
}
