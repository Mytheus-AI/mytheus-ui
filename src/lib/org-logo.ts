/**
 * The workspace logo, the pure parts (ADR-0048): what a file must be, the crop geometry, and how the
 * backend's logo URL becomes one an `<img>` can load. No React, no browser APIs, so `npm test`
 * covers it.
 *
 * The backend answers `logo_url` as the gateway-relative, versioned
 * `/api/v1/org/logo/image?v={n}`. An `<img>` cannot send the bearer token, so the web app serves it
 * from its own same-origin route, `/api/org-logo?v={n}` (`app/api/org-logo/route.ts`), which
 * forwards the session. The version makes the URL immutable: a new upload is a new URL.
 */

/** What the picker accepts. SVG is rasterised in the browser before upload (the API refuses SVG). */
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** The square the editor exports: 512 px, WebP where the browser can encode it, PNG otherwise. */
export const LOGO_EXPORT_SIZE = 512;
export const LOGO_MIN_SIDE = 16;

const RASTER = new Set(["image/png", "image/jpeg", "image/webp"]);

export type LogoKind = "raster" | "svg";

/** The kind of file, from its type or (when the browser gives none) its extension. */
export function logoKind(file: { type: string; name: string }): LogoKind | null {
  const type = file.type.toLowerCase();
  if (RASTER.has(type)) return "raster";
  if (type === "image/svg+xml") return "svg";
  if (type) return null;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "raster";
  if (ext === "svg") return "svg";
  return null;
}

/** The message for a file the editor will not take, or null when it is fine. */
export function logoFileError(file: { type: string; name: string; size: number }): string | null {
  if (!logoKind(file)) return "That file is not an image we can use. Choose a PNG, JPEG, WebP or SVG.";
  if (file.size === 0) return "That file is empty. Choose another image.";
  if (file.size > LOGO_MAX_BYTES) return `That image is ${formatBytes(file.size)}. Logos can be up to 2 MB.`;
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** The workspace's initial for the fallback mark: the first letter or digit, uppercased. */
export function orgInitial(name: string): string {
  // The first character that has a case or is a digit (letters in any script, without the
  // `u` flag this tsconfig's target does not allow).
  for (const ch of Array.from(name.trim())) {
    if (/[0-9]/.test(ch) || ch.toLowerCase() !== ch.toUpperCase()) return ch.toLocaleUpperCase();
  }
  // Scripts without case (Chinese, Japanese, Arabic...): the first character that is not
  // punctuation or a symbol.
  const first = Array.from(name.trim()).find((ch) => !/[\s!-/:-@[-`{-~]/.test(ch));
  return first ?? "W";
}

/** The backend's `logo_url` as a same-origin image URL, or undefined when there is no usable logo. */
export function logoSrc(logoUrl: string | null | undefined): string | undefined {
  if (!logoUrl) return undefined;
  const match = /^\/api\/v1\/org\/logo\/image\?v=(\d{1,9})$/.exec(logoUrl);
  return match ? `/api/org-logo?v=${match[1]}` : undefined;
}

/* ---- the crop ---------------------------------------------------------------------------------

   The image is shown in a square viewport of side `view`. At zoom 1 it covers the square exactly
   (the short side fits); zoom enlarges it up to MAX_ZOOM. `x`/`y` are the image's offset from
   centred, in viewport pixels, clamped so the square is always fully covered. */

export const MAX_ZOOM = 4;

export type Crop = { zoom: number; x: number; y: number };

export const CENTRED: Crop = { zoom: 1, x: 0, y: 0 };

/** The image's drawn size in the viewport at this zoom. */
export function drawnSize(natW: number, natH: number, view: number, zoom: number): { w: number; h: number } {
  const cover = view / Math.min(natW, natH);
  return { w: natW * cover * zoom, h: natH * cover * zoom };
}

/** Keep the crop inside the image: zoom within 1..MAX_ZOOM and no uncovered edge. */
export function clampCrop(crop: Crop, natW: number, natH: number, view: number): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, crop.zoom));
  const { w, h } = drawnSize(natW, natH, view, zoom);
  const maxX = Math.max(0, (w - view) / 2);
  const maxY = Math.max(0, (h - view) / 2);
  const clamp = (v: number, m: number) => (m === 0 ? 0 : Math.min(m, Math.max(-m, v)));
  return { zoom, x: clamp(crop.x, maxX), y: clamp(crop.y, maxY) };
}

/** The source rectangle (in the image's own pixels) that the square viewport shows. */
export function sourceRect(crop: Crop, natW: number, natH: number, view: number): { sx: number; sy: number; side: number } {
  const c = clampCrop(crop, natW, natH, view);
  const scale = (view / Math.min(natW, natH)) * c.zoom; // viewport px per image px
  const side = view / scale;
  const sx = natW / 2 - c.x / scale - side / 2;
  const sy = natH / 2 - c.y / scale - side / 2;
  return {
    sx: Math.min(Math.max(0, sx), natW - side),
    sy: Math.min(Math.max(0, sy), natH - side),
    side,
  };
}
