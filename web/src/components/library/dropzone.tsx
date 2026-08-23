"use client";

import { useQuery } from "@tanstack/react-query";
import { FileUp, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUploadDocument } from "@/hooks/use-documents";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

// Used until /filetypes answers, so the picker is never briefly unrestricted.
const FALLBACK_EXTENSIONS = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg"];

export function Dropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The allowlist lives in the API — mirroring it here would let the picker
  // drift from what the server will actually accept.
  const { data: fileTypes } = useQuery({
    queryKey: ["filetypes"],
    queryFn: api.fileTypes,
    staleTime: Infinity,
  });

  const extensions = fileTypes?.extensions ?? FALLBACK_EXTENSIONS;
  const accept = useMemo(() => extensions.join(","), [extensions]);

  const upload = useUploadDocument((doc) => router.push(`/d/${doc.doc_id}`));
  const busy = upload.isPending;

  function accepted(files: FileList | null) {
    const file = files?.[0];
    if (file) upload.mutate(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) accepted(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-lg border border-dashed px-6 py-8",
          "transition-colors duration-150 ease-out",
          dragging ? "border-accent bg-accent-soft" : "border-n-4 bg-n-1",
          busy && "border-solid border-n-3",
        )}
      >
        {busy ? (
          <IndexingState />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <FileUp size={20} strokeWidth={1.5} className="text-n-6" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-n-11">
                Drop a document to index it
              </p>
              <p className="text-xs text-n-7">
                PDFs, Word, PowerPoint, spreadsheets and images. Text, figures
                and tables are extracted and embedded separately.
              </p>
            </div>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <FormatList extensions={extensions} />
            {/* Stated before the upload rather than as a rejection after it. */}
            {fileTypes && (
              <p className="text-2xs text-n-6">
                Up to {Math.round(fileTypes.max_bytes / 1024 / 1024)} MB
                {fileTypes.uploads_per_hour > 0 &&
                  `, ${fileTypes.uploads_per_hour} documents an hour`}
                .
              </p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            accepted(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {upload.isError && (
        <div className="mt-3 flex items-start gap-2 rounded border border-n-3 bg-danger-soft px-3 py-2">
          <TriangleAlert
            size={14}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-danger"
          />
          <div className="flex-1 space-y-1">
            <p className="text-xs text-n-11">{upload.error.message}</p>
            <button
              onClick={() => upload.reset()}
              className="text-xs font-medium text-n-9 underline underline-offset-2 hover:text-n-11"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The full allowlist, set quietly — it answers "will it take my file?"
    without competing with the call to action above it. */
function FormatList({ extensions }: { extensions: string[] }) {
  return (
    <p className="max-w-md font-mono text-2xs leading-relaxed text-n-6">
      {extensions.map((ext) => ext.replace(/^\./, "")).join(" · ")}
    </p>
  );
}

/** Ingestion runs hi-res layout detection plus a vision pass per figure —
    minutes, not seconds. Say so rather than implying it is quick. */
function IndexingState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-1 w-48 overflow-hidden rounded-full bg-n-3">
        <div className="indeterminate h-full w-1/3 rounded-full bg-n-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-n-11">Indexing document</p>
        <p className="text-xs text-n-7">
          Parsing layout, summarising figures and tables, then embedding. This
          can take several minutes on a long PDF or a picture-heavy deck.
        </p>
      </div>
    </div>
  );
}
