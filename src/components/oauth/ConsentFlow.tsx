"use client";

import { useState } from "react";
import type { ConsentProblem } from "@/lib/oauth-consent";
import { ConsentCard, type ConsentDetailsView } from "./ConsentCard";
import { ConsentProblemView } from "./ConsentProblemView";

/* The consent card, swapped for the matching explanation when the request stops being approvable
   while the page is open (it expired, or the app was removed). */
export function ConsentFlow({ details, request }: { details: ConsentDetailsView; request: string }) {
  const [problem, setProblem] = useState<ConsentProblem | null>(null);
  if (problem) return <ConsentProblemView problem={problem} />;
  return <ConsentCard details={details} request={request} onProblem={setProblem} />;
}
