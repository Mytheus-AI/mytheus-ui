import { Terminal } from "@phosphor-icons/react/ssr";
import { CardHead, cardClass } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { connectionSnippets } from "@/lib/api-access";

/* "Use Mytheus from other tools": the MCP endpoint and copyable setups for Claude Code, Claude
   Desktop and curl. Server component; only the Copy buttons are client islands. No snippet holds
   a token: each reads it from MYTHEUS_TOKEN (or has a placeholder to paste over), so copying one
   never leaks a secret into a chat or a repository. Code blocks scroll sideways inside their own
   box, never the page. */
export function ConnectToolsPanel({ origin }: { origin: string }) {
  const mcp = `${origin}/mcp`;
  const snippets = connectionSnippets(origin);
  return (
    <section aria-labelledby="connect-tools-heading" className={cardClass({ flush: true })}>
      <CardHead
        id="connect-tools-heading"
        as="h3"
        title="Use Mytheus from other tools"
        description="Ask about your meetings, look up decisions and see your tasks from Claude, an IDE or a script. Tools see exactly what you can see, through the token you give them."
      />
      <div className="border-t border-line px-4 py-4 sm:px-[22px] md:py-[18px]">
        <p id="mcp-url-label" className="text-[14px] font-semibold text-ink">
          MCP server
        </p>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            aria-labelledby="mcp-url-label"
            className="min-w-0 flex-1 truncate rounded-ctl border border-line bg-surface-2 px-3.5 py-2.5 font-mono text-[14px] text-ink"
            title={mcp}
          >
            {mcp}
          </code>
          <CopyButton value={mcp} label="Copy URL" />
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Streamable HTTP. Send <code className="font-mono text-ink-2">Authorization: Bearer</code> with a personal access token from above.
        </p>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {snippets.map((s) => (
          <li key={s.id} className="grid min-w-0 gap-3 px-4 py-4 sm:px-[22px] md:py-[18px] lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] lg:gap-6">
            <div className="flex min-w-0 items-start justify-between gap-3 lg:flex-col lg:justify-start">
              <div className="min-w-0">
                <h4 id={`snippet-${s.id}`} className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <Terminal size={16} className="shrink-0 text-ink-3" aria-hidden />
                  {s.title}
                </h4>
                <p className="mt-0.5 text-[14px] leading-snug text-ink-3">{s.description}</p>
              </div>
              <CopyButton value={s.code} label="Copy" ariaLabel={`Copy the ${s.title} setup`} className="lg:mt-1" />
            </div>
            <pre
              tabIndex={0}
              aria-labelledby={`snippet-${s.id}`}
              className="max-w-full self-start overflow-x-auto rounded-ctl border border-line bg-bg-2 px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <code>{s.code}</code>
            </pre>
          </li>
        ))}
      </ul>
    </section>
  );
}
