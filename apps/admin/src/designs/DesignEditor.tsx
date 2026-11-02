/**
 * The post page, blog page and "Page not found" designs in the builder
 * (F082, design snapshot A, design/f082-page-designs-v1.html). The builder
 * with the design's blocks; the blocks that fill themselves in show the
 * newest post (or samples), and "Post content" shows that post's own
 * blocks, read only.
 */
import { currentDesign, designBlocksFor, designNames, migrateRichTextBlocks, PageDesignContext, sortPosts, type Components, type DesignKind, type DesignPost, type PageDesignData, type Post } from "@crust/blocks";
import { renderPreview } from "@crust/render";
import { Puck, useGetPuck, type Config, type Data, type Overrides } from "@puckeditor/core";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { saveFailed, saveMessage } from "../save-messages";
import { LayoutsButton } from "../layouts/LayoutGallery";
import { MyLayoutsProvider } from "../layouts/mine";
import { PlaceholderChecklist } from "../placeholders/Checklist";
import { loadPost, loadPostRows } from "../posts/store";
import { SaveStatus, useSaveStatus } from "../save-status";
import { DesignKindContext } from "./context";
import { forgetDesign, loadDesigns, storeDesign, useDesigns } from "./store";

export { DesignKindContext };

/** Where Back goes, and what it's called. */
const backFor = (kind: DesignKind) => (kind === "notFound" ? { href: "#/", label: "Pages" } : { href: "#/posts", label: "Posts" });

/** Blocks that are whole sections themselves can't go inside a section or column. */
const NOT_IN_SLOTS = ["PostContent", "PostHero"];

/** The editor's config for one design: its own blocks listed, slot rules, the 404's title. */
export function withDesignEditing(config: Config<Components>, kind: DesignKind): Config<Components> {
  const mine = new Set(designBlocksFor(kind));
  const categories = Object.fromEntries(
    Object.entries(config.categories ?? {}).map(([name, cat]) => {
      if (name !== "post" && name !== "blog") return [name, cat];
      // One group per design ("Post list" is in both, so it shows once).
      const components = (cat.components ?? []).filter((c) => mine.has(c as string));
      return [name, { ...cat, components, visible: name === kind && components.length > 0 }];
    }),
  );
  type FieldMap = Record<string, { type: string; disallow?: string[] }>;
  const ruled = (fields: FieldMap): FieldMap =>
    Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f?.type === "slot" ? { ...f, disallow: [...new Set([...(f.disallow ?? []), ...NOT_IN_SLOTS])] } : f]));
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      const fields = comp.fields as FieldMap | undefined;
      if (!fields || !Object.values(fields).some((f) => f?.type === "slot")) return [name, comp];
      // The settings tabs work their fields out each time (resolveFields): the rule goes there too.
      const resolve = (comp as { resolveFields?: (...a: unknown[]) => unknown }).resolveFields;
      const resolveFields = resolve ? async (...a: unknown[]) => ruled((await resolve(...a)) as FieldMap) : undefined;
      return [name, { ...comp, fields: ruled(fields), ...(resolveFields ? { resolveFields } : {}) }];
    }),
  );
  const root = config.root ?? {};
  return {
    ...config,
    categories,
    components,
    root: {
      ...root,
      fields: kind === "notFound" ? { title: { type: "text", label: "Page title (browser tab)" } } : {},
    },
  } as Config<Components>;
}

const summaryOf = ({ slug, title, description, date, cover, coverAlt }: Post | DesignPost): DesignPost => ({ slug, title, description, date, cover, coverAlt });

/** The newest post (with its blocks drawn read only) and every post, for the canvas. */
function usePreviewData(githubOn: boolean): PageDesignData | null {
  const [data, setData] = useState<PageDesignData | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const { rows, blog } = await loadPostRows(githubOn);
      const posts = sortPosts(rows.map(summaryOf));
      const newest = posts[0] ? await loadPost(posts[0].slug, githubOn) : null;
      if (!live) return;
      // Without posts the blocks show their samples.
      if (!posts.length) return setData(null);
      let body: ReactNode = undefined;
      if (newest) {
        let html = "";
        try {
          html = renderPreview({ root: { props: {} }, content: migrateRichTextBlocks(newest.puck.content) });
        } catch {
          html = "";
        }
        // A picture of the post's own blocks: edited in the post, not here.
        body = <div className="dz-post-preview" inert dangerouslySetInnerHTML={{ __html: html }} />;
      }
      setData({ post: newest ? summaryOf(newest) : posts[0], posts, blog, language: document.documentElement.lang || "en", ...(body ? { body } : {}) });
    })();
    return () => {
      live = false;
    };
  }, [githubOn]);
  return data;
}

