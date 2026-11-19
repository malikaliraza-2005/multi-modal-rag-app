"use client";

import { useEffect, useState } from "react";
import type { Options } from "react-markdown";

type Plugins = NonNullable<Options["remarkPlugins"]>;

/** Whether this browser can parse a regex lookbehind. Safari only gained it in
    16.4, and iOS 15 (the last on an iPhone 7) never will. */
function supportsLookbehind() {
  try {
    new RegExp("(?<=a)b");
    return true;
  } catch {
    return false;
  }
}

/** remark-gfm, but only where it can run.

    Its email-autolink pattern is a regex literal with a lookbehind. That is a
    parse error, not a runtime one, on older Safari: imported statically, the
    whole chunk it sits in fails to load and takes the workspace down with it.
    No build target can rewrite it. So it is fetched as its own chunk, and only
    after the browser has proved it can read it. Elsewhere answers render as
    plain markdown: tables arrive as text, everything else is unchanged. */
export function useRemarkGfm(): Plugins {
  const [plugins, setPlugins] = useState<Plugins>([]);

  useEffect(() => {
    if (!supportsLookbehind()) return;
    let live = true;
    import("remark-gfm")
      .then((m) => {
        if (live) setPlugins([m.default]);
      })
      .catch(() => {
        // Plain markdown is a fine fallback; a failed chunk is not an error
        // worth showing anyone.
      });
    return () => {
      live = false;
    };
  }, []);

  return plugins;
}
