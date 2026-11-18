"use client";

import { useSyncExternalStore } from "react";

/** Nothing ever invalidates the flag; React flips it on its own by re-reading
    the snapshot once hydration is done. */
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** False for the server render and for the client render that hydrates it, true
    from the commit after.

    For anything whose first render would otherwise disagree with the HTML the
    server sent — a value read from `localStorage`, a resolved theme, a measured
    viewport. Reading it during hydration is what React reports as a mismatch;
    reading it one commit later is free. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, onClient, onServer);
}
