"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  CaretDown,
  Flag,
  Kanban,
  ListBullets,
  User,
  VideoCamera,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrgContext } from "@/lib/org-context";
import type { ActionItem } from "@/lib/mock/data";
import { SidePanel } from "./SidePanel";
import { TaskDetailBody, TaskDetailHeader } from "./TaskDetail";
import { CheckButton, DueChip, PriorityBadge } from "./task-ui";
import { daysUntil, groupOf, sortTasks, type Task, type TaskGroup } from "./dates";

/* My Tasks. Completion is visual state only (the Server Action + optimistic reconcile wires in
   when the backend lands). Everything else here (view, filters, groups, quick view) is client-side
   presentation of the same action items the page always read. */

type View = "list" | "board";
type FilterKey = "mine" | "week" | "high";
type Filters = Record<FilterKey, boolean>;

const NO_FILTERS: Filters = { mine: false, week: false, high: false };

const FILTER_DEFS: { key: FilterKey; label: string; Icon: typeof User }[] = [
  { key: "mine", label: "Mine", Icon: User },
  { key: "week", label: "This week", Icon: CalendarBlank },
  { key: "high", label: "High priority", Icon: Flag },
];

const GROUPS: { key: TaskGroup; label: string; hint?: string }[] = [
  { key: "overdue", label: "Overdue", hint: "Needs you first" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "done", label: "Completed" },
];

function matchesOne(t: Task, key: FilterKey, userName: string): boolean {
  if (key === "mine") return t.assignee === userName;
  if (key === "high") return t.priority === "high";
  const d = daysUntil(t.dueDate);
  return d >= 0 && d <= 7;
}

function passes(t: Task, f: Filters, userName: string, skip?: FilterKey): boolean {
  return FILTER_DEFS.every(({ key }) => key === skip || !f[key] || matchesOne(t, key, userName));
}

/* ---------------- list ---------------- */

