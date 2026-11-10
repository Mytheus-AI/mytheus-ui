/* Person identity on the meeting surfaces: initials and one of the four illustration tints
   (`tone-1`..`tone-4` in src/styles/meeting.css, read from --tint-peach/sage/ochre/sky), picked
   from a stable hash of the person's id so the same person keeps the same colour on every tile,
   avatar and list. Pure, so server and client agree. */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function toneOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `tone-${(Math.abs(h) % 4) + 1}`;
}
