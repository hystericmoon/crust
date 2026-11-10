/** Site settings → Site address (F044): the site's own domain. */
import { normalizeSiteAddress, siteHost } from "@crust/blocks";
import { useEffect, useState } from "react";
import { H } from "./heading";

export const CUSTOM_DOMAIN_GUIDE = "https://github.com/hystericmoon/crust/blob/main/docs/setup-custom-domain.md";

export function SiteAddressGroup({
  value,
  onChange,
  onValidity,
}: {
  /** site.json's baseUrl (the placeholder while no address is set). */
  value: string;
  onChange: (baseUrl: string) => void;
  onValidity: (field: string, valid: boolean) => void;
}) {
  const id = "site-address";
  const [raw, setRaw] = useState(() => siteHost(value));
  const result = normalizeSiteAddress(raw);
  const host = result.ok ? siteHost(result.url) : "";

  // Discard (or a saved change elsewhere) puts the field back.
  useEffect(() => {
    setRaw((r) => {
      const now = normalizeSiteAddress(r);
      return now.ok && now.url === value ? r : siteHost(value);
    });
  }, [value]);
  useEffect(() => onValidity(id, result.ok), [result.ok, onValidity]);

  const describedBy = [`${id}-hint`, result.ok ? null : `${id}-error`].filter(Boolean).join(" ");
  return (
    <>
      <p className="st-lede">
        The address people type to visit your site, like studio.com. Leave it empty to keep the free address Cloudflare gave you.
      </p>
      <div className="sa-field">
        <label className="st-field-label" htmlFor={id}>
          Domain
        </label>
        <span className="sa-input">
          <span className="sa-prefix" aria-hidden="true">
            https://
          </span>
          <input
            id={id}
            className="st-input"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="studio.com"
            value={raw}
            aria-invalid={!result.ok || undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setRaw(e.target.value);
              const next = normalizeSiteAddress(e.target.value);
              if (next.ok) onChange(next.url);
            }}
            onBlur={() => {
              // Tidy what was typed ("https://Studio.com/" → "studio.com").
              if (result.ok) setRaw(host);
            }}
          />
        </span>
        <p className="st-help" id={`${id}-hint`}>
          {!result.ok ? (
            "For example studio.com or www.studio.com."
          ) : host ? (
            <>
              Your pages will be at <span className="sa-example">https://{host}/about</span>.
            </>
          ) : (
            "With no domain, your site stays at its free .pages.dev address."
          )}
        </p>
        {result.ok ? null : (
          <p className="st-error" id={`${id}-error`}>
            {result.message}
          </p>
        )}
      </div>

      <div className="sa-steps">
        <H level={3}>Before you set it</H>
        <ol>
          <li>Buy the domain (any registrar works; Cloudflare's own sells at cost).</li>
          <li>Connect it to your site in Cloudflare. The guide walks you through it in about 15 minutes.</li>
          <li>Enter it here, Save, then Publish.</li>
        </ol>
        <p className="st-help">
          Until Cloudflare says the domain is connected, publishing keeps using the free address, so links never point somewhere
          that doesn't open. The Publish panel tells you when that happens.
        </p>
        <a className="st-button st-link-button" href={CUSTOM_DOMAIN_GUIDE} target="_blank" rel="noreferrer">
          Open the custom domain guide<span className="st-sr"> (opens in a new tab)</span>
        </a>
      </div>

      <div className="sa-uses">
        <H level={3}>Where it's used</H>
        <ul>
          <li>Links in Google and other search results</li>
          <li>The sitemap and robots.txt search engines read</li>
          <li>Link previews when a page is shared</li>
          <li>Your blog's RSS feed</li>
          <li>The "Open live site" button</li>
        </ul>
      </div>
    </>
  );
}
