# Mytheus Capture (Chrome extension)

Two things, both off until you use them: Capture (below) and **Decisions that follow you**: a
quiet note beside what you are writing in Google Docs, Gmail or Jira when it goes against a
decision your team confirmed in a meeting.

Brings calls held on Google Meet, Microsoft Teams (web) and the Zoom web client into Mytheus
without a bot. It records the meeting tab's audio (everyone else) and your microphone (you),
streams both to transcription-service's `/capture/audio`, and the call becomes an ordinary
Mytheus meeting with its transcript, agents, notes, decisions and minutes.

This folder is its own package. It is excluded from the Next app's `tsconfig.json` and ESLint
config, so nothing here can affect the app build.

## Build

```bash
cd extension
npm ci
npm run build          # dist/unpacked/ (load this) and dist/mytheus-capture.zip
npm test               # URL detection, PCM encoding, close-code policy, id, zip writer
npm run typecheck
```

`MYTHEUS_DASHBOARD_ORIGIN` sets the dashboard the extension signs in through (default
`https://dashboard.mytheus.cloud`). For local development:
`MYTHEUS_DASHBOARD_ORIGIN=http://localhost:3000 npm run build`.

## Load it in Chrome

1. Run `npm run build`, or download the zip from the dashboard's Capture page and unzip it into a
   folder you will keep.
2. Open `chrome://extensions`, switch on Developer mode (top right), choose Load unpacked and
   select `dist/unpacked` (or the unzipped folder).
3. Pin Mytheus Capture to the toolbar.
4. Click the icon and choose Connect your Mytheus account; on the page that opens, click Connect.
5. Join a call, click the icon, confirm you told everyone, and choose Start transcribing.

The manifest carries a public key, so every unpacked install has the same id,
`hcojignndmihgefeheffdnpaimncfglf`, which the dashboard allowlists by default. A Chrome Web Store
listing gets its own id: add it to the dashboard's `CAPTURE_EXTENSION_IDS`.

## How it fits together

| Piece | File | Job |
| --- | --- | --- |
| Popup | `src/popup.ts` | Connect, name the call, confirm consent, start and stop |
| Background worker | `src/background.ts` | Owns the state, calls the dashboard, watches the tab |
| Offscreen document | `src/offscreen.ts` | Tab and mic audio, keeps the call audible, two WebSockets |
| Audio worklet | `src/worklet.ts`, `src/lib/pcm.ts` | 16 kHz mono s16le in 50 ms frames |
| Page indicator | `src/content.ts` | The always-visible "Mytheus is transcribing" bar with Stop |
| Microphone page | `src/permissions.ts` | Asks once for microphone access |

Dashboard routes it calls (all in mytheus-ui `src/app/api/capture/`), each with the link token in
`X-Mytheus-Capture-Link`: `session/start` (creates the meeting, returns a 15-minute capture token
and the ingest URL), `session/refresh`, `session/end` (marks the meeting ended, which starts its
minutes) and `session/status`. The audio wire contract is in mytheus-realtime
`services/transcription-service/src/transcription_service/capture_in.py`.

Capture stops when you press Stop (popup or page bar), close the tab, leave the meeting page, or
the tab stops sharing audio.

## Decisions that follow you

Off by default. In the popup, "Check what I write against decisions" is the master switch, with
one switch per site (Google Docs, Gmail, Jira). While a site's switches are off, its content
script (`src/decisions-content.ts`) only listens for the switches: no editor listener, nothing
read, nothing sent. The background worker checks the switches again before any request leaves
the browser (`src/lib/decisions-background.ts`).

When on, it reads only the paragraph being written (at most 1500 characters): the Gmail compose
body, Jira's ProseMirror editors and textareas, and in Google Docs the annotated-canvas lines when
Docs exposes them, otherwise a rolling buffer of what you type in Docs' text-input frame. A check
runs 1.5 s after you stop typing, only when the paragraph changed, one at a time, and backs off
when the server says 429. The answer is a small pill in the margin ("Decided otherwise on 3 Oct");
open it (click, or Alt+Shift+D) for the decision, why it conflicts and the owner, with
**Open the decision**, **Reopen it** (asks the owner, who can schedule a revisit or add a
follow-up; the Docs or Jira address goes with it, never a Gmail draft) and **Dismiss** (that
sentence is never flagged against that decision again, remembered locally and in Mytheus).
Esc collapses it; the close button hides it until the text changes.

Dashboard routes (mytheus-ui `src/app/api/capture/decisions/`), with the same link token:
`check` (core-api `POST /api/v1/decisions/check`, source `extension`, read-only), `dismiss`
(`POST /api/v1/decisions/{id}/check-dismissals`) and `reopen`
(`POST /api/v1/decisions/{id}/reopen-requests`). A link that ended shows "Connect the extension";
a workspace without decision checks shows that once, quietly.

| Piece | File | Job |
| --- | --- | --- |
| Margin note | `src/decisions-content.ts` | Reads the paragraph (only when allowed), the note |
| Pure logic | `src/lib/decisions.ts` | Gating, paragraph selection, the checker, the wire, the copy |
| Worker side | `src/lib/decisions-background.ts` | Re-gates, then calls the dashboard |
