import { ChatCircleText, Ear, EyeSlash, LockSimple, Scales, Signature, VideoCamera } from "@phosphor-icons/react";

/* The recording and transcription notice, one text for the pre-join and the room (polish program,
   Phase 0: "Consent that is real"). It says exactly what the product stores, and nothing it does
   not do:

   - the transcript (`transcript_chunks`: who said what, from the transcription of the call's audio)
     is kept with the meeting under the workspace's transcript retention setting;
   - audio and video are recorded only when the deployment records calls (`RECORDING_ENABLED`, read
     from meeting-service's session); otherwise speech goes to the transcription provider and is not
     kept as audio;
   - your agent's notes are yours only (`worklogs`, private to you);
   - decisions and action items are saved only when someone confirms one; chat is kept with the
     meeting;
   - the agreement itself is stored with its time and this notice's version
     (`meeting_participants.consented_at` / `consent_version`), once per person per meeting;
   - anyone can ask to go off the record (polish wave 3): until it ends nothing is transcribed or
     kept and every agent pauses, and the transcript shows only that a gap happened.

   meeting-service keeps every version's words (`services/meeting_service/consent_notices.py`) so a
   person's receipt shows what they agreed to; a new version must be added there in the same change.

   Change the words and you must change CONSENT_VERSION, so the stored version keeps naming the
   text the person actually read. */

export const CONSENT_VERSION = "room-notice-2026-11-11.2";

export function ConsentTerms({ recording }: { recording: boolean | null }) {
  return (
    <ul className="pj-terms">
      <li>
        <Ear size={18} aria-hidden />
        <div>
          <strong>A transcript is kept</strong>
          <span>
            What is said is transcribed with who said it, and kept with the meeting in your workspace for as long as
            its retention setting allows.
          </span>
        </div>
      </li>
      <li>
        <VideoCamera size={18} aria-hidden />
        <div>
          <strong>{recording ? "Audio and video are recorded" : "Audio and video are not recorded"}</strong>
          <span>
            {recording
              ? "The call is recorded and stored with the meeting in your workspace."
              : "Speech is sent to our transcription provider to write the transcript. It is not kept as audio."}
          </span>
        </div>
      </li>
      <li>
        <LockSimple size={18} aria-hidden />
        <div>
          <strong>Your agent&rsquo;s notes are yours</strong>
          <span>Only you can see the notes your agent takes for you.</span>
        </div>
      </li>
      <li>
        <Scales size={18} aria-hidden />
        <div>
          <strong>Nothing is decided for you</strong>
          <span>Decisions and action items are saved only when someone in the meeting confirms them.</span>
        </div>
      </li>
      <li>
        <ChatCircleText size={18} aria-hidden />
        <div>
          <strong>Chat is kept</strong>
          <span>Messages in the meeting chat are stored with the meeting, so people who join later can read them.</span>
        </div>
      </li>
      <li>
        <EyeSlash size={18} aria-hidden />
        <div>
          <strong>You can go off the record</strong>
          <span>
            Anyone can ask the host to go off the record. Until it ends, nothing said is transcribed or kept and every
            agent pauses; the transcript shows only that a gap happened.
          </span>
        </div>
      </li>
      <li>
        <Signature size={18} aria-hidden />
        <div>
          <strong>Your agreement is recorded</strong>
          <span>We store when you agreed and which version of this notice you saw. You are asked once per meeting.</span>
        </div>
      </li>
    </ul>
  );
}
