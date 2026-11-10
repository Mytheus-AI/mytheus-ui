"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarBlank,
  CaretDown,
  Flag,
  Kanban,
  ListBullets,
  Plus,
  User,
  VideoCamera,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionBar } from "@/components/ui/Page";
import { Count } from "@/components/ui/Chip";
import { useOrgContext } from "@/lib/org-context";
import { graceful, notifyInfo } from "@/lib/toast";
import { markTaskDone } from "@/app/actions/tasks";
import type { TaskItem } from "@/lib/tasks";
import { SidePanel } from "./SidePanel";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailBody, TaskDetailHeader } from "./TaskDetail";
import { CheckButton, DueChip, PriorityBadge } from "./task-ui";
import { daysUntil, groupOf, sortTasks, type Task, type TaskGroup } from "./dates";

/* My work, Tasks tab. Completing a task shows it done at once with a "Task completed" toast and
   Undo; `markTaskDone` (POST /api/v1/actions/{id}/done) is only sent after a five second grace
   period, because done is final server-side. Undo (the toast, or the task's own check while the
   grace runs) simply never sends it; a refusal rolls it back with the server's reason. "New task"
   (the tab's action, or `?new=1` from the command palette) opens the New task dialog. Everything
   else (view, filters, groups, quick view) is client-side presentation of the tasks the page read. */

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
  return d !== null && d >= 0 && d <= 7;
}

function passes(t: Task, f: Filters, userName: string, skip?: FilterKey): boolean {
  return FILTER_DEFS.every(({ key }) => key === skip || !f[key] || matchesOne(t, key, userName));
}

/* ---------------- list ---------------- */

