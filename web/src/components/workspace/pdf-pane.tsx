"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  usePageScroller,
  usePaneWidth,
  ViewerError,
  ViewerToolbar,
  ZOOM_STEPS,
  type ViewerHandle,
} from "./viewer-chrome";

// Served from public/ rather than a CDN, so the viewer works offline and the
// worker version can never drift from the API version.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfPane({
  docId,
  pageCount,
  handleRef,
}: {
  docId: string;
  pageCount: number;
  handleRef: React.RefObject<ViewerHandle | null>;
}) {
  const { scrollRef, registerPage, handleScroll, current, flashPage, goToPage } =
    usePageScroller(handleRef);
  const width = usePaneWidth(scrollRef);

  const [loadedPages, setLoadedPages] = useState(pageCount || 0);
  const [failed, setFailed] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2);

  const file = useMemo(() => api.fileUrl(docId), [docId]);
  const total = loadedPages || pageCount;
  const pages = useMemo(
    () => Array.from({ length: total }, (_, i) => i + 1),
    [total],
  );

  const scale = ZOOM_STEPS[zoomIndex];
  const renderWidth = width > 0 ? Math.max(240, (width - 48) * scale) : undefined;

  return (
    <div className="relative flex h-full flex-col bg-n-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto px-6 py-6"
      >
        {failed ? (
          <ViewerError title="Could not render this PDF" message={failed} />
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => {
              setLoadedPages(numPages);
              setFailed(null);
            }}
            onLoadError={(e) => setFailed(e.message)}
            loading={<PageSkeletons count={pageCount || 3} />}
            error={null}
            className="mx-auto flex w-fit flex-col items-center gap-4"
          >
            {pages.map((page) => (
              <div
                key={page}
                data-page={page}
                ref={registerPage(page)}
                className={cn(
                  "overflow-hidden rounded-lg border border-n-3 bg-n-0",
                  flashPage === page && "cite-flash",
                )}
              >
                <Page
                  pageNumber={page}
                  width={renderWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={<PageSkeleton />}
                />
              </div>
            ))}
          </Document>
        )}
      </div>

      {!failed && total > 0 && (
        <ViewerToolbar
          pages={pages}
          current={current}
          locator="page"
          onGo={goToPage}
          zoom={{ index: zoomIndex, onChange: setZoomIndex }}
        />
      )}
    </div>
  );
}

/* A4 aspect ratio, so the layout never jumps when the real page arrives. */
function PageSkeleton() {
  return <div className="shimmer aspect-[1/1.414] w-full min-w-64" />;
}

function PageSkeletons({ count }: { count: number }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-n-3">
          <PageSkeleton />
        </div>
      ))}
    </div>
  );
}
