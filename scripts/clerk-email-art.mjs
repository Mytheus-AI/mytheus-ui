/**
 * The header art for the Clerk emails: four 560x200 illustrations, rendered to 2x PNGs by
 * headless Chrome (`node scripts/clerk-emails.mjs assets`). Email clients cannot run SVG or load
 * our fonts, so the art is baked into images and served from `public/email/`.
 *
 * Each one is the dark meeting band: the Mytheus wordmark (Refinity, the real wordmark face), a
 * warm coral glow, an audio waveform along the bottom with one voice lit, and a small scene for
 * the kind of email it heads. Deterministic: no randomness, so a rebuild is byte-stable.
 */

const INK = "#1c1a15";
const PANEL = "#2a2620";
const PANEL_LINE = "#3d372d";
const CREAM = "#faf9f5";
const CREAM_DIM = "rgba(250,249,245,0.55)";
const SIGNAL = "#d97757";
const SIGNAL_SOFT = "#f5e5dc";

/* Waveform: 70 bars, heights from a fixed sine mix; bars 26..40 are the lit "speaker". */
function waveform() {
  const bars = [];
  for (let i = 0; i < 70; i++) {
    const h = 4 + Math.round(Math.abs(Math.sin(i * 0.9) * 6 + Math.sin(i * 0.37) * 6 + Math.cos(i * 1.7) * 3));
    const lit = i >= 26 && i <= 40;
    const height = lit ? h + 7 : h;
    bars.push(
      `<rect x="${8 + i * 7.9}" y="${200 - 12 - height}" width="3.2" height="${height}" rx="1.6" fill="${lit ? SIGNAL : "rgba(250,249,245,0.13)"}"/>`,
    );
  }
  return bars.join("");
}

const chip = (x, y, text, { fill = SIGNAL, color = INK } = {}) => {
  const w = 10 + text.length * 6.4;
  return `<rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${fill}"/>
<text x="${x + w / 2}" y="${y + 12.5}" text-anchor="middle" font-family="GeistMono" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="${color}">${text}</text>`;
};

const avatar = (cx, cy, r, fill, initials) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
<text x="${cx}" y="${cy + r * 0.36}" text-anchor="middle" font-family="Geist" font-size="${r * 0.95}" font-weight="600" fill="${INK}">${initials}</text>`;

const scenes = {
  /* A live caption card: the agent typing a one-time code, cursor blinking. */
  access: () => `
<rect x="300" y="40" width="232" height="96" rx="16" fill="${PANEL}" stroke="${PANEL_LINE}"/>
<circle cx="320" cy="60" r="4" fill="${SIGNAL}"/>
<text x="330" y="63.5" font-family="GeistMono" font-size="9.5" font-weight="600" letter-spacing="1.6" fill="${SIGNAL}">MYTHEUS AGENT</text>
<text x="512" y="63.5" text-anchor="end" font-family="GeistMono" font-size="9" letter-spacing="1" fill="${CREAM_DIM}">LIVE</text>
${[0, 1, 2, 3, 4, 5]
  .map(
    (i) => `<rect x="${318 + i * 32}" y="78" width="26" height="36" rx="8" fill="${i < 4 ? "rgba(250,249,245,0.08)" : "none"}" stroke="${i === 4 ? SIGNAL : "rgba(250,249,245,0.18)"}" stroke-width="${i === 4 ? 1.6 : 1}"/>
${i < 4 ? `<circle cx="${331 + i * 32}" cy="96" r="4" fill="${CREAM}"/>` : ""}`,
  )
  .join("")}
<rect x="${318 + 4 * 32 + 12}" y="86" width="2" height="20" rx="1" fill="${SIGNAL}"/>
`,

  /* A meeting grid: four people, each with their own agent; you are the lit tile. */
  invite: () => {
    const tiles = [
      [298, 26, "AS", "#e8c9a8", false],
      [420, 26, "YK", "#a9c2a7", false],
      [298, 90, "RM", "#c7b9e3", false],
      [420, 90, "", SIGNAL_SOFT, true],
    ];
    return tiles
      .map(
        ([x, y, who, color, you]) => `
