"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, type PreviewBlock, type PreviewPage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { locatorTitle } from "@/lib/locator";
import {
  usePageScroller,
  ViewerError,
  ViewerToolbar,
  type ViewerHandle,
} from "./viewer-chrome";

/** The stand-in shown for .docx, .pptx, spreadsheets and the rest — formats no
    browser opens natively. It is the structure ingestion already produced, in
    reading order, under the same numbering the citations point at.

    Type is set narrow and paper-like rather than reproducing the source's
    layout: this is here to let you check what an answer was drawn from, not to
    pass for the original file. */
export function PreviewPane({
  docId,
  handleRef,
}: {
  docId: string;
  handleRef: React.RefObject<ViewerHandle | null>;
}) {
  const { scrollRef, registerPage, handleScroll, current, flashPage, goToPage } =
    usePageScroller(handleRef);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["preview", docId],
    queryFn: () => api.getPreview(docId),
    staleTime: Infinity,
  });

  const pageNumbers = useMemo(
    () => data?.pages.map((p) => p.number) ?? [],
    [data],
  );

  return (
    <div className="relative flex h-full flex-col bg-n-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto px-6 py-6"
      >
        {isError ? (
          <ViewerError title="Preview unavailable" message={error.message} />
        ) : isLoading || !data ? (
          <PreviewSkeleton />
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {data.pages.map((page) => (
              <article
                key={page.number}
                ref={registerPage(page.number)}
                className={cn(
                  "rounded-lg border border-n-3 bg-n-0 px-7 py-6",
                  flashPage === page.number && "cite-flash",
                )}
              >
                <p className="mb-4 font-mono text-2xs uppercase tracking-wider text-n-6">
                  {locatorTitle(data.locator, page.number)}
                </p>
                <PageBody page={page} docId={docId} />
              </article>
            ))}
          </div>
        )}
      </div>

      {!isError && pageNumbers.length > 0 && (
        <ViewerToolbar
          pages={pageNumbers}
          current={current}
          locator={data?.locator ?? "page"}
          onGo={goToPage}
        />
      )}
    </div>
  );
}

function PageBody({ page, docId }: { page: PreviewPage; docId: string }) {
  return (
    <div className="space-y-3">
      {page.blocks.map((block, i) => (
        <Block key={i} block={block} docId={docId} />
      ))}
    </div>
  );
}

function Block({ block, docId }: { block: PreviewBlock; docId: string }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="pt-2 text-base font-semibold tracking-tight text-n-12 first:pt-0">
          {block.text}
        </h3>
      );

    case "list_item":
      return (
        <p className="flex gap-2 text-sm leading-relaxed text-n-10">
          <span aria-hidden className="select-none text-n-6">
            •
          </span>
          <span>{block.text}</span>
        </p>
      );

    case "table":
      return <TableBlock html={block.html} />;

    case "image":
      return (
        <figure className="space-y-1.5 py-1">
          <div className="overflow-hidden rounded border border-n-3 bg-n-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.previewFigureUrl(docId, block.src)}
              alt={block.caption || "Figure from the document"}
              loading="lazy"
              className="block h-auto w-full"
            />
          </div>
          {block.caption && (
            <figcaption className="text-2xs leading-relaxed text-n-7">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    default:
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-n-10">
          {block.text}
        </p>
      );
  }
}

type Cell = { text: string; header: boolean; colSpan: number; rowSpan: number };

/** Tables arrive as HTML from the parser, which means arbitrary markup lifted
    out of a user's file. Rather than trusting it into the DOM, read the grid
    out and render our own — the styling is ours either way. */
function TableBlock({ html }: { html: string }) {
  const rows = useMemo<Cell[][]>(() => {
    if (typeof window === "undefined") return [];
    const doc = new DOMParser().parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th,td")).map((cell) => ({
        text: cell.textContent?.trim() ?? "",
        header: cell.tagName === "TH",
        colSpan: Number((cell as HTMLTableCellElement).colSpan) || 1,
        rowSpan: Number((cell as HTMLTableCellElement).rowSpan) || 1,
      })),
    );
  }, [html]);

  if (rows.length === 0) return null;

  // The first row is the header when the parser did not mark one — that is
  // what a spreadsheet or a Word table almost always means by its top row.
  const implicitHeader = !rows.some((row) => row.some((cell) => cell.header));

  return (
    <div className="-mx-1 overflow-x-auto py-1">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const Tag = cell.header || (implicitHeader && r === 0) ? "th" : "td";
                return (
                  <Tag
                    key={c}
                    colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    className={cn(
                      "border border-n-3 px-2 py-1 text-left align-top",
                      Tag === "th"
                        ? "bg-n-1 font-medium text-n-11"
                        : "text-n-9",
                    )}
                  >
                    {cell.text}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-lg border border-n-3 bg-n-0 px-7 py-6"
        >
          <div className="shimmer h-3 w-10 rounded" />
          <div className="shimmer h-4 w-2/5 rounded" />
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-11/12 rounded" />
          <div className="shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