function MeetingLink({ task }: { task: Task }) {
  return (
    <Link
      href={`/meetings/${task.meetingId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex max-w-full items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink active:text-ink"
    >
      <VideoCamera size={14} className="shrink-0" aria-hidden />
      <span className="truncate">{task.meetingTitle}</span>
    </Link>
  );
}

function TaskRow({
  task,
  selected,
  onOpen,
  onToggle,
}: {
  task: Task;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <li
      onClick={() => onOpen(task.id)}
      className={`flex min-h-[64px] cursor-pointer flex-wrap items-start gap-x-3.5 gap-y-2 px-4 py-3 transition-colors duration-150 sm:flex-nowrap sm:items-center sm:px-5 ${
        selected ? "bg-signal-soft" : "hover:bg-bg active:bg-bg-2"
      }`}
    >
      <div className="mt-0.5 pl-2 sm:mt-0">
        <CheckButton title={task.title} done={task.done} onToggle={() => onToggle(task.id)} />
      </div>
      <div className="flex min-w-0 basis-[calc(100%-3.5rem)] flex-col gap-0.5 sm:basis-0 sm:flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(task.id);
          }}
          aria-haspopup="dialog"
          className={`w-fit max-w-full rounded-md text-left text-[14.5px] font-medium leading-snug transition-colors hover:text-signal-deep active:text-signal-deep ${
            task.done ? "text-ink-3 line-through" : "text-ink"
          }`}
        >
          {task.title}
        </button>
        <MeetingLink task={task} />
      </div>
      <div className="flex basis-full flex-wrap items-center gap-2 pl-[3.25rem] sm:basis-auto sm:flex-nowrap sm:gap-3 sm:pl-0">
        <Avatar name={task.assignee} size="sm" />
        <DueChip dueDate={task.dueDate} done={task.done} />
        <PriorityBadge priority={task.priority} />
      </div>
    </li>
  );
}

function ListView({
  tasks,
  selectedId,
  collapsed,
  onToggleGroup,
  onOpen,
  onToggle,
}: {
  tasks: Task[];
  selectedId: string | null;
  collapsed: Record<string, boolean>;
  onToggleGroup: (g: TaskGroup) => void;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  // Two open groups or more sit side by side on wide screens; a lone open group takes the full width
  // rather than leaving half the page empty. Completed always spans the full width below them.
  const openGroups = GROUPS.filter((g) => g.key !== "done" && tasks.some((t) => groupOf(t) === g.key)).length;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2 group-data-[panel=open]/page:xl:grid-cols-1">
      {GROUPS.map((g) => {
        const items = tasks.filter((t) => groupOf(t) === g.key).sort(sortTasks);
        if (items.length === 0) return null;
        const isCollapsed = !!collapsed[g.key];
        return (
          <Card key={g.key} className={`p-0 ${g.key === "done" || openGroups === 1 ? "xl:col-span-2" : ""}`} data-group={g.key}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={`task-group-${g.key}`}
              onClick={() => onToggleGroup(g.key)}
              className={`flex h-12 w-full items-center gap-2.5 bg-bg/50 px-4 text-left transition-colors hover:bg-bg active:bg-bg-2 focus-visible:outline-offset-[-2px] sm:px-5 ${
                isCollapsed ? "" : "border-b border-line"
              }`}
            >
              <CaretDown
                size={14}
                weight="bold"
                aria-hidden
                className={`text-ink-3 transition-transform duration-200 motion-reduce:transition-none ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <span
                className={`text-[14px] font-semibold ${g.key === "overdue" ? "text-priority-high" : "text-ink"}`}
              >
                {g.label}
              </span>
              <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
                {items.length}
              </span>
              {g.hint ? <span className="ml-auto text-[12.5px] text-ink-3">{g.hint}</span> : null}
              {g.key === "done" ? (
                <span className="ml-auto text-[12.5px] text-ink-3">{isCollapsed ? "Show" : "Hide"}</span>
              ) : null}
            </button>
            <ul id={`task-group-${g.key}`} hidden={isCollapsed} className="divide-y divide-line">
              {items.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  selected={selectedId === t.id}
                  onOpen={onOpen}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- board ---------------- */

function BoardCard({
  task,
  selected,
  onOpen,
  onToggle,
}: {
  task: Task;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <article
      onClick={() => onOpen(task.id)}
      className={`flex cursor-pointer flex-col gap-3 rounded-pill border bg-surface p-3.5 transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-[0_10px_28px_-22px_rgba(40,30,20,0.45)] ${
        selected ? "border-signal" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pl-2 pt-0.5">
          <CheckButton title={task.title} done={task.done} onToggle={() => onToggle(task.id)} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(task.id);
          }}
          aria-haspopup="dialog"
          className={`min-w-0 flex-1 rounded-md text-left text-[14px] font-medium leading-snug transition-colors hover:text-signal-deep active:text-signal-deep ${
            task.done ? "text-ink-3 line-through" : "text-ink"
          }`}
        >
          {task.title}
        </button>
      </div>
      <MeetingLink task={task} />
      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={task.assignee} size="sm" />
        <DueChip dueDate={task.dueDate} done={task.done} />
        <span className="ml-auto">
          <PriorityBadge priority={task.priority} />
        </span>
      </div>
    </article>
  );
}

function BoardView({
  tasks,
  selectedId,
  onOpen,
  onToggle,
}: {
  tasks: Task[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const columns = [
    { key: "open", label: "Open", items: tasks.filter((t) => !t.done).sort(sortTasks), empty: "Nothing open here." },
    { key: "done", label: "Done", items: tasks.filter((t) => t.done).sort(sortTasks), empty: "Completed tasks collect here." },
  ];
  /* Under sm the columns become a horizontal snap scroller; from sm they sit side by side.
     `relative`: screen-reader-only labels inside the cards are absolutely positioned; without a
     positioned ancestor here they escaped this scroller's clipping and widened the whole page. */
  return (
    <div className="relative flex items-start gap-4 max-sm:-mx-4 max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:scroll-px-4 max-sm:px-4 max-sm:pb-2 max-sm:[overscroll-behavior-x:contain] max-sm:focus-visible:outline-offset-[-2px] sm:grid sm:grid-cols-2">
      {columns.map((c) => (
        <section
          key={c.key}
          aria-label={c.label}
          className="flex w-[82%] min-w-0 shrink-0 snap-start flex-col gap-3 rounded-card bg-bg-2 p-3 max-sm:max-w-[22rem] sm:w-auto"
        >
          <div className="flex items-center gap-2 px-1.5 pt-1">
            <h2 className="text-[14px] font-semibold text-ink">{c.label}</h2>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
              {c.items.length}
            </span>
          </div>
          {c.items.length > 0 ? (
            c.items.map((t) => (
              <BoardCard key={t.id} task={t} selected={selectedId === t.id} onOpen={onOpen} onToggle={onToggle} />
            ))
          ) : (
            <p className="grid min-h-[80px] place-items-center rounded-pill border border-dashed border-line-2 p-3 text-center text-[13px] text-ink-3">
              {c.empty}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

/* ---------------- screen ---------------- */

export function TasksView({ actions }: { actions: ActionItem[] }) {
  const { user } = useOrgContext();
  const [view, setView] = useState<View>("list");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(actions.map((a) => [a.id, a.status === "done"])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const tabRefs = useRef<Record<View, HTMLButtonElement | null>>({ list: null, board: null });

  const tasks: Task[] = useMemo(
    () => actions.map((a) => ({ ...a, done: !!doneMap[a.id] })),
    [actions, doneMap],
  );
  const visible = useMemo(
    () => tasks.filter((t) => passes(t, filters, user.name)),
    [tasks, filters, user.name],
  );
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const anyFilter = FILTER_DEFS.some(({ key }) => filters[key]);

  const open = tasks.filter((t) => !t.done);
  const overdueCount = open.filter((t) => daysUntil(t.dueDate) < 0).length;
  const todayCount = open.filter((t) => daysUntil(t.dueDate) === 0).length;
  const summary =
    tasks.length === 0
      ? "Action items from your meetings will land here once you confirm them."
      : [
          `${open.length} open`,
          overdueCount ? `${overdueCount} overdue` : null,
          todayCount ? `${todayCount} due today` : null,
        ]
          .filter(Boolean)
          .join(", ") + ".";

  const toggleDone = useCallback((id: string) => setDoneMap((m) => ({ ...m, [id]: !m[id] })), []);
  const openTask = useCallback((id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const toggleGroup = useCallback(
    (g: TaskGroup) => setCollapsed((c) => ({ ...c, [g]: !c[g] })),
    [],
  );

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next: View = e.key === "ArrowLeft" || e.key === "Home" ? "list" : "board";
    setView(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      data-panel={panelOpen ? "open" : "closed"}
      className={`group/page mx-auto max-w-[1240px] motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both] ${
        panelOpen ? "min-[1560px]:pr-[460px]" : ""
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="display text-[clamp(1.8rem,4vw,2.4rem)]">Tasks</h1>
          <p className="mt-2 text-[14px] text-ink-3" aria-live="polite">
            {summary}
          </p>
        </div>

        {tasks.length > 0 && (
          <div
            role="tablist"
            aria-label="Task view"
            onKeyDown={onTabKey}
            className="inline-flex shrink-0 gap-1 rounded-pill bg-bg-2 p-1"
          >
            {([
              ["list", "List", ListBullets],
              ["board", "Board", Kanban],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                type="button"
                role="tab"
                id={`tasks-tab-${key}`}
                aria-selected={view === key}
                aria-controls="tasks-panel"
                tabIndex={view === key ? 0 : -1}
                onClick={() => setView(key)}
                className={`inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-[13.5px] font-medium transition-colors duration-150 ${
                  view === key
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-3 hover:text-ink active:bg-bg-3"
                }`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div role="group" aria-label="Filter tasks" className="mt-6 flex flex-wrap items-center gap-2">
          {FILTER_DEFS.map(({ key, label, Icon }) => {
            const count = tasks.filter(
              (t) => !t.done && passes(t, filters, user.name, key) && matchesOne(t, key, user.name),
            ).length;
            const on = filters[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-medium transition-[background-color,color,border-color,transform] duration-150 motion-safe:active:scale-[0.97] ${
                  on
                    ? "border-signal bg-signal-soft text-signal-deep"
                    : "border-line-2 text-ink-2 hover:bg-surface hover:text-ink"
                }`}
              >
                <Icon size={15} aria-hidden />
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11.5px] leading-[18px] ${
                    on ? "bg-surface text-signal-deep" : "bg-bg-2 text-ink-2"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      <div
        id="tasks-panel"
        role="tabpanel"
        aria-labelledby={`tasks-tab-${view}`}
        tabIndex={-1}
        className="mt-6"
      >
        {tasks.length === 0 ? (
          <EmptyState
            title="Nothing assigned yet"
            description="When an action item is captured in a meeting and you confirm it, it lands here with its due date and owner."
            action={<LinkButton href="/meetings">View meetings</LinkButton>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No tasks match these filters"
            description="Remove a filter to see the rest of your list."
            action={
              <Button variant="outline" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : view === "list" ? (
          <ListView
            tasks={visible}
            selectedId={panelOpen ? selectedId : null}
            collapsed={collapsed}
            onToggleGroup={toggleGroup}
            onOpen={openTask}
            onToggle={toggleDone}
          />
        ) : (
          <BoardView
            tasks={visible}
            selectedId={panelOpen ? selectedId : null}
            onOpen={openTask}
            onToggle={toggleDone}
          />
        )}
      </div>

      <SidePanel
        open={panelOpen && !!selected}
        onClose={closePanel}
        label="Task details"
        closeLabel="Close task details"
        header={selected ? <TaskDetailHeader task={selected} onToggle={() => toggleDone(selected.id)} /> : null}
      >
        {selected ? <TaskDetailBody task={selected} isMine={selected.assignee === user.name} /> : null}
      </SidePanel>
    </div>
  );
}