<rect x="${x}" y="${y}" width="114" height="54" rx="13" fill="${PANEL}" stroke="${you ? SIGNAL : PANEL_LINE}" stroke-width="${you ? 1.8 : 1}"/>
${avatar(x + 25, y + 27, 13, color, who)}
${you ? `<path d="M${x + 19} ${y + 27} h12 M${x + 25} ${y + 21} v12" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` : ""}
${chip(x + 46, y + 18, you ? "YOU" : "AGENT", you ? {} : { fill: "rgba(217,119,87,0.22)", color: SIGNAL })}`,
      )
      .join("");
  },

  /* A shield traced in the squiggle's line, beside a short sign-in log. */
  security: () => `
<path d="M486 30 L528 44 V82 C528 110 510 128 486 140 C462 128 444 110 444 82 V44 Z" fill="rgba(217,119,87,0.10)" stroke="${SIGNAL}" stroke-width="2.6" stroke-linejoin="round"/>
<circle cx="486" cy="78" r="8" fill="none" stroke="${SIGNAL}" stroke-width="2.6"/>
<path d="M486 86 v15" stroke="${SIGNAL}" stroke-width="2.6" stroke-linecap="round"/>
${[
  ["11:40", 92, false],
  ["11:41", 76, false],
  ["11:42", 100, true],
]
  .map(
    ([t, y, hot], i) => `
<text x="300" y="${56 + i * 26}" font-family="GeistMono" font-size="10" letter-spacing="1" fill="${hot ? SIGNAL : CREAM_DIM}">${t}</text>
<rect x="342" y="${47 + i * 26}" width="${y - 22}" height="11" rx="5.5" fill="${hot ? SIGNAL : "rgba(250,249,245,0.14)"}"/>`,
  )
  .join("")}`,

  /* People joining: a row of faces and a new one arriving. */
  team: () => `
${[
  [316, "AS", "#e8c9a8"],
  [354, "YK", "#a9c2a7"],
  [392, "RM", "#c7b9e3"],
]
  .map(([cx, who, color]) => `${avatar(cx, 84, 22, color, "")}<circle cx="${cx}" cy="84" r="22" fill="none" stroke="${INK}" stroke-width="3"/><text x="${cx}" y="89" text-anchor="middle" font-family="Geist" font-size="13" font-weight="600" fill="${INK}">${who}</text>`)
  .join("")}
<path d="M428 62 C448 40, 476 42, 486 58" fill="none" stroke="${SIGNAL}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 6"/>
<circle cx="490" cy="84" r="22" fill="${SIGNAL}" stroke="${INK}" stroke-width="3"/>
<path d="M482 84 h16 M490 76 v16" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
${chip(446, 116, "JUST JOINED")}`,
};

export const ART_KINDS = Object.keys(scenes);

/** A full HTML page that renders one header at 560x200. `fonts` maps family to a file URL. */
export function artPage(kind, { fonts, mark }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Refinity; src: url("${fonts.refinity}"); }
@font-face { font-family: Geist; src: url("${fonts.geist}"); font-weight: 100 900; }
@font-face { font-family: GeistMono; src: url("${fonts.geistMono}"); font-weight: 100 900; }
html, body { margin: 0; padding: 0; background: ${INK}; }
.band { position: relative; width: 560px; height: 200px; overflow: hidden;
  background: radial-gradient(circle at 82% 38%, rgba(217,119,87,0.30), transparent 52%), ${INK}; }
.brand { position: absolute; left: 28px; top: 26px; display: flex; align-items: center; gap: 8px; }
.brand img { width: 40px; height: 40px; }
.brand span { font-family: Refinity; font-size: 27px; color: ${CREAM}; letter-spacing: 0.2px; }
.tag { position: absolute; left: 30px; top: 78px; font-family: GeistMono; font-size: 9.5px; font-weight: 600;
  letter-spacing: 2.2px; color: ${CREAM_DIM}; }
svg { position: absolute; inset: 0; }
</style></head><body><div class="band">
<svg width="560" height="200" viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg">${waveform()}${scenes[kind]()}</svg>
<div class="brand"><img src="${mark}" alt=""><span>Mytheus</span></div>
<div class="tag">EVERY MEETING, ON REPEAT.</div>
</div></body></html>`;
}
