"use client";

import { useState } from "react";
import type { Locator, Source } from "@/lib/api";
import { cn } from "@/lib/cn";
import { citationBlank, citationLabel } from "@/lib/locator";

const CATEGORY_LABEL: Record<Source["category"], string> = {
  text: "text",
  figure: "figure",
  table: "table",
};

export function SourceList({
  sources,
  locator,
  onGoToPage,
}: {
  sources: Source[];
  locator: Locator;
  onGoToPage: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-n-3 pt-3">
      <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-n-7">
        Sources
      </p>
      <ol className="space-y-px">
        {sources.map((source, i) => {
          const isOpen = expanded === i;
          const hasPage = source.page > 0;

          return (
            <li key={i}>
              <div className="flex items-stretch gap-1">
                <button
                  onClick={() => hasPage && onGoToPage(source.page)}
                  disabled={!hasPage}
                  title={
                    hasPage
                      ? `Go to ${locator} ${source.page}`
                      : `The ${locator} this came from is unknown`
                  }
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left",
                    "transition-colors duration-100",
                    hasPage
                      ? "hover:bg-accent-soft"
                      : "cursor-default opacity-70",
                  )}
                >
                  <span className="w-4 shrink-0 font-mono text-2xs tabular-nums text-n-6">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "w-9 shrink-0 font-mono text-xs tabular-nums",
                      hasPage ? "text-accent" : "text-n-6",
                    )}
                  >
                    {hasPage
                      ? citationLabel(locator, source.page)
                      : citationBlank(locator)}
                  </span>
                  <span className="w-12 shrink-0 text-2xs text-n-7">
                    {CATEGORY_LABEL[source.category]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-n-8">
                    {source.snippet}
                  </span>
                  <ScoreBar score={source.score} />
                </button>

                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Hide excerpt" : "Show excerpt"}
                  className="shrink-0 rounded px-1.5 text-2xs text-n-6 transition-colors duration-100 hover:bg-n-2 hover:text-n-9"
                >
                  {isOpen ? "less" : "more"}
                </button>
              </div>

              {isOpen && (
                <p className="mb-1 ml-7 mr-8 mt-1 rounded border border-n-3 bg-n-1 p-2 text-xs leading-relaxed text-n-9">
                  {source.snippet}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Cosine relevance, clamped — Chroma can return small negatives. */
function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score));
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="h-1 w-10 overflow-hidden rounded-full bg-n-3">
        <span
          className="block h-full rounded-full bg-accent/60"
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="w-8 text-right font-mono text-2xs tabular-nums text-n-6">
        {score.toFixed(2)}
      </span>
    </span>
  );
}
