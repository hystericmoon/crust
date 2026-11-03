/** A small static file server for checks and pictures (serve-static.mjs). */
export function serve(dir: string): Promise<{ url: string; close: () => Promise<void> }>;
