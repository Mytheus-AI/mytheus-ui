import type { VoiceCatalog } from "../../src/lib/voice/catalog";

/* The Kokoro voices core-api offers (ADR-0050 D2), as `GET /api/v1/voice/voices` answers. */
export const VOICES: VoiceCatalog = {
  connected: true,
  voices: [
    { id: "af_heart", name: "Heart", description: "Warm and clear, the most natural of the set.", accent: "American", gender: "female" },
    { id: "af_bella", name: "Bella", description: "Bright and lively.", accent: "American", gender: "female" },
    { id: "af_kore", name: "Kore", description: "Calm and even.", accent: "American", gender: "female" },
    { id: "af_aoede", name: "Aoede", description: "Soft and unhurried.", accent: "American", gender: "female" },
    { id: "am_michael", name: "Michael", description: "Steady and low.", accent: "American", gender: "male" },
    { id: "am_fenrir", name: "Fenrir", description: "Deep and direct.", accent: "American", gender: "male" },
    { id: "am_puck", name: "Puck", description: "Light and friendly.", accent: "American", gender: "male" },
    { id: "bf_emma", name: "Emma", description: "Crisp British English.", accent: "British", gender: "female" },
    { id: "bm_george", name: "George", description: "Measured British English.", accent: "British", gender: "male" },
  ],
  chosen: null,
  selected: "af_heart",
};
