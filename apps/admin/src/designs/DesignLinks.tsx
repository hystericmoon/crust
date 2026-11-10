/**
 * Where the designs are found (F082, design snapshot decision 3, A): the
 * post and blog page designs on the Posts screen, "Page not found" in the
 * Pages list. Each says whether the site uses its own design or the
 * built-in look.
 */
import { designNames, type DesignKind } from "@crust/blocks";
import { useEffect, useId } from "react";
import "./designs.css";
import { loadDesigns, useDesigns } from "./store";

export const designHref = (kind: DesignKind) => `#/design?kind=${kind}`;

/** "Your design" or "Built-in look", for a design's status line. */
export function useDesignStatus(kind: DesignKind): string {
  const { designs, status, unsaved } = useDesigns();
  useEffect(() => {
    void loadDesigns();
  }, []);
  if (status !== "ready") return "";
  if (!designs[kind]) return "Built-in look";
  return unsaved.includes(kind) ? "Your design (kept in this browser)" : "Your design";
}

/** A card on the Posts screen for one design. */
export function DesignCard({ kind, text }: { kind: "post" | "blog"; text: string }) {
  const id = useId();
  const status = useDesignStatus(kind);
  const name = designNames[kind];
  return (
    <section className="st-card" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{name} design</h2>
      <p className="st-lede">{text}</p>
      <p className="dz-status">
        Now: <strong>{status || "…"}</strong>
      </p>
      <p>
        <a className="st-button dz-link" href={designHref(kind)}>
          Design the {name.toLowerCase()}
        </a>
      </p>
    </section>
  );
}
