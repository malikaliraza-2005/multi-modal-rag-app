"use client";

import { useMutation } from "@tanstack/react-query";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type DocumentRecord, type Source } from "@/lib/api";
import { KIND_NOUN } from "@/lib/locator";
import { Composer } from "./composer";
import { SourceList } from "./source-list";

type Turn = {
  id: number;
  question: string;
  answer?: string;
  sources?: Source[];
  error?: string;
};

let nextId = 0;

export function ChatPane({
  docId,
  doc,
  onGoToPage,
}: {
  docId: string;
  doc: DocumentRecord;
  onGoToPage: (page: number) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: ({ question }: { id: number; question: string }) =>
      api.query(docId, question),
    onSuccess: (data, { id }) =>
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id
            ? { ...turn, answer: data.answer, sources: data.sources }
            : turn,
        ),
      ),
    onError: (error, { id }) =>
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id ? { ...turn, error: error.message } : turn,
        ),
      ),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  function send(question: string) {
    const id = nextId++;
    setTurns((t) => [...t, { id, question }]);
    ask.mutate({ id, question });
  }

  function retry(turn: Turn) {
    setTurns((t) =>
      t.map((x) => (x.id === turn.id ? { ...x, error: undefined } : x)),
    );
    ask.mutate({ id: turn.id, question: turn.question });
  }

  return (
    <div className="flex h-full flex-col bg-n-0">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
          {turns.length === 0 ? (
            <EmptyState doc={doc} onPick={send} />
          ) : (
            <div className="space-y-8">
              {turns.map((turn) => (
                <TurnView
                  key={turn.id}
                  turn={turn}
                  doc={doc}
                  onGoToPage={onGoToPage}
                  onRetry={() => retry(turn)}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <Composer onSend={send} disabled={ask.isPending} />
    </div>
  );
}

function TurnView({
  turn,
  doc,
  onGoToPage,
  onRetry,
}: {
  turn: Turn;
  doc: DocumentRecord;
  onGoToPage: (page: number) => void;
  onRetry: () => void;
}) {
  const pending = !turn.answer && !turn.error;

  return (
    <div>
      {/* The question is a compact filled block; the answer is plain prose.
          Dropping the assistant bubble makes the pane read as a document. */}
      <div className="mb-4 flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-n-2 px-3 py-2 text-sm leading-relaxed text-n-11">
          {turn.question}
        </p>
      </div>

      {pending && <AnswerSkeleton />}

      {turn.error && (
        <div className="flex items-start gap-2 rounded-lg border border-n-3 bg-danger-soft px-3 py-2.5">
          <TriangleAlert
            size={14}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-danger"
          />
          <div className="flex-1 space-y-1.5">
            <p className="text-xs text-n-11">{turn.error}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-n-9 underline underline-offset-2 hover:text-n-11"
            >
              <RotateCcw size={12} strokeWidth={1.5} />
              Try again
            </button>
          </div>
        </div>
      )}

      {turn.answer && (
        <>
          <div className="prose-answer">
            <Markdown remarkPlugins={[remarkGfm]}>{turn.answer}</Markdown>
          </div>
          {turn.sources && (
            <SourceList
              sources={turn.sources}
              locator={doc.locator}
              onGoToPage={onGoToPage}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Answers arrive in one blocking response, so the wait is held in the
    answer's own position rather than a floating spinner. */
function AnswerSkeleton() {
  return (
    <div className="space-y-2.5" aria-live="polite" aria-label="Generating answer">
      <div className="shimmer h-3.5 w-full rounded" />
      <div className="shimmer h-3.5 w-11/12 rounded" />
      <div className="shimmer h-3.5 w-7/12 rounded" />
    </div>
  );
}

/** A deck and a photograph invite different first questions, and a starter that
    does not fit what you uploaded reads as boilerplate. */
const STARTERS: Partial<Record<DocumentRecord["kind"], string[]>> = {
  image: [
    "What does this image show?",
    "Transcribe any text visible in it.",
    "What is the main takeaway from this figure?",
  ],
  pptx: [
    "Summarise this deck in five bullet points.",
    "What is the argument each slide makes?",
    "What do the charts and diagrams show?",
  ],
  sheet: [
    "What is this spreadsheet tracking?",
    "What are the largest and smallest values?",
    "Describe the trend across the columns.",
  ],
  email: [
    "Summarise this message.",
    "What is being asked of the recipient?",
    "List any dates or deadlines mentioned.",
  ],
};

const DEFAULT_STARTERS = [
  "Summarise this document in five bullet points.",
  "What do the figures show?",
  "What are the key numbers in the tables?",
];

function EmptyState({
  doc,
  onPick,
}: {
  doc: DocumentRecord;
  onPick: (q: string) => void;
}) {
  const starters = STARTERS[doc.kind] ?? DEFAULT_STARTERS;
  const noun = KIND_NOUN[doc.kind];

  return (
    <div className="pt-6">
      <h2 className="text-sm font-medium text-n-11">Ask about this {noun}</h2>
      <p className="mt-1 text-xs leading-relaxed text-n-7">
        Answers are grounded in {doc.filename} alone — its text, figures and
        tables. Citations link back to the {doc.locator} they came from.
      </p>
      {/* Silently answering as if the whole document were indexed would be the
          worse failure, so say what is missing. */}
      {doc.image_failed_count > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-n-7">
          {doc.image_failed_count} figure
          {doc.image_failed_count === 1 ? "" : "s"} could not be described by
          the vision model and {doc.image_failed_count === 1 ? "is" : "are"} not
          searchable. Ingestion is keyed by file contents, so trying again means
          deleting this document first and re-uploading it.
        </p>
      )}
      {/* Pulled left by the button's own padding so the labels align
          optically with the heading above. */}
      <div className="-mx-2 mt-4 space-y-px">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="block w-full rounded px-2 py-1.5 text-left text-xs text-n-9 transition-colors duration-100 hover:bg-n-2 hover:text-n-11"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
