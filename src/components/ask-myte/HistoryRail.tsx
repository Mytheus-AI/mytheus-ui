"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DotsThree, MagnifyingGlass, PencilSimple, Plus, PushPin, PushPinSlash, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteAllMyteThreads, deleteMyteThread, listMyteThreads, pinMyteThread, renameMyteThread } from "@/app/actions/myte-threads";
import { notifyError, notifySuccess } from "@/lib/toast";
import { browserTimeZone } from "@/lib/timezone";
import { groupThreads } from "@/lib/ask-myte/compose";
import type { ThreadList, ThreadSummary } from "@/lib/ask-myte/types";

/* Your chats (ADR-0047 D7): New chat, a search over titles and message text, then Pinned,
   Today, This week and Earlier. Each thread has a small menu to rename, pin and delete; Delete all
   asks first, in a dialog, because threads are hard-deleted. Private: core-api only ever returns
   the caller's own threads. */

export function HistoryRail({
  initial,
  activeId,
  onOpen,
  onNew,
  refreshKey,
  onDeleted,
}: {
  initial: ThreadList | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  /** bump to re-read the list (a new thread was stored) */
  refreshKey: number;
  /** a thread was deleted (null: all of them) */
  onDeleted: (id: string | null) => void;
}) {
  const [list, setList] = useState<ThreadList | null>(initial);
  const [failed, setFailed] = useState(initial === null);
  const [q, setQ] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "one"; thread: ThreadSummary } | { kind: "all" } | null>(null);
  const [busy, setBusy] = useState(false);
  const searchId = useId();
  const first = useRef(true);

  const load = async (query: string) => {
    const res = await listMyteThreads({ q: query });
    if (res.ok) {
      setList(res.list);
      setFailed(false);
    } else setFailed(true);
  };

  // Search as you type, a beat after the last key; re-read when a thread is stored.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (initial !== null && !q) return;
    }
    const t = window.setTimeout(() => void load(q), q ? 250 : 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, refreshKey]);

  const groups = useMemo(() => groupThreads(list?.items ?? [], new Date(), browserTimeZone()), [list]);

  const replace = (t: ThreadSummary) => setList((l) => (l ? { ...l, items: l.items.map((x) => (x.id === t.id ? { ...x, ...t } : x)) } : l));

  const more = async () => {
    if (!list?.next_cursor) return;
    setLoadingMore(true);
    const res = await listMyteThreads({ q, cursor: list.next_cursor });
    setLoadingMore(false);
    if (res.ok) setList((l) => ({ items: [...(l?.items ?? []), ...res.list.items], next_cursor: res.list.next_cursor }));
    else notifyError(res.message);
  };

  const pin = async (t: ThreadSummary) => {
    replace({ ...t, pinned: !t.pinned });
    const res = await pinMyteThread(t.id, !t.pinned);
    if (!res.ok) {
      replace(t);
      notifyError(res.message);
    }
  };

  const rename = async (t: ThreadSummary, title: string) => {
    setRenaming(null);
    if (!title.trim() || title.trim() === t.title) return;
    replace({ ...t, title: title.trim() });
    const res = await renameMyteThread(t.id, title);
    if (!res.ok) {
      replace(t);
      notifyError(res.message);
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    const res = confirm.kind === "all" ? await deleteAllMyteThreads() : await deleteMyteThread(confirm.thread.id);
    setBusy(false);
    if (!res.ok) {
      notifyError(res.message);
      return;
    }
    if (confirm.kind === "all") {
      setList({ items: [], next_cursor: null });
      onDeleted(null);
      notifySuccess("All your chats were deleted");
    } else {
      const id = confirm.thread.id;
      setList((l) => (l ? { ...l, items: l.items.filter((x) => x.id !== id) } : l));
      onDeleted(id);
      notifySuccess("Chat deleted");
    }
    setConfirm(null);
  };

  const count = list?.items.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-line px-3">
        <Button variant="primary" size="sm" className="w-full" onClick={onNew}>
          <Plus size={15} weight="bold" aria-hidden />
          New chat
        </Button>
      </div>
      <div className="shrink-0 px-3 pb-1 pt-3">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            Search your chats
          </label>
          <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="h-9 w-full rounded-ctl border border-line bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-3"
          />
        </div>
      </div>

      <nav aria-label="Your chats" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {failed && !list ? (
          <p className="px-2.5 py-3 text-[14px] text-ink-3">
            Your chats couldn&apos;t be loaded.{" "}
            <button type="button" className="font-semibold text-signal-ink underline-offset-4 hover:underline" onClick={() => void load(q)}>
              Try again
            </button>
          </p>
        ) : count === 0 ? (
          <p className="px-2.5 py-3 text-[14px] text-ink-3">{q ? "Nothing matches that." : "Your chats show up here. Only you can see them."}</p>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-labelledby={`${searchId}-${g.key}`} className="mb-1">
              <h3 id={`${searchId}-${g.key}`} className="px-2.5 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                {g.label}
              </h3>
              <ul className="space-y-px">
                {g.items.map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    active={t.id === activeId}
                    renaming={renaming === t.id}
                    onOpen={() => onOpen(t.id)}
                    onRename={() => setRenaming(t.id)}
                    onRenamed={(title) => void rename(t, title)}
                    onPin={() => void pin(t)}
                    onDelete={() => setConfirm({ kind: "one", thread: t })}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
        {list?.next_cursor ? (
          <div className="px-2.5">
            <Button size="sm" variant="ghost" onClick={() => void more()} disabled={loadingMore}>
              {loadingMore ? "Loading" : "Show older"}
            </Button>
          </div>
        ) : null}
      </nav>

      {count > 0 ? (
        <div className="shrink-0 border-t border-line px-3 py-2">
          <Button size="sm" variant="ghost" className="w-full !justify-start text-ink-3" onClick={() => setConfirm({ kind: "all" })}>
            <Trash size={16} aria-hidden />
            Delete all chats
          </Button>
        </div>
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        busy={busy}
        tone="danger"
        title={confirm?.kind === "all" ? "Delete all your chats?" : "Delete this chat?"}
        description={
          confirm?.kind === "all"
            ? "Every chat in your history is deleted for good. This can't be undone."
            : confirm?.kind === "one"
              ? `"${confirm.thread.title}" and its answers are deleted for good. This can't be undone.`
              : null
        }
      >
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void remove()} disabled={busy}>
            {busy ? "Deleting" : confirm?.kind === "all" ? "Delete all" : "Delete chat"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  renaming,
  onOpen,
  onRename,
  onRenamed,
  onPin,
  onDelete,
}: {
  thread: ThreadSummary;
  active: boolean;
  renaming: boolean;
  onOpen: () => void;
  onRename: () => void;
  onRenamed: (title: string) => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [draft, setDraft] = useState(thread.title);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(thread.title);
      requestAnimationFrame(() => field.current?.select());
    }
  }, [renaming, thread.title]);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const close = (refocus = true) => {
    setMenu(false);
    if (refocus) trigger.current?.focus();
  };

  const menuKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close(false);
  };

  if (renaming) {
    return (
      <li className="px-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRenamed(draft);
          }}
        >
          <label htmlFor={`${menuId}-r`} className="sr-only">
            Rename chat
          </label>
          <input
            id={`${menuId}-r`}
            ref={field}
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onRenamed(draft)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onRenamed(thread.title);
              }
            }}
            className="h-10 w-full rounded-ctl border border-ink-4 bg-surface px-2.5 text-[14px] text-ink"
          />
        </form>
      </li>
    );
  }

  return (
    <li className="group relative">
      <a
        href={`/ask?t=${thread.id}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onOpen();
        }}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-9 items-center rounded-ctl py-1.5 pl-2.5 pr-10 text-[14px] leading-snug transition-colors ${
          active ? "bg-surface font-semibold text-ink shadow-warm-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink"
        }`}
      >
        {thread.pinned ? <PushPin size={13} weight="fill" aria-hidden className="mr-1.5 shrink-0 text-ink-3" /> : null}
        <span className="truncate">{thread.title}</span>
        {thread.pinned ? <span className="sr-only">, pinned</span> : null}
      </a>
      <button
        ref={trigger}
        type="button"
        aria-label={`More for ${thread.title}`}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-controls={menu ? menuId : undefined}
        onClick={() => setMenu((v) => !v)}
        className={`absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-ctl text-ink-3 transition-opacity hover:bg-bg-3 hover:text-ink focus-visible:opacity-100 ${
          menu || active ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
        }`}
      >
        <DotsThree size={18} weight="bold" aria-hidden />
      </button>
      {menu ? (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${thread.title}`}
          onKeyDown={menuKeys}
          className="absolute right-1 top-[calc(100%+2px)] z-30 w-44 rounded-card border border-line bg-surface p-1.5 shadow-warm-3"
        >
          {[
            { label: "Rename", icon: PencilSimple, run: onRename },
            { label: thread.pinned ? "Unpin" : "Pin", icon: thread.pinned ? PushPinSlash : PushPin, run: onPin },
            { label: "Delete", icon: Trash, run: onDelete, danger: true },
          ].map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(it.label !== "Rename");
                it.run();
              }}
              className={`flex h-10 w-full items-center gap-2.5 rounded-ctl px-2.5 text-left text-[14px] font-medium transition-colors hover:bg-bg-2 focus:bg-bg-2 focus:outline-none ${
                it.danger ? "text-priority-high" : "text-ink-2"
              }`}
            >
              <it.icon size={16} aria-hidden />
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
