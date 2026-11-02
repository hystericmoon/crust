/**
 * Header and Footer in Site settings (F031): edited once, shown on every
 * page. Menus are lists with Move up / Move down buttons (no dragging needed)
 * and "Add a page" from the site's pages.
 */
import {
  chromeLimits,
  defaultTopBar,
  footerStarter,
  headerLayoutHelp,
  headerLayoutNames,
  headerLayouts,
  layoutOf,
  menuFromPages,
  type HeaderLayout,
  validateChrome,
  type FooterColumn,
  type MenuLink,
  type SiteChrome,
  type SiteFooter,
  type SiteHeader,
  type SiteTokens,
} from "@crust/blocks";
import { useId, useState } from "react";
import { RadioGroup, StyleTiles } from "../sections/controls";
import { sectionEditorHref } from "../linked/fields";
import { useLinkedSections } from "../linked/store";
import { MenuEditor } from "./MenuEditor";
import { ImageField } from "../media/ImageField";

export interface PageOption {
  path: string;
  title: string;
}

type Props = {
  chrome: SiteChrome;
  onChange: (c: SiteChrome) => void;
  tokens: SiteTokens;
  pages: PageOption[];
};

/** Problems for one part ("header" or "footer"), in the owner's words. */
export function chromeProblems(
  chrome: SiteChrome,
  part: "header" | "footer",
): string[] {
  return validateChrome(chrome)
    .filter((p) => p.path.startsWith(part))
    .map((p) => p.message);
}