function SaveButton({ onSave }: { onSave: (data: Data) => void }) {
  const getPuck = useGetPuck();
  return (
    <button type="button" className="crust-save" onClick={() => onSave(getPuck().appState.data as Data)}>
      Save design
    </button>
  );
}

interface Props {
  kind: DesignKind;
  githubOn: boolean;
  /** The page builder's config (withDesignEditing is applied here). */
  config: Config<Components>;
  overrides?: Partial<Overrides>;
  language: string;
}

export function DesignEditor({ kind, githubOn, config, overrides, language }: Props) {
  const designs = useDesigns();
  const status = useSaveStatus();
  const preview = usePreviewData(githubOn);
  const dirty = useRef(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    void loadDesigns();
  }, []);

  const name = designNames[kind];
  const saved = designs.designs[kind];
  const designConfig = useMemo(() => withDesignEditing(config, kind), [config, kind]);
  // Today's look until a design is saved, so the first edit starts from what visitors see.
  const data = useMemo<Data | null>(
    () =>
      designs.status === "ready"
        ? { root: { props: kind === "notFound" ? { title: saved?.title ?? "" } : {} }, content: migrateRichTextBlocks(saved?.content ?? currentDesign(kind)) }
        : null,
    [designs.status, kind], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!data) return <p className="ls-note" style={{ padding: 24 }}>Loading the {name.toLowerCase()} design…</p>;

  const save = async (next: Data) => {
    status.saving();
    const title = kind === "notFound" ? String((next.root.props as { title?: string } | undefined)?.title ?? "") : undefined;
    const res = await storeDesign(kind, next.content, title);
    if ("problems" in res) {
      status.show(`Not saved: ${res.problems.join(" ")}`, true);
      return;
    }
    dirty.current = false;
    status.show(saveMessage(res.result, res.local, `The ${name.toLowerCase()} design`), saveFailed(res.result), () => void save(next));
  };

  const reset = async () => {
    setConfirmReset(false);
    status.saving();
    const res = await forgetDesign(kind);
    if (!res.ok && !res.notConfigured) {
      status.show(`Couldn't go back to the built-in look: ${res.error}`, true);
      return;
    }
    location.hash = backFor(kind).href;
  };

  const back = backFor(kind);
  const value: PageDesignData | null = preview ? { ...preview, language } : null;

  return (
    <DesignKindContext.Provider value={kind}>
      <PageDesignContext.Provider value={value}>
        <MyLayoutsProvider githubOn={githubOn}>
          <Puck
            config={designConfig as Config}
            data={data}
            headerTitle={`${name} design`}
            overrides={{
              ...overrides,
              headerActions: () => (
                <>
                  <span className="ls-editing">{kind === "notFound" ? "Shown for addresses with no page" : kind === "post" ? "Every post looks like this" : "The list of posts at /blog/"}</span>
                  <a className="crust-header-link" href={back.href}>
                    {back.label}
                  </a>
                  <LayoutsButton />
                  <PlaceholderChecklist />
                  {saved ? (
                    confirmReset ? (
                      <span className="dz-confirm" role="group" aria-label="Use the built-in look?">
                        <button type="button" className="crust-header-link" onClick={() => void reset()}>
                          Yes, use the built-in look
                        </button>
                        <button type="button" className="crust-header-link" onClick={() => setConfirmReset(false)}>
                          Keep my design
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="crust-header-link" onClick={() => setConfirmReset(true)}>
                        Use the built-in look
                      </button>
                    )
                  ) : null}
                  <SaveButton onSave={(d) => void save(d)} />
                </>
              ),
            }}
            onPublish={(d) => void save(d)}
            onChange={() => {
              dirty.current = true;
            }}
          />
          <SaveStatus note={status.note} onDismiss={status.clear} />
        </MyLayoutsProvider>
      </PageDesignContext.Provider>
    </DesignKindContext.Provider>
  );
}
