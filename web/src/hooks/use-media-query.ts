"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Reads a media query reactively.

    The server has no viewport, so it reports `false` and the wide layout is
    what gets sent down; a narrow client swaps to its own tree on hydration.
    That ordering is deliberate — the split layout is the one that renders
    correctly at any width, so a momentary mismatch is never broken chrome. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
