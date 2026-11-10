"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Binoculars, Checks, Gavel, Warning, X } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHead } from "@/components/app/PageHead";
import { dismissAlert, markAlertRead } from "@/app/actions/notifications";
import { Count, Explainer, panelClass } from "@/components/promises/parts";
import { UndoBar, type UndoNotice } from "@/components/promises/UndoBar";
import { LocalWhen } from "@/components/status/LocalWhen";
import type { FeedItem } from "./alert-copy";

/* /notifications: everything your agent and Mytheus told you, outside any meeting room. New ones
   first, then earlier ones. Includes the ADR-0039 alerts: a watched topic coming up in a meeting
   you are not in (`topic_watch`), and a settled decision being re-opened (`already_decided`),
   each with the link that answers it. Mark read and dismiss are optimistic with rollback;
   following a link marks it read. */

const PRIORITY_TILE: Record<1 | 2 | 3, string> = {
  1: "bg-priority-high-soft text-priority-high",
  2: "bg-priority-medium-soft text-priority-medium",
  3: "bg-priority-low-soft text-priority-low",
};

const KIND_ICON = { topic_watch: Binoculars, already_decided: Gavel, alert: Warning, reminder: Bell } as const;
const KIND_LABEL = {
  topic_watch: "Topic you watch",
  already_decided: "Already decided",
  alert: "Agent alert",
  reminder: "Reminder",
} as const;

type Filter = "all" | "unread";

