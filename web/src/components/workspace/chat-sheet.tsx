"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Chat } from "@/hooks/use-chat";
import type { DocumentRecord } from "@/lib/api";
import { cn } from "@/lib/cn";
import { KIND_NOUN } from "@/lib/locator";
import { ChatPane } from "./chat-pane";

/** The collapsed height: the grab bar and nothing else. Mirrors
    `--spacing-sheet-peek`, which the viewer uses to end above the sheet so its
    own toolbar is never buried. */
export const PEEK = 52;

/** Enough transcript to read a paragraph of answer, with the top of the
    document still in view above it. */
const HALF = 0.58;

/** Below this, a drag is a tap. */
const TAP_SLOP = 4;

type Snap = "peek" | "half" | "full";

const ORDER: Snap[] = ["peek", "half", "full"];

/** On the narrow layout the chat rides over the document rather than beside
    it, on a sheet that snaps between three heights. Dragging the bar moves it
    continuously; the two buttons step it, which is what a keyboard and a
    screen reader get. */
export function ChatSheet({
  chat,
  doc,
  containerHeight,
  onGoToPage,
}: {
  chat: Chat;
  doc: DocumentRecord;
  /** Height of the workspace body, in px — the sheet's ceiling. */
  containerHeight: number;
  onGoToPage: (page: number) => void;
}) {
  const [snap, setSnap] = useState<Snap>("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const keyboardInset = useKeyboardInset();

  // The keyboard eats into the bottom of the window, so the sheet stands on
  // top of it and loses that much ceiling.
  const available = Math.max(PEEK, containerHeight - keyboardInset);

  const snapPoints = useMemo(
    () => ({
      peek: PEEK,
      half: Math.max(PEEK, Math.round(available * HALF)),
      full: available,
    }),
    [available],
  );

  const measured = containerHeight > 0;
  const dragging = dragHeight !== null;
  const height = measured ? (dragHeight ?? snapPoints[snap]) : PEEK;

  const drag = useRef<{ y: number; height: number; moved: number } | null>(null);

  function step(by: 1 | -1) {
    const next = ORDER.indexOf(snap) + by;
    if (next >= 0 && next < ORDER.length) setSnap(ORDER[next]);
  }

  function nearestSnap(to: number): Snap {
    return ORDER.reduce((best, s) =>
      Math.abs(snapPoints[s] - to) < Math.abs(snapPoints[best] - to) ? s : best,
    );
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!measured || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, height, moved: 0 };
    setDragHeight(height);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dy));
    setDragHeight(Math.min(available, Math.max(PEEK, d.height - dy)));
  }

  function onPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // A tap on the bar opens a closed sheet; on an open one it does nothing,
    // so a stray thumb never dismisses the answer being read.
    if (d.moved < TAP_SLOP) {
      if (snap === "peek") setSnap("half");
    } else {
      setSnap(nearestSnap(dragHeight ?? d.height));
    }
    setDragHeight(null);
  }

  const closed = snap === "peek" && !dragging;

  return (
    <div
      style={{ height, bottom: keyboardInset }}
      className={cn(
        "absolute inset-x-0 z-20 flex flex-col overflow-hidden",
        "rounded-t-lg border-t border-n-3 bg-n-0",
        // Shadow only where something genuinely floats over other content.
        "shadow-[0_-10px_30px_-16px_rgb(0_0_0/0.35)]",
        dragging ? "transition-none" : "transition-[height] duration-200 ease-out",
      )}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex h-13 shrink-0 touch-none select-none items-center gap-2 px-3 pt-2"
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-n-4"
        />

        <span className="min-w-0 truncate text-xs font-medium text-n-9">
          {chat.turns.length === 0
            ? `Ask about this ${KIND_NOUN[doc.kind]}`
            : "Chat"}
        </span>
        {chat.turns.length > 0 && (
          <span className="shrink-0 font-mono text-2xs tabular-nums text-n-6">
            {chat.turns.length}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Collapse chat"
            disabled={snap === "peek"}
            onClick={() => step(-1)}
          >
            <ChevronDown size={16} strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand chat"
            disabled={snap === "full"}
            onClick={() => step(1)}
          >
            <ChevronUp size={16} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Hidden rather than unmounted, so the transcript keeps its scroll
          position across a collapse. `invisible` also takes the composer out
          of the tab order, which `overflow-hidden` alone would not. */}
      <div className={cn("min-h-0 flex-1", closed && "invisible")}>
        <ChatPane
          chat={chat}
          doc={doc}
          onGoToPage={(page) => {
            onGoToPage(page);
            // The point of a citation is to look at the page, so get out of
            // the way of the one we just scrolled to.
            setSnap("peek");
          }}
        />
      </div>
    </div>
  );
}

/** How much of the window the on-screen keyboard is covering.

    Mobile browsers do not reflow the layout viewport when the keyboard opens,
    so without this the composer sits underneath it. The threshold keeps the
    sheet still for the small visual-viewport shifts that come from pinch-zoom
    and the collapsing URL bar. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 80 ? Math.round(covered) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
