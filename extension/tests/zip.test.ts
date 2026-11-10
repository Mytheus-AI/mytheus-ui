import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

// @ts-expect-error - a plain .mjs build helper without type declarations
import { crc32, createZip } from "../scripts/zip.mjs";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("a zip round-trips its entries through the central directory", () => {
  const files = [
    { name: "manifest.json", data: Buffer.from(JSON.stringify({ a: "x".repeat(500) })) },
    { name: "icons/icon-16.png", data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  ];
  const zip: Buffer = createZip(files);
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 2);
  let cursor = zip.readUInt32LE(end + 16);
  for (const file of files) {
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    const method = zip.readUInt16LE(cursor + 10);
    const size = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const local = zip.readUInt32LE(cursor + 42);
    assert.equal(zip.subarray(cursor + 46, cursor + 46 + nameLength).toString(), file.name);
    const start = local + 30 + zip.readUInt16LE(local + 26);
    const body = zip.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(body) : body;
    assert.deepEqual(Buffer.from(data), file.data);
    assert.equal(zip.readUInt32LE(cursor + 16), crc32(file.data));
    cursor += 46 + nameLength;
  }
});
