import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { RecordingSection } from "../../src/components/recording/RecordingSection";
import { ClipPlayer } from "../../src/components/share/ClipPlayer";
import type { ClipList, ClipShare, Line, Read, RecordingState } from "../../src/components/recording/recording-model";
import "../../src/styles/meeting-minutes.css";
import "../../src/styles/meeting-recording.css";
import "../../src/styles/share-page.css";

/* The Recording card (and the public clip player) as the meeting page renders them: the org
   context, the `.mx-app` theme root (light or dark) and the toast surface. Fixed data with the
   house's sample people: two recorded stretches with an off-the-record gap between them. */

export const MEETING_ID = "5f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const URL_A = "https://recordings.test/segment.mp4?a";
const URL_B = "https://recordings.test/segment.mp4?b";

export const LINES: Line[] = [
  { id: "l1", speakerId: "u-maya", speaker: "Maya Patel", startMs: 500, endMs: 3_500, text: "Let's start with pricing for the team plan." },
  { id: "l2", speakerId: "u-raj", speaker: "Raj Patel", startMs: 4_000, endMs: 7_500, text: "Eighteen dollars a seat keeps us under the competitor." },
  { id: "l3", speakerId: "u-maya", speaker: "Maya Patel", startMs: 8_000, endMs: 11_500, text: "Agreed. Priya, can you draft the announcement?" },
  { id: "l4", speakerId: "u-priya", speaker: "Priya Nair", startMs: 31_000, endMs: 35_000, text: "Back on the record: I will send the draft by Friday." },
  { id: "l5", speakerId: "u-raj", speaker: "Raj Patel", startMs: 36_000, endMs: 40_000, text: "Then we ship the beta to ten design partners." },
];

const OFF_RECORD = [{ startMs: 12_500, endMs: 29_500, durationMs: 17_000 }];

const seg = (id: string, offset: number, url: string) => ({
  id,
  status: "ready" as const,
  media_type: "video/mp4" as const,
  offset_ms: offset,
  duration_ms: 12_000,
  started_at: "2026-11-10T15:00:00Z",
  ended_at: null,
  url,
});

const READY: RecordingState = {
  meeting_id: MEETING_ID,
  status: "ready",
  reason: null,
  duration_ms: 24_000,
  url_expires_at: "2099-01-01T00:00:00Z",
  segments: [seg("s-1", 0, URL_A), seg("s-2", 30_000, URL_B)],
};

const CLIPS: ClipList = {
  max_duration_ms: 600_000,
  items: [
    {
      id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
      meeting_id: MEETING_ID,
      title: "Team plan price",
      start_ms: 4_000,
      end_ms: 11_500,
      duration_ms: 7_500,
      created_by: "u-raj",
      created_by_name: "Raj Patel",
      created_at: "2026-11-10T16:00:00Z",
      can_delete: true,
      share_links: [
        {
          id: "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
          clip_id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
          meeting_id: MEETING_ID,
          url: "https://app.example/s/clip-token-1",
          token: "clip-token-1",
          include_video: true,
          created_by: "u-raj",
          created_by_name: "Raj Patel",
          created_at: "2026-11-10T16:00:00Z",
          expires_at: "2099-12-10T16:00:00Z",
          revoked_at: null,
          state: "active",
          view_count: 3,
          last_viewed_at: null,
          can_revoke: true,
        },
      ],
    },
  ],
};

export type RecordingView =
  | "ready"
  | "processing"
  | "off"
  | "storage"
  | "consent"
  | "failed"
  | "not-recorded"
  | "error"
  | "no-transcript"
  | "confidential-guest"
  | "clip-video"
  | "clip-words";

function state(view: RecordingView): Read<RecordingState> {
  const base = { meeting_id: MEETING_ID, duration_ms: 0, segments: [], url_expires_at: null };
  switch (view) {
    case "processing":
      return { ok: true, data: { ...base, status: "processing", reason: null, segments: [{ ...seg("s-1", 0, ""), status: "processing", url: null }] } };
    case "off":
      return { ok: true, data: { ...base, status: "not_enabled", reason: null } };
    case "storage":
      return { ok: true, data: { ...base, status: "not_enabled", reason: "storage_not_configured" } };
    case "consent":
      return { ok: true, data: { ...base, status: "none", reason: "consent_missing" } };
    case "failed":
      return { ok: true, data: { ...base, status: "failed", reason: null, segments: [{ ...seg("s-1", 0, ""), status: "failed", url: null }] } };
    case "not-recorded":
      return { ok: true, data: { ...base, status: "none", reason: "not_recorded" } };
    case "error":
      return { ok: false, reason: "error" };
    default:
      return { ok: true, data: READY };
  }
}

const CLIP_SHARE: ClipShare = {
  clip_id: "c-1",
  title: "Team plan price",
  meeting_title: "Pricing review",
  meeting_start: "2026-11-10T15:00:00Z",
  start_ms: 4_000,
  end_ms: 11_500,
  duration_ms: 7_500,
  lines: [
    { speaker_name: "Raj Patel", offset_ms: 0, end_offset_ms: 3_500, text: "Eighteen dollars a seat keeps us under the competitor." },
    { speaker_name: null, offset_ms: 4_000, end_offset_ms: 7_500, text: "Agreed. Priya, can you draft the announcement?" },
  ],
  video: { status: "not_included", reason: null, url: null, expires_at: null, media_type: null },
};

function Frame({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-4 text-ink sm:p-6" data-theme={theme}>
        <main className="mx-auto max-w-[1600px]">{children}</main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

export function RecordingHarness({ view, theme = "light" }: { view: RecordingView; theme?: "light" | "dark" }) {
  if (view === "clip-video" || view === "clip-words") {
    const clip: ClipShare =
      view === "clip-video"
        ? { ...CLIP_SHARE, video: { status: "ready", reason: null, url: URL_A, expires_at: "2099-01-01T00:00:00Z", media_type: "video/mp4" } }
        : { ...CLIP_SHARE, video: { status: "unavailable", reason: "not_connected", url: null, expires_at: null, media_type: null } };
    return (
      <Frame theme={theme}>
        <article className="sh-doc" aria-labelledby="sh-title">
          <h1 id="sh-title" className="sh-title">
            {clip.title}
          </h1>
          <ClipPlayer clip={clip} />
        </article>
      </Frame>
    );
  }
  return (
    <Frame theme={theme}>
      <RecordingSection
        meetingId={MEETING_ID}
        meetingTitle="Pricing review"
        initial={state(view)}
        initialClips={{ ok: true, data: view === "no-transcript" ? { items: [], max_duration_ms: 600_000 } : CLIPS }}
        lines={view === "no-transcript" ? [] : LINES}
        offRecord={OFF_RECORD}
        isHost={view !== "confidential-guest"}
        confidential={view === "confidential-guest"}
      />
    </Frame>
  );
}
