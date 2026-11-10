"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";

/* The past-weeks picker on the digest: the app's themed select, which moves the page to the week
   chosen. "This week so far" is the unsaved preview. */

export type WeekOption = { value: string; label: string; href: string };

export function WeekPicker({ options, value }: { options: WeekOption[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending} className={`transition-opacity duration-150 ${pending ? "opacity-70" : ""}`}>
      <Select
        label="Choose a week"
        value={value}
        align="right"
        options={options.map(({ value: v, label }) => ({ value: v, label }))}
        onChange={(v) => {
          const next = options.find((o) => o.value === v);
          if (next && v !== value) startTransition(() => router.push(next.href, { scroll: false }));
        }}
        className="min-w-[230px]"
      />
    </div>
  );
}
