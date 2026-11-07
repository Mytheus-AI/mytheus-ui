import { useSyncExternalStore } from "react";

/* True under the 960px breakpoint where the room switches to a bottom sheet. Server snapshot is
   false so the first paint matches the desktop markup and hydration never mismatches; the layout
   itself is pure CSS (`max-[959px]:` / `min-[960px]:`), this only drives which state a control
   toggles. */
const QUERY = "(max-width: 959px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
