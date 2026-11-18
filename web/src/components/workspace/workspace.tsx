"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Wordmark } from "@/components/shell/wordmark";
import { useChat } from "@/hooks/use-chat";
import { useDocument } from "@/hooks/use-documents";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { DocumentRecord } from "@/lib/api";
import { ChatPane } from "./chat-pane";
import { ChatSheet } from "./chat-sheet";
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

/** Below this, a side-by-side split leaves neither half usable: a page of A4
    stops being legible and the answer column falls under forty characters.
    Set above the phone range on purpose, so a portrait tablet stacks too. */
const NARROW = "(max-width: 899px)";

const layoutStorage: Pick<Storage, "getItem" | "setItem"> =
  typeof window === "undefined"
    ? { getItem: () => null, setItem: () => {} }
    : window.localStorage;

export function Workspace({ docId }: { docId: string }) {
  const viewer = useRef<ViewerHandle | null>(null);
  const { data: doc, isLoading, isError, error } = useDocument(docId);
  const narrow = useMediaQuery(NARROW);
  // `useDefaultLayout` reads the saved split through `useSyncExternalStore`
  // with the *same* snapshot on both sides, so the hydrating render already
  // knows the stored layout while the server HTML still carries `defaultSize`
  // — React sees `flexGrow` where it wrote `flex-basis` and reports a mismatch.
  // Holding the split back one commit keeps the two renders identical.
  const hydrated = useHydrated();
  const chat = useChat(docId);

  // The split position is a per-viewer preference, so it lives in localStorage.
  // Omitting `storage` is not an option: the hook then falls back to a bare
  // `localStorage` reference, which throws during server rendering.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: SPLIT_ID,
    panelIds: ["viewer", "chat"],
    storage: layoutStorage,
  });

  const goToPage = (page: number) => viewer.current?.goToPage(page);
  const ready = !isLoading && !!doc;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-header shrink-0 items-center gap-2 border-b border-n-3 px-3">
        {/* The wordmark is the first thing to go: at phone widths the filename
            is what tells you where you are, and the mark is one tap away in
            the switcher's own menu. */}
        <div className="hidden items-center gap-2 min-[400px]:flex">
          <Wordmark />
          <div className="mx-1 h-4 w-px bg-n-3" />
        </div>
        {doc ? (
          <DocumentSwitcher docId={docId} filename={doc.filename} />
        ) : (
          <div className="shimmer h-3 w-40 min-w-0 rounded" />
        )}
        <div className="ml-auto pl-1">
          <ThemeToggle />
        </div>
      </header>

      {isError ? (
        <NotFound message={error.message} />
      ) : !hydrated ? (
        <SplitSkeleton />
      ) : narrow ? (
        <Stacked doc={ready ? doc : null} viewerRef={viewer}>
          {(height) =>
            ready && (
              <ChatSheet
                chat={chat}
                doc={doc}
                containerHeight={height}
                onGoToPage={goToPage}
              />
            )
          }
        </Stacked>
      ) : (
        <Group
          id={SPLIT_ID}
          orientation="horizontal"
          className="min-h-0 flex-1"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="viewer" defaultSize={55} minSize={30} className="min-w-0">
            {ready ? (
              <ViewerPane doc={doc} handleRef={viewer} />
            ) : (
              <div className="h-full bg-n-1" />
            )}
          </Panel>

          {/* Hairline divider with a generous grab target. */}
          <Separator className="group relative w-px bg-n-3 outline-none data-[state=drag]:bg-accent">
            <span className="absolute inset-y-0 -left-1 -right-1 transition-colors duration-150 group-hover:bg-accent/30" />
          </Separator>

          <Panel id="chat" defaultSize={45} minSize={28} className="min-w-0">
            {ready ? (
              <ChatPane chat={chat} doc={doc} onGoToPage={goToPage} />
            ) : (
              <div className="h-full bg-n-0" />
            )}
          </Panel>
        </Group>
      )}
    </div>
  );
}

/** What the server sends, and the only thing the split could show at that
    point anyway — the two panes before either has a document in it. Sized in
    proportion rather than at the panels' own `defaultSize`, which the library
    server-renders as a literal 55px and 45px. */
function SplitSkeleton() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-55 bg-n-1" />
      <div className="w-px bg-n-3" />
      <div className="min-w-0 flex-45 bg-n-0" />
    </div>
  );
}

/** The narrow layout: one document, full width, with the chat sheet laid over
    it. The viewer stops short of the collapsed sheet rather than running under
    it, so its page toolbar stays reachable at every sheet height. */
function Stacked({
  doc,
  viewerRef,
  children,
}: {
  doc: DocumentRecord | null;
  viewerRef: React.RefObject<ViewerHandle | null>;
  children: (containerHeight: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const height = useElementHeight(ref);

  return (
    <div ref={ref} className="relative min-h-0 flex-1">
      <div className="absolute inset-x-0 top-0 bottom-sheet-peek">
        {doc ? (
          <ViewerPane doc={doc} handleRef={viewerRef} />
        ) : (
          <div className="h-full bg-n-1" />
        )}
      </div>
      {children(height)}
    </div>
  );
}

/** The sheet snaps to fractions of the area it covers, so that area has to be
    measured rather than assumed — mobile browser chrome changes it mid-scroll. */
function useElementHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return height;
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