function MeetingLink({ task }: { task: Task }) {
  if (!task.meetingId) return <span className="text-[12.5px] text-ink-3">Added by hand</span>;
  return (
    <Link
      href={`/meetings/${task.meetingId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-ctl text-[12.5px] text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
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
        selected ? "bg-signal-soft" : "hover:bg-surface-2 active:bg-bg-2"
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
          className={`w-fit max-w-full rounded-ctl text-left text-[15px] font-semibold leading-snug transition-colors hover:text-signal-ink ${
            task.done ? "text-ink-3 line-through decoration-ink-4" : "text-ink"
          }`}
        >
          {task.title}
        </button>
        <MeetingLink task={task} />
      </div>
      <div className="flex basis-full flex-wrap items-center gap-2 pl-[3.25rem] sm:basis-auto sm:flex-nowrap sm:gap-3 sm:pl-0">
        <span className="flex sm:w-8 sm:justify-center">
          <Avatar name={task.assignee} size="sm" />
        </span>
        <span className="flex sm:w-[132px]">
          <DueChip dueDate={task.dueDate} done={task.done} />
        </span>
        <span className="flex sm:w-[92px] sm:justify-end">
          {task.priority ? <PriorityBadge priority={task.priority} /> : null}
        </span>
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
          <Card key={g.key} flush className={g.key === "done" || openGroups === 1 ? "xl:col-span-2" : ""} data-group={g.key}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={`task-group-${g.key}`}
              onClick={() => onToggleGroup(g.key)}
              className={`flex h-12 w-full items-center gap-2.5 bg-surface-2 px-4 text-left transition-colors hover:bg-bg-2 active:bg-bg-3 focus-visible:outline-offset-[-2px] sm:px-5 ${
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
              <Count n={items.length} label={items.length === 1 ? "task" : "tasks"} />
              {g.hint ? <span className="ml-auto text-[12.5px] text-ink-3">{g.hint}</span> : null}
              {g.key === "done" ? (
                <span className="ml-auto text-[12.5px] font-semibold text-ink-3">{isCollapsed ? "Show" : "Hide"}</span>
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
      className={`flex cursor-pointer flex-col gap-3 rounded-ctl border bg-surface p-3.5 shadow-warm-1 transition-[border-color,box-shadow] duration-150 ${
        selected ? "border-signal shadow-[0_0_0_4px_var(--signal-soft)]" : "border-line hover:border-line-2"
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
          className={`min-w-0 flex-1 rounded-ctl text-left text-[14px] font-semibold leading-snug transition-colors hover:text-signal-ink ${
            task.done ? "text-ink-3 line-through decoration-ink-4" : "text-ink"
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
          {task.priority ? <PriorityBadge priority={task.priority} /> : null}
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
            <Count n={c.items.length} label={c.items.length === 1 ? "task" : "tasks"} tone="outline" />
          </div>
          {c.items.length > 0 ? (
            c.items.map((t) => (
              <BoardCard key={t.id} task={t} selected={selectedId === t.id} onOpen={onOpen} onToggle={onToggle} />
            ))
          ) : (
            <p className="grid min-h-[80px] place-items-center rounded-ctl border border-dashed border-line-2 p-3 text-center text-[14px] text-ink-3">
              {c.empty}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

/* ---------------- screen ---------------- */

export function TasksView({ actions }: { actions: TaskItem[] }) {
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
  const overdueCount = open.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0).length;
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

  // Undo for a completion still inside its grace period, by task id.
  const pendingUndo = useRef<Record<string, () => void>>({});
  const toggleDone = useCallback(
    (id: string) => {
      if (doneMap[id]) {
        const undo = pendingUndo.current[id];
        if (undo) undo();
        else notifyInfo("Completed tasks stay completed", { description: "Done is final once the grace period has passed." });
        return;
      }
      const { undo } = graceful({
        message: "Task completed",
        apply: () => setDoneMap((m) => ({ ...m, [id]: true })),
        revert: () => {
          delete pendingUndo.current[id];
          setDoneMap((m) => ({ ...m, [id]: false }));
        },
        commit: () => {
          delete pendingUndo.current[id];
          return markTaskDone(id);
        },
      });
      pendingUndo.current[id] = undo;
    },
    [doneMap],
  );

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (params?.get("new") === "1") setCreating(true);
  }, [params]);
  const closeCreate = useCallback(() => {
    setCreating(false);
    if (params?.get("new")) router.replace(pathname ?? "/work/tasks", { scroll: false });
  }, [params, pathname, router]);
  const filterDefs = tasks.some((t) => t.priority)
    ? FILTER_DEFS
    : FILTER_DEFS.filter((f) => f.key !== "high");
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
    <div data-panel={panelOpen ? "open" : "closed"} className={`group/page ${panelOpen ? "min-[1560px]:pr-[460px]" : ""}`}>
      <SectionBar
        context={summary}
        liveContext
        action={
          <>
            {tasks.length > 0 ? (
              <div
                role="tablist"
                aria-label="Task view"
                onKeyDown={onTabKey}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-ctl bg-bg-2 p-1"
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
                    className={`inline-flex h-9 items-center gap-2 rounded-ctl px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                      view === key ? "bg-surface text-ink" : "text-ink-3 hover:text-ink active:bg-bg-3"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <Button onClick={() => setCreating(true)} aria-haspopup="dialog">
              <Plus size={16} weight="bold" aria-hidden />
              New task
            </Button>
          </>
        }
      />

      {tasks.length > 0 && (
        <div role="group" aria-label="Filter tasks" className="mb-5 flex flex-wrap items-center gap-2">
          {filterDefs.map(({ key, label, Icon }) => {
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
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-[background-color,color,border-color,transform] duration-150 motion-safe:active:scale-[0.97] ${
                  on
                    ? "border-signal bg-signal-soft text-signal-ink"
                    : "border-line-2 text-ink-2 hover:bg-surface hover:text-ink"
                }`}
              >
                <Icon size={15} aria-hidden />
                {label}
                <span
                  className={`rounded-full px-1.5 text-[12.5px] leading-[18px] ${
                    on ? "bg-surface text-signal-ink" : "bg-bg-2 text-ink-2"
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
        className="focus:outline-none"
      >
        {tasks.length === 0 ? (
          <EmptyState
            art="tasks"
            title="Nothing assigned yet"
            description="When an action item is captured in a meeting and someone confirms it, it lands here with its owner and due date. You can also add one by hand."
            action={
              <>
                <Button onClick={() => setCreating(true)} aria-haspopup="dialog">
                  <Plus size={16} weight="bold" aria-hidden />
                  New task
                </Button>
                <LinkButton href="/meetings" variant="outline">
                  Open meetings
                </LinkButton>
              </>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            art="search"
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

      <NewTaskDialog open={creating} onClose={closeCreate} onCreated={() => router.refresh()} />
    </div>
  );
}
