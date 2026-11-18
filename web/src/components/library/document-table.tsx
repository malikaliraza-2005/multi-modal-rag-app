"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { baseName, extensionTag, formatBytes, formatDate } from "@/lib/format";
import { extentLabel } from "@/lib/locator";

// Numeric columns stay narrow so the document name gets the slack.
const NUM = "w-20 px-3 text-right font-mono text-xs tabular-nums text-n-8";

/** Seven columns need about 640px before they stop being a row of stubs. Below
    that the table drops to name-and-actions and the same facts ride under the
    name instead — a phone gets the whole filename rather than a sideways
    scroll through columns four characters wide. */
const WIDE = "hidden md:table-cell";

export function DocumentTable() {
  const { data, isLoading, isError, error, refetch } = useDocuments();
  const del = useDeleteDocument();

  if (isLoading) return <TableSkeleton />;

  if (isError) {
    return (
      <Panel>
        <p className="text-sm text-n-11">{error.message}</p>
        <Button size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </Panel>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-n-8">
          No documents indexed yet. Add a file above to start asking questions.
        </p>
      </Panel>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-n-3">
      {/* The minimum only applies once the counts are actually shown. Below
          that the table has three columns and fits any phone, so forcing it
          640px wide would have bought nothing but sideways scrolling. */}
      <table className="w-full border-collapse md:min-w-160">
        <thead>
          <tr className="border-b border-n-3 bg-n-1">
            <Th className="w-auto text-left">Document</Th>
            <Th className={`w-24 text-right ${WIDE}`}>Length</Th>
            <Th className={`w-20 text-right ${WIDE}`}>Chunks</Th>
            <Th className={`w-20 text-right ${WIDE}`}>Figures</Th>
            <Th className={`w-20 text-right ${WIDE}`}>Tables</Th>
            <Th className={`w-20 text-right ${WIDE}`}>Size</Th>
            <Th className={`w-28 text-right ${WIDE}`}>Indexed</Th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {data.map((doc) => (
            <tr
              key={doc.doc_id}
              className="group border-b border-n-3 transition-colors duration-100 last:border-0 hover:bg-n-1"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/d/${doc.doc_id}`}
                  className="flex min-w-0 items-center gap-2 rounded text-sm font-medium text-n-11 hover:text-accent"
                  title={doc.filename}
                >
                  {/* Without `min-w-0` a flex item refuses to go below its
                      min-content width, and a filename with no spaces in it is
                      one long word — the cell would then widen the table past
                      the screen instead of truncating. */}
                  <span className="min-w-0 truncate">
                    {baseName(doc.filename)}
                  </span>
                  {/* The library is mixed-format now, so the row has to say
                      which format it is — the name alone no longer does. */}
                  <span className="shrink-0 rounded border border-n-3 px-1 py-px font-mono text-2xs font-normal uppercase text-n-7">
                    {extensionTag(doc.filename, doc.ext)}
                  </span>
                </Link>
                {/* The columns, folded into a line, for the widths that cannot
                    carry columns. Same order, so moving between the two
                    layouts does not mean re-learning the row. */}
                <p className="mt-1 flex flex-wrap gap-x-2 font-mono text-2xs tabular-nums text-n-7 md:hidden">
                  <span>{extentLabel(doc.locator, doc.pages)}</span>
                  <span aria-hidden>·</span>
                  <span>{formatBytes(doc.size)}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                </p>
              </td>
              <td className={`${NUM} w-24 whitespace-nowrap ${WIDE}`}>
                {extentLabel(doc.locator, doc.pages)}
              </td>
              <td className={`${NUM} ${WIDE}`}>{doc.chunk_count}</td>
              <td className={`${NUM} ${WIDE}`}>{doc.image_count}</td>
              <td className={`${NUM} ${WIDE}`}>{doc.table_count}</td>
              <td className={`${NUM} ${WIDE}`}>{formatBytes(doc.size)}</td>
              <td className={`${NUM} w-28 whitespace-nowrap ${WIDE}`}>
                {formatDate(doc.created_at)}
              </td>
              <td className="px-1">
                <Menu>
                  <MenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${doc.filename}`}
                      // Revealed on hover only where hovering exists. On a
                      // touch screen there is no pointer to rest on the row,
                      // so hiding it behind `group-hover` left the only way to
                      // delete a document unreachable.
                      className="[@media(any-hover:hover)]:opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal size={16} strokeWidth={1.5} />
                    </Button>
                  </MenuTrigger>
                  <MenuContent align="end">
                    <MenuItem
                      className="text-danger data-highlighted:bg-danger-soft data-highlighted:text-danger"
                      onSelect={() =>
                        del.mutate(doc.doc_id, {
                          onSuccess: () =>
                            toast.success("Document removed", {
                              description: baseName(doc.filename),
                            }),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                      Delete document and index
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className = "w-20 text-right",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-n-7 ${className}`}
    >
      {children}
    </th>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-n-3 bg-n-1 px-6 py-8">
      {children}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-n-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-n-3 px-3 py-3 last:border-0"
        >
          <div className="shimmer h-3 w-full max-w-48 rounded" />
          <div className="ml-auto shimmer hidden h-3 w-10 rounded md:block" />
          <div className="shimmer hidden h-3 w-10 rounded md:block" />
          <div className="shimmer hidden h-3 w-16 rounded md:block" />
        </div>
      ))}
    </div>
  );
}