function Problems({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <ul className="st-warning st-chrome-problems" role="alert">
      {list.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div className="st-chrome-field">
      <label className="st-field-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="st-input st-textarea"
          value={value}
          rows={3}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="st-input"
          value={value}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? (
        <p className="st-help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="st-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/** A list of links: label, address, move up/down, remove; add a page or a blank link. */
export function LinkListEditor({
  name,
  links,
  onChange,
  max,
  pages,
}: {
  name: string;
  links: MenuLink[];
  onChange: (links: MenuLink[]) => void;
  max: number;
  pages: PageOption[];
}) {
  const id = useId();
  const [message, setMessage] = useState("");
  const unused = pages.filter((p) => !links.some((l) => l.href === p.path));
  const [pick, setPick] = useState("");
  const set = (i: number, patch: Partial<MenuLink>) =>
    onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
    setMessage(
      `${links[i]!.label || "Link"} moved to position ${j + 1} of ${links.length}.`,
    );
    requestAnimationFrame(() =>
      document.getElementById(`${id}-${j}-${by < 0 ? "up" : "down"}`)?.focus(),
    );
  };
  const full = links.length >= max;
  return (
    <div className="st-links" role="group" aria-labelledby={`${id}-name`}>
      <span className="st-field-label" id={`${id}-name`}>
        {name}
      </span>
      {links.length ? (
        <ol className="st-link-list">
          {links.map((l, i) => (
            <li key={i} className="st-link-row">
              <label className="st-sr" htmlFor={`${id}-${i}-label`}>
                {name} link {i + 1}: label
              </label>
              <input
                id={`${id}-${i}-label`}
                className="st-input"
                placeholder="Label"
                value={l.label}
                onChange={(e) => set(i, { label: e.target.value })}
              />
              <label className="st-sr" htmlFor={`${id}-${i}-href`}>
                {name} link {i + 1}: address
              </label>
              <input
                id={`${id}-${i}-href`}
                className="st-input"
                placeholder="/about or https://…"
                value={l.href}
                onChange={(e) => set(i, { href: e.target.value })}
              />
              <span className="st-link-actions">
                <button
                  type="button"
                  id={`${id}-${i}-up`}
                  className="st-icon-button"
                  disabled={i === 0}
                  aria-label={`Move ${l.label || `link ${i + 1}`} up`}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  id={`${id}-${i}-down`}
                  className="st-icon-button"
                  disabled={i === links.length - 1}
                  aria-label={`Move ${l.label || `link ${i + 1}`} down`}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="st-icon-button"
                  aria-label={`Remove ${l.label || `link ${i + 1}`}`}
                  onClick={() => {
                    onChange(links.filter((_, j) => j !== i));
                    setMessage(`${l.label || "Link"} removed.`);
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="st-help">No links yet.</p>
      )}
      <div className="st-link-add">
        {unused.length ? (
          <>
            <label className="st-sr" htmlFor={`${id}-pick`}>
              Page to add to {name}
            </label>
            <select
              id={`${id}-pick`}
              className="st-input"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              disabled={full}
            >
              <option value="">Choose a page…</option>
              {unused.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.title} ({p.path})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="st-button"
              disabled={full || !pick}
              onClick={() => {
                const page = pages.find((p) => p.path === pick);
                if (!page) return;
                const label =
                  page.path === "/"
                    ? "Home"
                    : page.title.slice(0, chromeLimits.label);
                onChange([...links, { label, href: page.path }]);
                setPick("");
                setMessage(`${label} added.`);
              }}
            >
              Add page
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="st-button"
          disabled={full}
          onClick={() => onChange([...links, { label: "", href: "" }])}
        >
          Add a link
        </button>
      </div>
      {full ? (
        <p className="st-help">That's the most this list can hold ({max}).</p>
      ) : null}
      <p className="st-sr" role="status">
        {message}
      </p>
    </div>
  );
}

export function HeaderOptions({ chrome, onChange, tokens, pages }: Props) {
  const h = chrome.header;
  const set = (patch: Partial<SiteHeader>) =>
    onChange({ ...chrome, header: { ...h, ...patch } });
  return (
    <>
      <Check
        label="Show a header on every page"
        checked={h.show}
        onChange={(show) => set({ show })}
      />
      <div className="st-chrome-body" hidden={!h.show}>
        <fieldset className="st-fieldset">
          <legend className="st-field-label">Logo</legend>
          <TextField
            label="Name"
            value={h.logo.text}
            onChange={(text) => set({ logo: { ...h.logo, text } })}
            hint="Shown when there's no logo image, and links to the home page."
          />
          <ImageField
            label="Logo image (optional)"
            value={h.logo.imageSrc}
            onChange={(imageSrc) => set({ logo: { ...h.logo, imageSrc } })}
            onPick={(imageSrc, imageAlt) =>
              set({ logo: { ...h.logo, imageSrc, imageAlt } })
            }
          />
          {h.logo.imageSrc.trim() ? (
            <TextField
              label="Logo description"
              value={h.logo.imageAlt}
              onChange={(imageAlt) => set({ logo: { ...h.logo, imageAlt } })}
              hint={`What the logo says, for people who can't see it, e.g. "Haho Studio".`}
            />
          ) : null}
        </fieldset>
        <LayoutPicker
          value={layoutOf(h)}
          onChange={(layout) => set({ layout })}
        />
        <MenuEditor
          menu={h.menu}
          onChange={(menu) => set({ menu })}
          pages={pages}
        />
        <button
          type="button"
          className="st-button st-link-reset"
          onClick={() => set({ menu: menuFromPages(pages) })}
        >
          Rebuild the menu from my pages
        </button>
        <fieldset className="st-fieldset">
          <legend className="st-field-label">
            Button at the end (optional)
          </legend>
          <TextField
            label="Button label"
            value={h.cta.label}
            onChange={(label) => set({ cta: { ...h.cta, label } })}
            hint="Leave empty for no button."
          />
          <TextField
            label="Button link"
            value={h.cta.href}
            onChange={(href) => set({ cta: { ...h.cta, href } })}
          />
        </fieldset>
        <Check
          label="Keep the header at the top while scrolling"
          checked={h.sticky}
          onChange={(sticky) => set({ sticky })}
        />
        <Check
          label="Clear on a hero photo"
          checked={!!h.overHero}
          onChange={(overHero) => set({ overHero })}
        />
        <p className="st-help">
          On every page that starts with a photo or video section, the header
          sits on it in that section's colours (its tint keeps the words
          readable). Other pages keep the solid header. A single section can
          still ask for it in its Style tab.
        </p>
        <Check
          label="Show a Search link (site search)"
          checked={!!h.search}
          onChange={(search) => set({ search })}
        />
        <div className="st-chrome-field">
          <span className="st-field-label" aria-hidden="true">
            Header style
          </span>
          <StyleTiles
            tokens={tokens}
            label="Header style"
            value={h.style}
            onChange={(style) => set({ style })}
          />
        </div>
        <TopBarFields
          header={h}
          onChange={(topBar) => set({ topBar })}
          tokens={tokens}
        />
        <p className="st-help">
          On phones the menu folds into a Menu button that opens without
          JavaScript
          {layoutOf(h) !== "classic" || h.menu.some((l) => l.children?.length)
            ? ", as a panel from the side"
            : ""}
          .
        </p>
      </div>
      <Problems list={chromeProblems(chrome, "header")} />
    </>
  );
}

export function FooterOptions({ chrome, onChange, tokens, pages }: Props) {
  const f = chrome.footer;
  const set = (patch: Partial<SiteFooter>) =>
    onChange({ ...chrome, footer: { ...f, ...patch } });
  const setColumn = (i: number, patch: Partial<FooterColumn>) =>
    set({
      columns: f.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  return (
    <>
      <Check
        label="Show a footer on every page"
        checked={f.show}
        onChange={(show) => set({ show })}
      />
      <div className="st-chrome-body" hidden={!f.show}>
        <FooterKind
          chrome={chrome}
          onChange={onChange}
          siteName={chrome.header.logo.text}
        />
        {f.kind === "blocks" ? null : (
          <>
            <TextField
              label="Short text (optional)"
              value={f.text}
              onChange={(text) => set({ text })}
              multiline
              hint="A line about you, shown first."
            />
            {f.columns.map((c, i) => (
              <fieldset className="st-fieldset" key={i}>
                <legend className="st-field-label">Column {i + 1}</legend>
                <TextField
                  label="Column title"
                  value={c.title}
                  onChange={(title) => setColumn(i, { title })}
                />
                <LinkListEditor
                  name={c.title || `Column ${i + 1}`}
                  links={c.links}
                  onChange={(links) => setColumn(i, { links })}
                  max={chromeLimits.links}
                  pages={pages}
                />
                <button
                  type="button"
                  className="st-button"
                  onClick={() =>
                    set({ columns: f.columns.filter((_, j) => j !== i) })
                  }
                >
                  Remove column {i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className="st-button"
              disabled={f.columns.length >= chromeLimits.columns}
              onClick={() =>
                set({ columns: [...f.columns, { title: "", links: [] }] })
              }
            >
              Add a column of links
            </button>
          </>
        )}
        <TextField
          label="Copyright line"
          value={f.copyright}
          onChange={(copyright) => set({ copyright })}
          hint="{year} and {name} are filled in when you publish."
        />
        <div className="st-chrome-field">
          <span className="st-field-label" aria-hidden="true">
            Footer style
          </span>
          <StyleTiles
            tokens={tokens}
            label="Footer style"
            value={f.style}
            onChange={(style) => set({ style })}
          />
        </div>
      </div>
      <Problems list={chromeProblems(chrome, "footer")} />
    </>
  );
}

// --- F076 ---------------------------------------------------------------------------------

/** Where the logo (L), menu (=) and button (B) sit in each layout's picture. */
const layoutPictures: Record<HeaderLayout, string[][]> = {
  classic: [["L", "", "=", "B"]],
  centred: [["L", "", "=", "", "B"]],
  stacked: [
    ["", "L", ""],
    ["", "=", ""],
  ],
  split: [["=", "", "L", "", "="]],
  left: [["L", "=", "", "B"]],
  button: [["L", "", "B", "M"]],
};

export function LayoutPicker({
  value,
  onChange,
}: {
  value: HeaderLayout;
  onChange: (l: HeaderLayout) => void;
}) {
  return (
    <div className="st-chrome-field">
      <span className="st-field-label" aria-hidden="true">
        Layout
      </span>
      <RadioGroup<HeaderLayout>
        label="Header layout"
        className="st-options st-layouts"
        optionClass="st-option"
        value={value}
        onChange={onChange}
        options={headerLayouts.map((l) => ({
          value: l,
          label: `${headerLayoutNames[l]}: ${headerLayoutHelp[l]}`,
          content: (
            <>
              <span className="st-option-pic st-layout-pic" aria-hidden="true">
                {layoutPictures[l].map((r, i) => (
                  <span key={i} className="st-layout-row">
                    {r.map((cell, j) =>
                      cell ? (
                        <i
                          key={j}
                          className={`is-${cell === "=" ? "menu" : cell === "L" ? "logo" : cell === "B" ? "button" : "burger"}`}
                        />
                      ) : (
                        <span key={j} className="st-layout-gap" />
                      ),
                    )}
                  </span>
                ))}
              </span>
              <span className="st-option-name">{headerLayoutNames[l]}</span>
            </>
          ),
        }))}
      />
      <p className="st-help">{headerLayoutHelp[value]}</p>
    </div>
  );
}

function TopBarFields({
  header,
  onChange,
  tokens,
}: {
  header: SiteHeader;
  onChange: (t: NonNullable<SiteHeader["topBar"]>) => void;
  tokens: SiteTokens;
}) {
  const t = { ...defaultTopBar, ...header.topBar };
  const set = (patch: Partial<typeof t>) => onChange({ ...t, ...patch });
  return (
    <fieldset className="st-fieldset">
      <legend className="st-field-label">Top bar (optional)</legend>
      <Check
        label="Show a thin bar above the header"
        checked={t.show}
        onChange={(show) => set({ show })}
      />
      {t.show ? (
        <>
          <TextField
            label="Message"
            value={t.text}
            onChange={(text) => set({ text })}
            hint="Short, e.g. “Free delivery on orders over €50”."
          />
          <TextField
            label="Link label (optional)"
            value={t.link.label}
            onChange={(label) => set({ link: { ...t.link, label } })}
          />
          {t.link.label.trim() ? (
            <TextField
              label="Link address"
              value={t.link.href}
              onChange={(href) => set({ link: { ...t.link, href } })}
            />
          ) : null}
          <TextField
            label="Phone or email (optional)"
            value={t.contact}
            onChange={(contact) => set({ contact })}
            hint="Shown on the right. A phone number or email address becomes a link."
          />
          <div className="st-chrome-field">
            <span className="st-field-label" aria-hidden="true">
              Top bar style
            </span>
            <StyleTiles
              tokens={tokens}
              label="Top bar style"
              value={t.style}
              onChange={(style) => set({ style })}
            />
          </div>
        </>
      ) : null}
    </fieldset>
  );
}

/** F076: the footer as the simple columns, or built from blocks (a linked section). */
function FooterKind({
  chrome,
  onChange,
  siteName,
}: {
  chrome: SiteChrome;
  onChange: (c: SiteChrome) => void;
  siteName: string;
}) {
  const f = chrome.footer;
  const set = (patch: Partial<SiteFooter>) =>
    onChange({ ...chrome, footer: { ...f, ...patch } });
  const linked = useLinkedSections();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();
  const kind = f.kind ?? "simple";
  const current = f.section ? linked.get(f.section) : undefined;
  const make = async () => {
    setBusy(true);
    setStatus("Making the footer section…");
    const taken = new Set((linked.sections ?? []).map((s) => s.name));
    const name = taken.has("Footer") ? `Footer ${taken.size + 1}` : "Footer";
    const made = await linked.create(name, footerStarter(f, siteName) as never);
    setBusy(false);
    if (typeof made === "string") setStatus(made);
    else {
      set({ kind: "blocks", section: made.id });
      setStatus(
        `Made the linked section “${made.name}” from your footer. Save the site settings, then edit its blocks.`,
      );
    }
  };
  return (
    <div className="st-chrome-field">
      <span className="st-field-label" aria-hidden="true">
        Footer kind
      </span>
      <RadioGroup<"simple" | "blocks">
        label="Footer kind"
        className="st-options st-footer-kind"
        optionClass="st-option"
        value={kind}
        onChange={(k) => set({ kind: k })}
        options={[
          {
            value: "simple",
            label: "Simple: text, columns of links and a copyright line",
          },
          {
            value: "blocks",
            label: "Built from blocks: a linked section, edited in the builder",
          },
        ]}
      />
      {kind === "blocks" ? (
        <div className="st-footer-blocks">
          <label className="st-field-label" htmlFor={`${id}-section`}>
            Linked section to use
          </label>
          <select
            id={`${id}-section`}
            className="st-input"
            value={f.section ?? ""}
            onChange={(e) => set({ section: e.target.value || undefined })}
            disabled={linked.sections === null}
          >
            <option value="">
              {linked.sections === null
                ? "Loading…"
                : "Choose a linked section…"}
            </option>
            {(linked.sections ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="st-link-add">
            <button
              type="button"
              className="st-button"
              disabled={busy}
              onClick={make}
            >
              Make one from my simple footer
            </button>
            {current ? (
              <a
                className="st-button st-link-button"
                href={sectionEditorHref(current.id, "#/settings")}
              >
                Edit “{current.name}” in the builder
              </a>
            ) : null}
          </div>
          <p className="st-help">
            The section's blocks show at the foot of every page; editing it once
            updates them all. The copyright line below stays under it. The
            simple footer's columns are kept in case you switch back.
          </p>
        </div>
      ) : null}
      <p className="st-sr" role="status">
        {status}
      </p>
      {status && !busy ? <p className="st-help">{status}</p> : null}
    </div>
  );
}
