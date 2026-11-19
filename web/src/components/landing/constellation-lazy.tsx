"use client";

import dynamic from "next/dynamic";

/* three.js is most of the landing page's JavaScript and none of its content.
   Loading it as its own chunk, after hydration, keeps it off the critical
   path: the headline and copy are server-rendered and paint without it. The
   scene is decorative and absolutely positioned, so arriving late shifts
   nothing. */
export const Constellation = dynamic(
  () => import("./constellation").then((m) => m.Constellation),
  { ssr: false },
);
