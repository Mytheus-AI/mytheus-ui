/**
 * `GET /api/capture/extension`: downloads the packaged Mytheus Capture extension (the zip
 * `npm run build` writes in `extension/dist/`, copied into the image by the Dockerfile).
 * Signed-in users only (the middleware protects it like every app route). 404 `NOT_BUILT` when
 * this deployment carries no build, which the /capture page shows as such.
 */

import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import { captureConfig } from "../_lib/config";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  let zip: Buffer;
  try {
    zip = await readFile(captureConfig().zipPath);
  } catch {
    return NextResponse.json({ code: "NOT_BUILT" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="mytheus-capture.zip"',
      "Content-Length": String(zip.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
