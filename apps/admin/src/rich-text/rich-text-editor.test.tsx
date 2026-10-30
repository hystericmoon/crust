// @vitest-environment happy-dom
import { config, type RichText } from "@crust/blocks";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createEditor } from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPage } from "../../server/content";
import { applyQuickEdit, quickGroups } from "../quick/quick";
import { $readRichText, $writeRichText, sameRichText } from "./convert";
import { withRichText } from "./field";
import { RichTextEditor } from "./RichTextEditor";

afterEach(cleanup);

const sample: RichText = {
  rich: 1,
  blocks: [
    { type: "p", children: [{ text: "Fresh bread " }, { text: "every morning", bold: true }, { text: ", " }, { text: "warm", bold: true, italic: true }, { text: ". See the " }, { text: "menu", href: "/menu" }, { text: "." }] },
    { type: "ul", items: [[{ text: "Sourdough" }], [{ text: "Rye" }]] },
    { type: "p", children: [{ text: "Line one\nline two" }] },
    { type: "ol", items: [[{ text: "Order" }]] },
  ],
};

const headless = () => createEditor({ nodes: [ListNode, ListItemNode, LinkNode], onError: (e) => { throw e; } });
const roundTrip = (value: unknown): RichText => {
  const editor = headless();
  editor.update(() => $writeRichText(value), { discrete: true });
  return editor.getEditorState().read($readRichText);
};

describe("rich-text editor: Lexical and Crust's format (F042)", () => {
  it("comes back exactly as it went in", () => {
    expect(roundTrip(sample)).toEqual(sample);
  });

  it("opens older plain text as paragraphs", () => {
    expect(roundTrip("One\n\nTwo")).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "One" }] }, { type: "p", children: [{ text: "Two" }] }] });
  });

  it("an empty Text block opens as one empty paragraph and reads back as nothing", () => {
    expect(sameRichText(roundTrip({ rich: 1, blocks: [] }), { rich: 1, blocks: [] })).toBe(true);
  });

  it("reads unsafe links pasted into the editor as plain words", () => {
    const editor = headless();
    editor.update(
      () => {
        $writeRichText({ rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "/ok" }] }] });
      },
      { discrete: true },
    );
    editor.update(
      () => {
        const link = editor.getEditorState()._nodeMap;
        for (const node of link.values()) if (node instanceof LinkNode) node.getWritable().setURL("javascript:alert(1)");
      },
      { discrete: true },
    );
    expect(editor.getEditorState().read($readRichText)).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "x" }] }] });
  });
});

