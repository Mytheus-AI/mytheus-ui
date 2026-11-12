"use client";

import Link from "next/link";
import { GearSix } from "@phosphor-icons/react";
import { AgentOrb, type OrbState } from "@/components/agent/AgentOrb";
import type { AgentPersonality } from "@/lib/api/meeting-agenda-types";
import { PERSONALITY_LABEL, type AgentFace } from "@/lib/realtime/agent-persona";

/* Your agent heads your sidebar (ADR-0038 D11): its live plush face, its name (or "{first name}'s
   agent") and its personality preset, with a way to change them. It listens while the room is on
   the record (looking toward whoever is speaking, when a tile says so) and talks while your notes
   are being written. The name is a display label
   only; nothing here is sent anywhere. */

export function AgentHead({
  face,
  personality,
  state = "idle",
}: {
  face: AgentFace;
  personality: AgentPersonality | null;
  state?: OrbState;
}) {
  return (
    <div className="agent-head">
      <span className="agent-head-face" aria-hidden="true">
        <AgentOrb seed={face.seed} mode="live" state={state} size={44} speaker=".thumb.is-speaking" />
      </span>
      <span className="agent-head-text">
        <span className="agent-head-name">{face.name}</span>
        <span className="agent-head-meta">
          Your Myte{personality ? `, ${PERSONALITY_LABEL[personality].toLowerCase()}` : ""}
        </span>
      </span>
      <Link
        href="/agent"
        target="_blank"
        rel="noopener"
        className="cx-icon-btn sm tap tip-below tip-end"
        data-tip="Myte settings"
        aria-label={`${face.name} settings (opens in a new tab)`}
      >
        <GearSix size={18} aria-hidden />
      </Link>
    </div>
  );
}
