/**
 * The extension's fixed id. `manifest.json` carries the public half of a key pair (`key`), so
 * every unpacked install of this build gets the same id, which is what the dashboard's
 * `/capture/connect` page sends the link to (`chrome.runtime.sendMessage(EXTENSION_ID, ...)`)
 * and what mytheus-ui allowlists by default (`src/app/api/capture/_lib/config.ts`). A Chrome Web
 * Store listing gets its own id from the store; set `CAPTURE_EXTENSION_IDS` on the dashboard
 * for it.
 *
 * `tests/identity.test.ts` checks that the key below derives this id.
 */

export const EXTENSION_ID = "hcojignndmihgefeheffdnpaimncfglf";

export const MANIFEST_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3x8/byGrYmcAKDdjKteF2fAQivyQjBk8MUVQ9xn94REW82L8k7pLuQEn6EO+hc7nBGT49LxYfLvbH0fCluT1x+yVpxqV7R2KGky7NEjZbP5UX02vJCJhWLxnf9+8kFEYA/f+YrgMBsXKdc1qxj9sWnulOOKvOxGvp8km9iNncO1J31S7nME5IPozz3AOTAqBnylsV/4egAe5APhyAIoZNgsHbPuEd64VDGzjQnAkLHefWoXg2sEBeNxwTNhPnRdRZXj1nfvKV1xIyPgVOkj3Z1rgY+7D2257CVpwrI0+cZtDMz/gng8tNDaHcyOi6FULgZebmzhHDP3F1BJtFHjSNwIDAQAB";

/** Chrome's id derivation: sha256 of the DER public key, first 32 hex digits mapped 0-f to a-p. */
export function idFromSha256Hex(hex: string): string {
  return [...hex.slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}
