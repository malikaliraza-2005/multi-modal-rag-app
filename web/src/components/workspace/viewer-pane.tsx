"use client";

import { FileQuestion } from "lucide-react";
import type { DocumentRecord } from "@/lib/api";
import { KIND_NOUN } from "@/lib/locator";
import { ImagePane } from "./image-pane";
import { PdfPane } from "./pdf-pane";
import { PreviewPane } from "./preview-pane";
import type { ViewerHandle } from "./viewer-chrome";

/** Picks the viewer for a document's format.

    Three cases, in decreasing fidelity: the browser renders it (PDF, images),
    we render the structure ingestion extracted (everything else), or — for an
    old record indexed before previews existed — we say so plainly rather than
    showing an empty pane. */
export function ViewerPane({
  doc,
  handleRef,
}: {
  doc: DocumentRecord;
  handleRef: React.RefObject<ViewerHandle | null>;
}) {
  if (doc.kind === "pdf") {
    return (
      <PdfPane docId={doc.doc_id} pageCount={doc.pages} handleRef={handleRef} />
    );
  }

  if (doc.kind === "image") {
    return <ImagePane docId={doc.doc_id} filename={doc.filename} />;
  }

  if (doc.has_preview) {
    return <PreviewPane docId={doc.doc_id} handleRef={handleRef} />;
  }

  return <NoViewer kind={doc.kind} />;
}

function NoViewer({ kind }: { kind: DocumentRecord["kind"] }) {
  return (
    <div className="flex h-full items-center justify-center bg-n-1 px-6">
      <div className="flex max-w-xs flex-col items-center gap-2 text-center">
        <FileQuestion size={18} strokeWidth={1.5} className="text-n-6" />
        <p className="text-sm font-medium text-n-11">Nothing to display</p>
        <p className="text-xs leading-relaxed text-n-7">
          This {KIND_NOUN[kind]} is fully indexed and answerable — it was just
          indexed before previews existed. Re-upload it to get one.
        </p>
      </div>
    </div>
  );
}
