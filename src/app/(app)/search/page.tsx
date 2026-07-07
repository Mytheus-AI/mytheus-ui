"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mockSearchIndex, type SearchResult } from "@/lib/mock/data";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const typeTone: Record<SearchResult["type"], "default" | "success" | "warning"> = {
  meeting: "default",
  decision: "success",
  action: "warning",
};

const typeLabel: Record<SearchResult["type"], string> = {
  meeting: "Meeting",
  decision: "Decision",
  action: "Action",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockSearchIndex;
    return mockSearchIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <p className="kicker">Search</p>
      <h1 className="mt-2 text-[28px] font-medium tracking-tight text-ink-display">
        Search meetings, decisions, actions
      </h1>

      <div className="mt-6">
        <label htmlFor="search-query" className="sr-only">
          Search meetings, decisions, actions
        </label>
        <Input
          id="search-query"
          name="search-query"
          type="search"
          placeholder="Search meetings, decisions, actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="mt-8">
        {results.length === 0 ? (
          <EmptyState
            title={`No results for "${query}"`}
            description="Try a different keyword, or search for a meeting title, decision, or action."
          />
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-ink-3" role="status">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-3">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={`/meetings/${result.meetingId}/room`}
                    className="block rounded-card"
                  >
                    <Card className="transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-[0_12px_32px_-24px_rgba(40,30,20,0.4)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2">
                            <Badge tone={typeTone[result.type]}>{typeLabel[result.type]}</Badge>
                          </div>
                          <p className="truncate text-[15px] font-medium text-ink">
                            {result.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">
                            {result.snippet}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
