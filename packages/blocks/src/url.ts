/**
 * Allows only safe link and image URLs: http(s), mailto, tel, relative paths
 * and in-page anchors. Anything else (e.g. `javascript:`) becomes "#".
 */
export function safeUrl(input: string | undefined | null): string {
  const url = (input ?? "").trim();
  if (url === "") return "#";
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("./") || url.startsWith("../")) {
    return url.startsWith("//") ? "#" : url;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  if (scheme === undefined) return url; // relative like "about" or "page.html"
  return ["http", "https", "mailto", "tel"].includes(scheme) ? url : "#";
}
