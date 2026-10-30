/**
 * Gets a photo ready to upload (F034): checks its type and size, then
 * redraws it at most 2400 px on the long side. Redrawing also turns the
 * photo the right way up and leaves out hidden details such as where a phone
 * photo was taken.
 */
import { fitWithin, mediaLimits, MAX_EDGE, type MediaExt } from "@crust/blocks";

const accepted: Record<string, MediaExt> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const ACCEPT = Object.keys(accepted).join(",");

/** Plain-language reason a file can't be uploaded, or null. */
export function checkPickedFile(file: { name: string; type: string; size: number }): string | null {
  if (!accepted[file.type]) {
    return /\.(heic|heif)$/i.test(file.name)
      ? `${file.name}: iPhone HEIC photos can't be used on websites yet. On the iPhone, choose "Most Compatible" in Settings > Camera > Formats, or share the photo as JPG.`
      : `${file.name}: only JPG, PNG and WebP photos can be uploaded.`;
  }
  if (file.size > mediaLimits.pickBytes) return `${file.name}: this photo is over ${mediaLimits.pickBytes / 1024 / 1024} MB.`;
  return null;
}

/** Which format a redrawn photo is saved in. PNG keeps transparency; everything else becomes JPG. */
export const outputType = (ext: MediaExt) => (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export type Prepared = { ok: true; name: string; base64: string; width: number; height: number } | { ok: false; error: string };

export async function prepareUpload(file: File): Promise<Prepared> {
  const problem = checkPickedFile(file);
  if (problem) return { ok: false, error: problem };
  const ext = accepted[file.type]!;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, error: `${file.name}: this file couldn't be opened as a photo.` };
  }
  const size = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
  // A PNG that's already small enough is sent as it is: redrawing can make it bigger.
  if (ext === "png" && size.width === bitmap.width && size.height === bitmap.height && file.size <= mediaLimits.uploadBytes) {
    bitmap.close();
    return { ok: true, name: file.name, base64: await toBase64(file), ...size };
  }
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, error: `${file.name}: this browser couldn't resize the photo.` };
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  let blob = await encode(outputType(ext));
  // Safari can't write WebP and quietly hands back a PNG: use JPG instead.
  if (blob && blob.type !== outputType(ext)) blob = await encode("image/jpeg");
  if (!blob) return { ok: false, error: `${file.name}: this browser couldn't resize the photo.` };
  if (blob.size > mediaLimits.uploadBytes) return { ok: false, error: `${file.name}: still over ${mediaLimits.uploadBytes / 1024 / 1024} MB after shrinking.` };
  return { ok: true, name: file.name, base64: await toBase64(blob), ...size };
}
