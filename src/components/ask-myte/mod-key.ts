"use client";

import { useEffect, useState } from "react";

/** "⌘" on Apple platforms, "Ctrl" elsewhere; "⌘" until mounted (the server cannot know). */
export function useModKey(): string {
  const [mod, setMod] = useState("⌘");
  useEffect(() => {
    const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
    if (!/mac|iphone|ipad|ipod/i.test(p)) setMod("Ctrl");
  }, []);
  return mod;
}
