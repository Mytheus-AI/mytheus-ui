/* The workspace logo fixtures (ADR-0047): a Kestrel Labs mark as an SVG, as a data URL for the
   places that show a saved logo, and as file bytes for the editor (an SVG goes through the same
   in-browser rasterising a real upload does). */

export const KESTREL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#1f3b4d"/>
<g transform="translate(400 300)">
<circle r="190" fill="#f3efe4"/>
<path d="M-120 40 C-60 -40 20 -90 130 -80 C70 -50 40 -20 30 20 C80 10 120 30 150 60 C70 60 10 80 -30 130 C-40 90 -70 60 -120 40 Z" fill="#c15f3c"/>
<circle cx="70" cy="-48" r="9" fill="#1f3b4d"/>
</g>
</svg>`;

export const KESTREL_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(KESTREL_SVG)}`;

/** A white logo on transparency: the case the hairline ring exists for. */
export const WHITE_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M10 44 L32 12 L54 44 Z" fill="#ffffff"/></svg>`,
)}`;
