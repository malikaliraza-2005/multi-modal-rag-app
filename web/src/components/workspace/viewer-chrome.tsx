"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locator } from "@/lib/api";

/** What the chat pane calls to follow a citation. Every viewer implements it,
    whether it is showing a PDF, a picture or a parsed deck. */
export type ViewerHandle = { goToPage: (page: number) => void };

export const ZOOM_STEPS = [0.75, 0.9, 1, 1.25, 1.5, 2] as const;

/** Scroll-to-citation, shared by the panes that have numbered units.

    Pages are registered by number rather than by index, because a preview's
    numbering comes from the source file and need not start at 1 or be dense. */
export function usePageScroller(handleRef: React.RefObject<ViewerHandle | null>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());

  const [current, setCurrent] = useState(1);
  const [flashPage, setFlashPage] = useState<number | null>(null);

  const goToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrent(page);
    setFlashPage(page);
    window.setTimeout(() => setFlashPage(null), 900);
  }, []);

  useEffect(() => {
    handleRef.current = { goToPage };
  }, [handleRef, goToPage]);

  const registerPage = useCallback(
    (page: number) => (el: HTMLElement | null) => {
      if (el) pageRefs.current.set(page, el);
      else pageRefs.current.delete(page);
    },
    [],
  );

  /** Track the unit nearest the top of the viewport for the indicator. */
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top;
    let best: number | null = null;
    let bestDist = Infinity;
    for (const [page, el] of pageRefs.current) {
      const dist = Math.abs(el.getBoundingClientRect().top - top);
      if (dist < bestDist) {
        bestDist = dist;
        best = page;
      }
    }
    if (best !== null) setCurrent((c) => (best === c ? c : best));
  }, []);

  return { scrollRef, registerPage, handleScroll, current, setCurrent, flashPage, goToPage };
}

/** Observe a pane's own width, so content is laid out to the split rather than
    to the window. */
export function usePaneWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export function ViewerToolbar({
  pages,
  current,
  locator,
  onGo,
  zoom,
}: {
  pages: number[];
  current: number;
  locator: Locator;
  onGo: (page: number) => void;
  /** Omitted by panes whose content reflows — there is nothing to scale. */
  zoom?: { index: number; onChange: (index: number) => void };
}) {
  const index = pages.indexOf(current);
  const position = index === -1 ? 0 : index;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-n-3 bg-n-0 p-1 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.2)]">
        {pages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Previous ${locator}`}
              disabled={position <= 0}
              onClick={() => onGo(pages[position - 1])}
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </Button>
            <span className="min-w-20 px-1 text-center font-mono text-xs tabular-nums text-n-9">
              {position + 1} / {pages.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Next ${locator}`}
              disabled={position >= pages.length - 1}
              onClick={() => onGo(pages[position + 1])}
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </Button>
          </>
        )}

        {pages.length > 1 && zoom && <div className="mx-1 h-5 w-px bg-n-3" />}

        {zoom && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              disabled={zoom.index === 0}
              onClick={() => zoom.onChange(Math.max(0, zoom.index - 1))}
            >
              <Minus size={16} strokeWidth={1.5} />
            </Button>
            <span className="min-w-11 text-center font-mono text-xs tabular-nums text-n-9">
              {Math.round(ZOOM_STEPS[zoom.index] * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              disabled={zoom.index === ZOOM_STEPS.length - 1}
              onClick={() =>
                zoom.onChange(Math.min(ZOOM_STEPS.length - 1, zoom.index + 1))
              }
            >
              <Plus size={16} strokeWidth={1.5} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function ViewerError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-2 text-center">
      <TriangleAlert size={18} strokeWidth={1.5} className="text-n-6" />
      <p className="text-sm font-medium text-n-11">{title}</p>
      <p className="text-xs text-n-7">{message}</p>
    </div>
  );
}
