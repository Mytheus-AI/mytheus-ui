"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/settings/Toggle";
import { notifyError, notifySuccess } from "@/lib/toast";
import { removeFeatureFlag, toggleFeatureFlag } from "@/app/actions/ops";

/* One feature flag's controls: the on/off switch (optimistic, rolled back if the server refuses)
   and delete behind a second press. Each change emits `admin-events` flag_changed server-side. */
export function FlagControls({ id, flagKey, enabled }: { id: string; flagKey: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => setOn(enabled), [enabled]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  const toggle = (next: boolean) => {
    if (pending) return;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const res = await toggleFeatureFlag(id, next);
      if (!res.ok) {
        setOn(!next);
        setError(res.message);
        notifyError(res.message);
      } else {
        router.refresh();
        notifySuccess(next ? "Flag turned on" : "Flag turned off", { description: flagKey, undo: () => toggle(!next) });
      }
    });
  };

  const remove = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await removeFeatureFlag(id);
      if (!res.ok) {
        setError(res.message);
        notifyError(res.message);
      } else {
        router.refresh();
        notifySuccess("Flag deleted", { description: flagKey });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error ? (
        <span role="alert" className="text-[14px] font-medium text-priority-high">
          {error}
        </span>
      ) : null}
      <Toggle checked={on} onChange={toggle} label={`${flagKey} enabled`} />
      <Button
        variant={armed ? "danger" : "ghost"}
        size="sm"
        onClick={remove}
        disabled={pending}
        aria-label={armed ? undefined : `Delete ${flagKey}`}
        title={armed ? undefined : `Delete ${flagKey}`}
        icon={!armed}
        className={armed ? "" : "hover:!text-priority-high"}
      >
        {armed ? "Confirm delete" : <Trash size={17} aria-hidden />}
      </Button>
    </div>
  );
}
