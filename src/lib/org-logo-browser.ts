/* Browser-only image work for the workspace logo, shared by the logo editor (OrgLogoCard) and the
   create-a-workspace form: load an image, rasterise an SVG, and export a square crop at the size
   the API takes. Moved out of OrgLogoCard unchanged. Call only from client code. */

import { LOGO_EXPORT_SIZE, LOGO_MAX_BYTES, sourceRect, type Crop } from "@/lib/org-logo";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

export function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** An SVG drawn to a canvas, short side at least 1024 px, so it crops like any image. */
export async function rasteriseSvg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w0 = img.naturalWidth || 512;
    const h0 = img.naturalHeight || 512;
    const scale = Math.max(1, 1024 / Math.min(w0, h0));
    const w = Math.round(Math.min(4096, w0 * scale));
    const h = Math.round(Math.min(4096, h0 * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasBlob(canvas, "image/png");
    if (!blob) throw new Error("encode");
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}


/** A square crop of an image as a 512 px logo: WebP, else PNG; JPEG at the end if PNG would pass
    the limit. `view` is the editor's viewport size the crop is measured in. */
export async function exportSquare(src: string, natW: number, natH: number, crop: Crop, view: number): Promise<Blob> {
  const img = await loadImage(src);
  const { sx, sy, side } = sourceRect(crop, natW, natH, view);
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_EXPORT_SIZE;
  canvas.height = LOGO_EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, LOGO_EXPORT_SIZE, LOGO_EXPORT_SIZE);
  const webp = await canvasBlob(canvas, "image/webp", 0.92);
  if (webp && webp.type === "image/webp" && webp.size <= LOGO_MAX_BYTES) return webp;
  const png = await canvasBlob(canvas, "image/png");
  if (png && png.size <= LOGO_MAX_BYTES) return png;
  const jpeg = await canvasBlob(canvas, "image/jpeg", 0.9);
  if (jpeg) return jpeg;
  throw new Error("encode");
}
