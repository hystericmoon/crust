/**
 * The Map block's pin (F079): "Find on the map" looks the address up on
 * OpenStreetMap; or paste a Google Maps / Apple Maps / OpenStreetMap link,
 * or coordinates. The result is said in words with a link to check it, so
 * a wrong match is easy to spot (visibility of system status).
 */
import { cleanPin, mapPageUrl, pinFromText, type MapPin } from "@crust/blocks";
import { useId, useState } from "react";
import { findAddress, type Found } from "./geocode";

export interface MapPinFieldProps {
  value: unknown;
  onChange: (pin: MapPin | null) => void;
  /** The block's address, for Find. */
  address: string;
  /** For tests. */
  find?: (address: string) => Promise<Found | null>;
}

export function MapPinField({ value, onChange, address, find = findAddress }: MapPinFieldProps) {
  const id = useId();
  const pin = cleanPin(value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; warning?: boolean } | null>(null);
  const [pasted, setPasted] = useState("");

  const onFind = async () => {
    if (!address.trim()) {
      setMessage({ text: "Type the address above first.", warning: true });
      return;
    }
    setBusy(true);
    setMessage({ text: "Looking for the address…" });
    try {
      const found = await find(address);
      if (found) {
        onChange(found.pin);
        setMessage({ text: `Found: ${found.label}. Check it's the right place with the link below.` });
      } else setMessage({ text: "OpenStreetMap couldn't find this address. Try the street and city only, or paste a Google Maps link below.", warning: true });
    } catch {
      setMessage({ text: "The map search can't be reached right now. Try again in a moment, or paste a Google Maps link below.", warning: true });
    } finally {
      setBusy(false);
    }
  };

  const onUse = () => {
    const p = pinFromText(pasted);
    if (!p) {
      setMessage({ text: "That link doesn't hold a place. In Google Maps, open the place, press Share, copy the link and paste it here; or paste coordinates such as -6.2607, 106.8136.", warning: true });
      return;
    }
    onChange(p);
    setPasted("");
    setMessage({ text: "Pin placed from the link." });
  };

  return (
    <div className="tv-notes mp-field">
      <span className="tv-label">Map pin</span>
      <p className="tv-hint">{pin ? `Pin at ${pin.lat}, ${pin.lng}.` : "No pin yet: visitors see the address and Directions, without a map."}</p>
      <div className="tv-actions">
        <button type="button" className="tv-btn" onClick={onFind} disabled={busy}>
          {busy ? "Finding…" : "Find on the map"}
        </button>
        {pin ? (
          <>
            <a className="tv-btn mp-link" href={mapPageUrl(pin)} target="_blank" rel="noreferrer noopener">
              Check on OpenStreetMap<span className="tv-sr"> (opens in a new tab)</span>
            </a>
            <button
              type="button"
              className="tv-btn"
              onClick={() => {
                onChange(null);
                setMessage({ text: "Pin removed." });
              }}
            >
              Remove pin
            </button>
          </>
        ) : null}
      </div>
      <label className="tv-hint" htmlFor={`${id}-paste`}>
        Or paste a Google Maps link or coordinates
      </label>
      <div className="mp-paste">
        <input
          id={`${id}-paste`}
          className="tv-cell"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onUse();
            }
          }}
          placeholder="https://maps.google.com/…"
        />
        <button type="button" className="tv-btn" onClick={onUse} disabled={!pasted.trim()}>
          Use this
        </button>
      </div>
      <p role="status" className={message?.warning ? "ic-note is-warning" : "ic-note"}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
