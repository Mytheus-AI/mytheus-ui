"use client";

import { useId, useState } from "react";
import { saveDigestPreferences } from "@/app/actions/digests";
import { SectionCard } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { InlineRow } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { TextLink } from "@/components/ui/TextLink";
import type { DigestPreferences } from "@/lib/api/only-mytheus-types";
import { notifyError, notifySuccess } from "@/lib/toast";
import { Toggle } from "./Toggle";

/* Two switches: the weekly digest itself (in your Inbox every Monday), and a copy by email. Each
   flip saves at once and says so, with Undo. Email needs the server to have an email provider;
   when it has none the switch is off and the row says why. */

export function WeeklyDigestForm({
  initial,
  loaded,
  emailConfigured,
}: {
  initial: DigestPreferences;
  loaded: boolean;
  /** null when it could not be read */
  emailConfigured: boolean | null;
}) {
  const ids = { weekly: useId(), email: useId() };
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const emailBlocked = emailConfigured === false;

  const save = async (next: DigestPreferences, message: string, isUndo = false) => {
    const before = prefs;
    setPrefs(next);
    setBusy(true);
    const res = await saveDigestPreferences(next);
    setBusy(false);
    if (!res.ok) {
      setPrefs(before);
      notifyError(res.message, { retry: () => void save(next, message, isUndo) });
      return;
    }
    setPrefs(res.prefs);
    if (isUndo) notifySuccess("Digest settings restored");
    else notifySuccess(message, { undo: () => void save(before, message, true) });
  };

  return (
    <SectionCard
      title="Weekly digest"
      headingId="weekly-digest-h"
      headingLevel={3}
      description="Every Monday morning, what changed for you last week: decisions on your topics, decisions that were replaced, tasks assigned and closed, and promises coming due."
      aside={<TextLink href="/digest">Open your digest</TextLink>}
    >
      {loaded ? null : (
        <div className="px-4 py-4 sm:px-[22px]">
          <Note tone="warning">We could not load your digest settings, so the defaults are shown.</Note>
        </div>
      )}
      <InlineRow label="Send me the digest" labelId={ids.weekly} help="It lands in your Inbox on Monday morning.">
        <Toggle
          labelledBy={ids.weekly}
          checked={prefs.weekly_enabled}
          disabled={busy}
          onChange={(on) =>
            void save({ weekly_enabled: on, email_enabled: on ? prefs.email_enabled : false }, on ? "Weekly digest turned on" : "Weekly digest turned off")
          }
        />
      </InlineRow>
      <InlineRow
        label="Also send it by email"
        labelId={ids.email}
        help={
          emailBlocked
            ? "Email isn't set up on this workspace's server yet, so the digest stays in your Inbox."
            : !prefs.weekly_enabled
              ? "Turn on the digest first."
              : emailConfigured === null
                ? "A copy to your email address. We couldn't check whether email is set up, so it may stay in your Inbox."
                : "A copy to your email address, as well as your Inbox."
        }
      >
        {emailBlocked ? (
          <Chip tone="outline">Not connected</Chip>
        ) : (
          <Toggle
            labelledBy={ids.email}
            checked={prefs.weekly_enabled && prefs.email_enabled}
            disabled={busy || !prefs.weekly_enabled}
            onChange={(on) => void save({ ...prefs, email_enabled: on }, on ? "Digest email turned on" : "Digest email turned off")}
          />
        )}
      </InlineRow>
    </SectionCard>
  );
}
