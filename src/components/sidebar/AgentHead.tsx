"use client";

import Link from "next/link";
import { GearSix } from "@phosphor-icons/react";
import { Doodle } from "@/components/ui/Doodle";
import type { AgentPersonality } from "@/lib/api/meeting-agenda-types";
import { PERSONALITY_LABEL, type AgentFace } from "@/lib/realtime/agent-persona";

/* Your agent heads your sidebar (ADR-0038 D11): its doodle face, its name (or "{first name}'s
   agent") and its personality preset, with a way to change them. The name is a display label
   only; nothing here is sent anywhere. */

export function AgentHead({ face, personality }: { face: AgentFace; personality: AgentPersonality | null }) {
  return (
    <div className="agent-head">
      <span className="agent-head-face" aria-hidden="true">
        <Doodle seed={face.seed} className="block h-full w-full" />
      </span>
      <span className="agent-head-text">
        <span className="agent-head-name">{face.name}</span>
        <span className="agent-head-meta">
          Your agent{personality ? `, ${PERSONALITY_LABEL[personality].toLowerCase()}` : ""}
        </span>
      </span>
      <Link
        href="/agent"
        target="_blank"
        rel="noopener"
        className="cx-icon-btn sm tap tip-below tip-end"
        data-tip="Agent settings"
        aria-label={`${face.name} settings (opens in a new tab)`}
      >
        <GearSix size={18} aria-hidden />
      </Link>
    </div>
  );
}
