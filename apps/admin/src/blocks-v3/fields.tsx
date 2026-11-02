/**
 * Builder fields for the F078 blocks: the Table's grid of cells, notes under
 * the Video's address (what was found, what's missing), and which fields
 * show when (the number look only with Numbers, the badge only with a
 * highlighted plan, captions only for a video file).
 */
import { captionsAddress, videoServiceName, videoSourceOf, type Components } from "@crust/blocks";
import { createUsePuck, type Config } from "@puckeditor/core";
import { TableField } from "./TableField";
import type { Cells } from "./table-edit";

const usePuckSelector = createUsePuck();

type Props = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Whether a field of one of these blocks shows, given the block's settings. Other fields always show. */
export function blockFieldShown(component: string, key: string, props: Props): boolean {
  if (component === "IconList" && key === "numberStyle") return props.icon === "numbers";
  if (component === "Pricing" && (key === "badge" || key === "highlightStyle")) return !!props.highlight && props.highlight !== "none";
  if (component === "Video" && key === "captionsSrc") {
    const s = videoSourceOf(props.src);
    return !s || s.kind === "file";
  }
  return true;
}

export type VideoNote = { text: string; warning?: boolean };

/** What the builder says under a Video's address. */
export function videoNotes(props: Props): VideoNote[] {
  const src = str(props.src);
  if (!src) return [{ text: "Paste a YouTube or Vimeo link, or the address of an .mp4 or .webm file." }];
  const s = videoSourceOf(src);
  if (!s) return [{ text: "This isn't a YouTube or Vimeo link or a video file address (.mp4, .webm starting with https:// or /), so nothing shows.", warning: true }];
  const notes: VideoNote[] = [];
  if (s.kind === "file") {
    notes.push({ text: "Video file found. It plays in the browser's own player and downloads only when a visitor presses play." });
    if (!captionsAddress(props.captionsSrc))
      notes.push({
        text: str(props.captionsSrc)
          ? "The captions file must be a .vtt address (https:// or /), so it's left out."
          : "Does it have speech? Add a captions file (.vtt), so people who can't hear it can follow (WCAG 1.2.2).",
        warning: true,
      });
  } else {
    notes.push({ text: `${videoServiceName(s)} video found. Nothing loads from ${videoServiceName(s)} until a visitor presses play; captions show when the video has them.` });
    if (!str(props.imageSrc)) notes.push({ text: "No cover photo: a plain panel in the section's colours shows the play button and title." });
  }
  if (!str(props.title)) notes.push({ text: "Say what the video is (“Our bakery at 5 a.m.”), so the play button and player have a clear name.", warning: true });
  return notes;
}

function VideoHelp() {
  const props = usePuckSelector((s) => (s.selectedItem?.type === "Video" ? (s.selectedItem.props as Props) : null));
  if (!props) return null;
  return (
    <div className="tv-notes" role="status">
      {videoNotes(props).map((n, i) => (
        <p key={i} className={n.warning ? "ic-note is-warning" : "ic-note"}>
          {n.text}
        </p>
      ))}
    </div>
  );
}

function TableCells({ value, onChange }: { value: unknown; onChange: (v: Cells) => void }) {
  const headers = usePuckSelector((s) => (s.selectedItem?.type === "Table" ? String(s.selectedItem.props.headers ?? "top") : "top"));
  return <TableField value={value} onChange={onChange} headers={headers === "both" || headers === "none" ? headers : "top"} />;
}

export function withBlocksV3Fields(config: Config<Components>): Config<Components> {
  const c = config.components;
  const { src, ...videoRest } = c.Video.fields ?? {};
  return {
    ...config,
    components: {
      ...c,
      Table: {
        ...c.Table,
        fields: {
          ...c.Table.fields,
          rows: { type: "custom", label: "Cells", render: ({ value, onChange }: { value: unknown; onChange: (v: Cells) => void }) => <TableCells value={value} onChange={onChange} /> },
        },
      },
      Video: { ...c.Video, fields: { src, help: { type: "custom", label: "", render: () => <VideoHelp /> }, ...videoRest } },
    },
  } as unknown as Config<Components>;
}
