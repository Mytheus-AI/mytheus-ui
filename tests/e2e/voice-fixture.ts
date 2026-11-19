import type { VoiceCatalog } from "../../src/lib/voice/catalog";

/* The Deepgram Aura-2 voices core-api offers (ADR-0052, ADR-0050 D2), as `GET /api/v1/voice/voices` answers. */
export const VOICES: VoiceCatalog = {
  connected: true,
  voices: [
    { id: "aura-2-thalia-en", name: "Thalia", description: "Clear and confident", accent: "American", gender: "female" },
    { id: "aura-2-helena-en", name: "Helena", description: "Warm and friendly", accent: "American", gender: "female" },
    { id: "aura-2-callista-en", name: "Callista", description: "Crisp and professional", accent: "American", gender: "female" },
    { id: "aura-2-harmonia-en", name: "Harmonia", description: "Calm and gentle", accent: "American", gender: "female" },
    { id: "aura-2-orpheus-en", name: "Orpheus", description: "Steady and confident", accent: "American", gender: "male" },
    { id: "aura-2-zeus-en", name: "Zeus", description: "Deep and grounded", accent: "American", gender: "male" },
    { id: "aura-2-apollo-en", name: "Apollo", description: "Relaxed and easygoing", accent: "American", gender: "male" },
    { id: "aura-2-pandora-en", name: "Pandora", description: "Smooth and articulate", accent: "British", gender: "female" },
    { id: "aura-2-draco-en", name: "Draco", description: "Warm and measured", accent: "British", gender: "male" },
  ],
  chosen: null,
  selected: "aura-2-thalia-en",
};
