"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Wordmark } from "@/components/shell/wordmark";
import { useDocument } from "@/hooks/use-documents";
import { ChatPane } from "./chat-pane";
import { DocumentSwitcher } from "./document-switcher";
import type { ViewerHandle } from "./viewer-chrome";

// pdfjs-dist constructs a DOMMatrix at module scope, which does not exist in
// Node — so the viewer, and therefore the dispatcher that pulls it in, is
// client-only.
const ViewerPane = dynamic(
  () => import("./viewer-pane").then((m) => m.ViewerPane),
  {
    ssr: false,
    loading: () => <div className="h-full bg-n-1" />,
  },
);

const SPLIT_ID = "atlas:workspace-split";

const layoutStorage: Pick<Storage, "getItem" | "setItem"> =
  typeof window === "undefined"
    ? { getItem: () => null, setItem: () => {} }
    : window.localStorage;

export function Workspace({ docId }: { docId: string }) {
  const viewer = useRef<ViewerHandle | null>(null);
  const { data: doc, isLoading, isError, error } = useDocument(docId);

  // The split position is a per-viewer preference, so it lives in localStorage.
  // Omitting `storage` is not an option: the hook then falls back to a bare
  // `localStorage` reference, which throws during server rendering.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: SPLIT_ID,
    panelIds: ["viewer", "chat"],
    storage: layoutStorage,
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-header shrink-0 items-center gap-2 border-b border-n-3 px-3">
        <Wordmark />
        <div className="mx-1 h-4 w-px bg-n-3" />
        {doc ? (
          <DocumentSwitcher docId={docId} filename={doc.filename} />
        ) : (
          <div className="shimmer h-3 w-40 rounded" />
        )}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {isError ? (
        <NotFound message={error.message} />
      ) : (
        <Group
          id={SPLIT_ID}
          orientation="horizontal"
          className="min-h-0 flex-1"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="viewer" defaultSize={55} minSize={30} className="min-w-0">
            {isLoading || !doc ? (
              <div className="h-full bg-n-1" />
            ) : (
              <ViewerPane doc={doc} handleRef={viewer} />
            )}
          </Panel>

          {/* Hairline divider with a generous grab target. */}
          <Separator className="group relative w-px bg-n-3 outline-none data-[state=drag]:bg-accent">
            <span className="absolute inset-y-0 -left-1 -right-1 transition-colors duration-150 group-hover:bg-accent/30" />
          </Separator>

          <Panel id="chat" defaultSize={45} minSize={28} className="min-w-0">
            {isLoading || !doc ? (
              <div className="h-full bg-n-0" />
            ) : (
              <ChatPane
                docId={docId}
                doc={doc}
                onGoToPage={(page) => viewer.current?.goToPage(page)}
              />
            )}
          </Panel>
        </Group>
      )}
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-sm space-y-3 text-center">
        <p className="text-sm font-medium text-n-11">Document unavailable</p>
        <p className="text-xs leading-relaxed text-n-7">{message}</p>
        <Link
          href="/library"
          className="inline-flex h-7 items-center gap-1.5 rounded border border-n-3 bg-n-0 px-2.5 text-xs font-medium text-n-11 transition-colors duration-150 hover:bg-n-1 hover:border-n-4"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to library
        </Link>
      </div>
    </div>
  );
}
