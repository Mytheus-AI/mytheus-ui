// Run: npm test
// The workspace logo's pure parts (ADR-0047): which files the editor takes, the fallback initial,
// the backend URL mapped to the same-origin route, and the crop geometry.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CENTRED,
  LOGO_MAX_BYTES,
  MAX_ZOOM,
  clampCrop,
  logoFileError,
  logoKind,
  logoSrc,
  orgInitial,
  sourceRect,
} from "../src/lib/org-logo.ts";

test("file kinds come from the type, then the extension", () => {
  assert.equal(logoKind({ type: "image/png", name: "x" }), "raster");
  assert.equal(logoKind({ type: "image/webp", name: "x" }), "raster");
  assert.equal(logoKind({ type: "image/svg+xml", name: "x" }), "svg");
  assert.equal(logoKind({ type: "", name: "Logo.SVG" }), "svg");
  assert.equal(logoKind({ type: "", name: "logo.jpeg" }), "raster");
  assert.equal(logoKind({ type: "image/gif", name: "logo.gif" }), null);
  assert.equal(logoKind({ type: "application/pdf", name: "logo.png" }), null);
});

test("wrong type and too big are refused with a message", () => {
  assert.match(logoFileError({ type: "image/gif", name: "a.gif", size: 10 })!, /PNG, JPEG, WebP or SVG/);
  assert.match(logoFileError({ type: "image/png", name: "a.png", size: LOGO_MAX_BYTES + 1 })!, /up to 2 MB/);
  assert.match(logoFileError({ type: "image/png", name: "a.png", size: 0 })!, /empty/);
  assert.equal(logoFileError({ type: "image/png", name: "a.png", size: 2048 }), null);
});

test("the initial is the first letter or digit", () => {
  assert.equal(orgInitial("Kestrel Labs"), "K");
  assert.equal(orgInitial("  acme"), "A");
  assert.equal(orgInitial("(42) Studio"), "4");
  assert.equal(orgInitial("élan"), "É");
  assert.equal(orgInitial("株式会社"), "株");
  assert.equal(orgInitial(""), "W");
});

test("only the backend's versioned logo URL maps to the same-origin route", () => {
  assert.equal(logoSrc("/api/v1/org/logo/image?v=7"), "/api/org-logo?v=7");
  assert.equal(logoSrc(null), undefined);
  assert.equal(logoSrc("https://evil.test/x.png"), undefined);
  assert.equal(logoSrc("/api/v1/org/logo/image?v=7&x=1"), undefined);
});

test("the crop always covers the square", () => {
  // 1000x500 in a 264 viewport: covered at zoom 1 by height, free to pan sideways only.
  const c = clampCrop({ zoom: 1, x: 9999, y: 50 }, 1000, 500, 264);
  assert.equal(c.y, 0);
  assert.equal(c.x, (528 - 264) / 2);
  assert.equal(clampCrop({ zoom: 99, x: 0, y: 0 }, 100, 100, 264).zoom, MAX_ZOOM);
  assert.equal(clampCrop({ zoom: 0.1, x: 0, y: 0 }, 100, 100, 264).zoom, 1);
});

test("the source rectangle is the centred square at zoom 1 and shrinks with zoom", () => {
  assert.deepEqual(sourceRect(CENTRED, 1000, 500, 264), { sx: 250, sy: 0, side: 500 });
  const zoomed = sourceRect({ zoom: 2, x: 0, y: 0 }, 400, 400, 264);
  assert.equal(zoomed.side, 200);
  assert.equal(zoomed.sx, 100);
  // panned fully left shows the image's left edge
  const left = sourceRect({ zoom: 1, x: 9999, y: 0 }, 1000, 500, 264);
  assert.equal(left.sx, 0);
});