describe("rich-text editor: the field", () => {
  const setup = (value: unknown = sample, labelSuffix?: string) => {
    const onChange = vi.fn();
    const view = render(<RichTextEditor label="Text" labelSuffix={labelSuffix} value={value} onChange={onChange} />);
    return { onChange, view };
  };

  it("is a labelled multi-line text box showing the text", async () => {
    setup(sample, ", part 4");
    const box = screen.getByRole("textbox", { name: /^Text\s*, part 4$/ });
    expect(box.getAttribute("aria-multiline")).toBe("true");
    await waitFor(() => expect(box.textContent).toContain("Fresh bread every morning"));
    expect(box.querySelector("strong, .rt-bold")).not.toBeNull();
    expect(box.querySelector("a")?.getAttribute("href")).toBe("/menu");
  });

  it("has a toolbar of five buttons that is one Tab stop, moved with the arrow keys", () => {
    setup();
    const toolbar = screen.getByRole("toolbar", { name: "Format text" });
    const buttons = [...toolbar.querySelectorAll("button")];
    expect(buttons.map((b) => b.getAttribute("aria-label")?.replace(/ \(.*\)$/, ""))).toEqual(["Bold", "Italic", "Link", "Bulleted list", "Numbered list"]);
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    buttons[0]!.focus();
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(toolbar, { key: "End" });
    expect(document.activeElement).toBe(buttons[4]);
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons.every((b) => b.hasAttribute("aria-pressed"))).toBe(true);
    // Each shortcut is named, for the tooltip and screen readers.
    expect(buttons[2]!.getAttribute("aria-label")).toMatch(/Link \((⌘|Ctrl\+)K\)/);
  });

  it("refuses an unsafe link address with a clear message, and Escape closes the form", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Link/ }));
    const input = await screen.findByLabelText("Link address");
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));
    expect(screen.getByRole("alert").textContent).toMatch(/can't be used/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByLabelText("Link address")).toBeNull();
  });

  it("⌘K opens the link form from the text", async () => {
    setup();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "k", metaKey: true });
    expect(await screen.findByLabelText("Link address")).toBeTruthy();
  });

  it("keeps ⌘Z and ⌘I in the editor, away from the builder's own shortcuts", () => {
    setup();
    const seen = vi.fn();
    document.addEventListener("keydown", seen);
    const box = screen.getByRole("textbox");
    fireEvent.keyDown(box, { key: "z", code: "KeyZ", metaKey: true });
    fireEvent.keyDown(box, { key: "i", code: "KeyI", ctrlKey: true });
    expect(seen).not.toHaveBeenCalled();
    // Plain typing still reaches the page (e.g. the builder's "?" help is ignored while typing anyway).
    fireEvent.keyDown(box, { key: "a", code: "KeyA" });
    expect(seen).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", seen);
  });

  it("shows new text when the block changes from outside (another block selected, undo)", async () => {
    const { view, onChange } = setup();
    view.rerender(<RichTextEditor label="Text" value={{ rich: 1, blocks: [{ type: "p", children: [{ text: "Another block" }] }] }} onChange={onChange} />);
    await waitFor(() => expect(screen.getByRole("textbox").textContent).toBe("Another block"));
    // Writing it there isn't an edit of yours, so nothing is sent back.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("replaces the Text block's field in the builder only", () => {
    const edited = withRichText(config as never) as typeof config;
    expect((edited.components.Text.fields!.text as { type: string }).type).toBe("custom");
    expect((config.components.Text.fields!.text as { type: string }).type).toBe("textarea");
    expect(edited.components.Heading).toBe(config.components.Heading);
  });

  it("formats with the toolbar", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor label="Text" value={{ rich: 1, blocks: [{ type: "p", children: [{ text: "Bold me" }] }] }} onChange={onChange} />);
    const box = screen.getByRole("textbox");
    await waitFor(() => expect(box.textContent).toBe("Bold me"));
    // Select everything in the field, then press Bold.
    await act(async () => {
      box.focus();
      const range = document.createRange();
      range.selectNodeContents(box);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      await new Promise((r) => setTimeout(r, 20));
    });
    fireEvent.click(screen.getByRole("button", { name: /^Bold/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.lastCall![0]).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "Bold me", bold: true }] }] });
  });
});

describe("rich-text editor: Quick edit and saving", () => {
  const data = {
    root: { props: {} },
    content: [{ type: "Text", props: { id: "t1", text: sample, align: "left", tone: "default" } }],
  };

  it("Quick edit lists a Text block as a rich field, with its words", () => {
    const [group] = quickGroups(data as never);
    expect(group!.fields[0]).toMatchObject({ kind: "rich", key: "text", rich: sample });
    expect(group!.fields[0]!.value).toContain("Fresh bread every morning");
  });

  it("Quick edit saves the edited rich text in place", () => {
    const next: RichText = { rich: 1, blocks: [{ type: "p", children: [{ text: "New words", italic: true }] }] };
    const out = applyQuickEdit(data as never, { blockId: "t1", key: "text" }, next);
    expect(out.content[0]!.props.text).toEqual(next);
    expect(out.content[0]!.props.align).toBe("left");
  });

  it("the server refuses a page with an unsafe link in its text", () => {
    const page = (text: unknown) => ({
      path: "/about",
      title: "About",
      description: "",
      puck: { root: { props: {} }, content: [{ type: "Text", props: { id: "t", text } }] },
    });
    expect(checkPage(page(sample))).toEqual([]);
    expect(checkPage(page("older plain text"))).toEqual([]);
    expect(checkPage(page({ rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:alert(1)" }] }] })).join(" ")).toMatch(/A link in a Text block can't be used/);
  });
});
