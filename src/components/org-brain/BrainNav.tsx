"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Brain,
  Buildings,
  CalendarDots,
  Prohibit,
  Target,
  UserFocus,
} from "@phosphor-icons/react";

/* The company brain's own sections. From lg up a vertical list beside the page, with a bead for
   each readiness check (filled when done, a ring when not); below lg a row that scrolls sideways.
   Meeting types has no readiness check, so it carries no bead. */

export const BRAIN_SECTIONS = [
  { href: "/workspace/brain", label: "Overview", icon: Brain, check: null },
  { href: "/workspace/brain/about", label: "About", icon: Buildings, check: "profile" },
  { href: "/workspace/brain/vocabulary", label: "Vocabulary", icon: BookOpenText, check: "vocabulary" },
  { href: "/workspace/brain/owners", label: "Who owns what", icon: UserFocus, check: "owners" },
  { href: "/workspace/brain/goals", label: "Goals", icon: Target, check: "goals" },
  { href: "/workspace/brain/meeting-types", label: "Meeting types", icon: CalendarDots, check: null },
  { href: "/workspace/brain/ground-rules", label: "Ground rules", icon: Prohibit, check: "ground_rules" },
] as const;

export function BrainNav({ done }: { done: Record<string, boolean> | null }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Company brain sections" className="-mx-4 min-w-0 sm:mx-0 lg:sticky lg:top-4">
      <ul className="flex gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-0 lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {BRAIN_SECTIONS.map((s) => {
          const active = pathname === s.href;
          const Icon = s.icon;
          const state = s.check && done ? done[s.check] : undefined;
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-ctl border px-3 text-[14.5px] font-semibold transition-colors duration-150 focus-visible:!rounded-ctl lg:h-11 ${
                  active ? "border-line bg-surface text-ink shadow-warm-1" : "border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink"
                }`}
              >
                <Icon size={19} weight={active ? "fill" : "regular"} className={active ? "text-signal" : undefined} aria-hidden />
                <span className="lg:flex-1">{s.label}</span>
                {state === undefined ? null : (
                  <>
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${state ? "bg-signal" : "border-[1.5px] border-ink-4"}`}
                    />
                    <span className="sr-only">{state ? "(ready)" : "(needs work)"}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
