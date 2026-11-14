/** A small label above an icon button, on hover and on keyboard focus. Put it inside a
    `group relative` wrapper with the button. The button carries the same words as its accessible
    name, so this one is hidden from assistive tech. */
export function Tip({ text, align = "center" }: { text: string; align?: "center" | "start" | "end" }) {
  const place = align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-[calc(100%+6px)] z-30 whitespace-nowrap rounded-ctl bg-pill px-2.5 py-1 text-[12.5px] font-semibold text-pill-on opacity-0 shadow-warm-2 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${place}`}
    >
      {text}
    </span>
  );
}
