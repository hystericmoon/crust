/**
 * Stand-in images for the starter templates (F049–F051): calm, flat
 * compositions in each template's own colours, made here as PNG files so
 * the templates carry no one else's photos. Every one is marked
 * "Replace me" where it's used, and its description says it's a stand-in.
 */
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** An RGB image as PNG bytes. `pixel(x, y)` returns [r, g, b]. */
export function png(width: number, height: number, pixel: (x: number, y: number) => readonly [number, number, number]): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const header = new Uint8Array(13);
  const h = new DataView(header.buffer);
  h.setUint32(0, width);
  h.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as readonly [number, number, number];

export type Composition = "horizon" | "arches" | "blocks" | "stairs" | "window" | "dunes";

/**
 * One flat composition: shapes only, three colours. Deterministic, so a
 * rebuilt template is byte-for-byte the same.
 */
export function standIn(kind: Composition, colors: [string, string, string], width = 1200, height = 800): Uint8Array {
  const [a, b, c] = colors.map(rgb) as [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
  const w = width;
  const hh = height;
  return png(w, hh, (x, y) => {
    const u = x / w;
    const v = y / hh;
    switch (kind) {
      case "horizon":
        if (v > 0.62) return c;
        return (u - 0.7) ** 2 + ((v - 0.42) * 1.5) ** 2 < 0.012 ? b : a;
      case "arches": {
        const col = Math.floor(u * 3);
        const cx = (col + 0.5) / 3;
        const inArch = Math.abs(u - cx) < 0.11 && (v > 0.45 || (u - cx) ** 2 + ((v - 0.45) * 1.5) ** 2 < 0.0121);
        return v > 0.85 ? c : inArch ? b : a;
      }
      case "blocks":
        if (u > 0.08 && u < 0.46 && v > 0.18 && v < 0.82) return b;
        if (u > 0.54 && u < 0.92 && v > 0.18 && v < 0.5) return c;
        if (u > 0.54 && u < 0.92 && v > 0.56 && v < 0.82) return b;
        return a;
      case "stairs":
        return v > 1 - Math.floor(u * 5 + 1) / 6 ? b : v > 0.9 ? c : a;
      case "window":
        if (u > 0.3 && u < 0.7 && v > 0.15 && v < 0.85) return Math.abs(u - 0.5) < 0.006 || Math.abs(v - 0.5) < 0.008 ? c : b;
        return a;
      case "dunes":
        if (v > 0.55 + 0.08 * Math.sin(u * 6.3)) return c;
        if (v > 0.4 + 0.06 * Math.sin(u * 4.1 + 1)) return b;
        return a;
    }
  });
}

export const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