export function NotificationFeed({ initial, nowIso }: { initial: FeedItem[]; nowIso: string }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<Record<string, true>>({});
  const [notice, setNotice] = useState<UndoNotice | null>(null);

  const unread = items.filter((i) => i.unread).length;
  const visible = useMemo(() => (filter === "unread" ? items.filter((i) => i.unread) : items), [items, filter]);
  const fresh = visible.filter((i) => i.unread);
  const earlier = visible.filter((i) => !i.unread);

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((b) => {
      const copy = { ...b };
      if (on) copy[id] = true;
      else delete copy[id];
      return copy;
    });

  const markRead = async (item: FeedItem, quiet = false) => {
    if (!item.unread) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
    if (quiet) {
      void markAlertRead(item.id);
      return;
    }
    setBusyFor(item.id, true);
    const res = await markAlertRead(item.id);
    setBusyFor(item.id, false);
    if (!res.ok && !res.gone) {
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, unread: true } : i)));
      setNotice({ kind: "error", key: Date.now(), text: res.message });
    }
  };

  const dismiss = async (item: FeedItem) => {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((list) => list.filter((i) => i.id !== item.id));
    const res = await dismissAlert(item.id);
    if (!res.ok && !res.gone) {
      setItems((list) => {
        if (list.some((i) => i.id === item.id)) return list;
        const copy = [...list];
        copy.splice(Math.min(Math.max(index, 0), copy.length), 0, item);
        return copy;
      });
      setNotice({ kind: "error", key: Date.now(), text: res.message });
    }
  };

  const markAllRead = async () => {
    for (const item of items.filter((i) => i.unread)) void markRead(item, true);
  };

  const row = (item: FeedItem) => {
    const Icon = KIND_ICON[item.kind];
    return (
      <li key={item.id} aria-busy={busy[item.id] || undefined} className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-[22px]">
        <span
          aria-hidden
          className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-ctl ${PRIORITY_TILE[item.priority]}`}
        >
          <Icon size={19} weight={item.priority === 1 ? "fill" : "regular"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink-3">
            {KIND_LABEL[item.kind]}
            {item.unread ? <span className="ml-2 rounded-full bg-signal-soft px-2 py-px text-signal-ink">New</span> : null}
          </p>
          <h3 className={`mt-0.5 text-[15.5px] leading-snug text-ink ${item.unread ? "font-semibold" : "font-medium"}`}>
            {item.title}
          </h3>
          {item.quote ? (
            <blockquote className="mt-2 max-w-[75ch] rounded-ctl bg-surface-2 px-3.5 py-2.5 font-display text-[15.5px] italic leading-snug text-ink-2">
              {item.quote}
            </blockquote>
          ) : null}
          {item.body ? <p className="mt-1.5 max-w-[75ch] text-[14px] leading-relaxed text-ink-3">{item.body}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-4">
            <span className="text-[12.5px] text-ink-3">
              <LocalWhen iso={item.createdAt} nowIso={nowIso} mode="past" />
            </span>
            {item.href ? (
              <Link
                href={item.href}
                onClick={() => void markRead(item, true)}
                className="group/link inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[13.5px] font-semibold text-signal-ink underline-offset-4 hover:underline"
              >
                {item.linkLabel}
                <ArrowRight size={12} weight="bold" aria-hidden className="motion-safe:transition-transform motion-safe:group-hover/link:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
          {item.unread ? (
            <button
              type="button"
              disabled={!!busy[item.id]}
              onClick={() => void markRead(item)}
              aria-label={`Mark read: ${item.title}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-ctl px-2.5 text-[13.5px] font-semibold text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-50"
            >
              <Checks size={15} aria-hidden />
              <span className="hidden md:inline">Mark read</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void dismiss(item)}
            aria-label={`Dismiss: ${item.title}`}
            className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
          >
            <X size={15} weight="bold" aria-hidden />
          </button>
        </div>
      </li>
    );
  };

  const group = (id: string, title: string, list: FeedItem[]) =>
    list.length ? (
      <section aria-labelledby={id} className={panelClass}>
        <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-4 py-3 sm:px-[22px]">
          <h2 id={id} className="text-[14px] font-semibold text-ink">
            {title}
          </h2>
          <Count n={list.length} label="notifications" />
        </div>
        <ul className="divide-y divide-line">{list.map(row)}</ul>
      </section>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead
        title="Notifications"
        liveContext
        context={unread ? `${unread} new. Your agent's alerts and reminders, outside the meeting room.` : "You are all caught up."}
        action={
          unread ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex h-11 items-center gap-2 rounded-ctl border border-line-2 bg-surface px-[18px] text-[15px] font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              <Checks size={16} aria-hidden />
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="min-w-0 space-y-4">
          {items.length > 0 ? (
            <div role="group" aria-label="Show" className="inline-flex gap-1 rounded-ctl border border-line-2 bg-surface p-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`h-9 rounded-ctl px-3.5 text-[14px] font-semibold transition-colors ${
                    filter === f ? "bg-pill text-pill-on" : "text-ink-2 hover:bg-bg-2 hover:text-ink"
                  }`}
                >
                  {f === "all" ? "All" : `New${unread ? ` (${unread})` : ""}`}
                </button>
              ))}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              title={items.length === 0 ? "Nothing here yet" : "No new notifications"}
              description={
                items.length === 0
                  ? "Alerts from your agent and reminders before your meetings will show up here."
                  : "Everything new has been read. Switch to All to see earlier ones."
              }
              className="py-16"
            />
          ) : (
            <>
              {group("new-h", "New", fresh)}
              {group("earlier-h", "Earlier", earlier)}
            </>
          )}
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-2">
          <Explainer id="lands-h" title="What lands here">
            <p>
              Things your agent noticed for you: a topic you watch coming up in a meeting you are not in, a question the
              company already decided being raised again, and reminders before your meetings.
            </p>
            <p>Only you see your notifications.</p>
            <ul className="space-y-1 pt-1">
              <li>
                <Link href="/agent#topic-watch" className="inline-flex min-h-[40px] items-center rounded-ctl font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-4 hover:decoration-signal">
                  Choose topics to watch
                </Link>
              </li>
              <li>
                <Link href="/settings/profile" className="inline-flex min-h-[40px] items-center rounded-ctl font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-4 hover:decoration-signal">
                  Email and notification settings
                </Link>
              </li>
            </ul>
          </Explainer>
        </aside>
      </div>

      <UndoBar notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}
