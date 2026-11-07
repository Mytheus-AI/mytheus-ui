function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Wraps every occurrence of a search term in <mark>. Pure and server-safe. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const active = terms.filter(Boolean);
  if (active.length === 0) return <>{text}</>;
  const re = new RegExp(`(${active.map(escapeRe).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-signal-soft px-[3px] font-semibold text-signal-deep">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
