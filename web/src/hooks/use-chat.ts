"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Source } from "@/lib/api";

export type Turn = {
  id: number;
  question: string;
  answer?: string;
  sources?: Source[];
  error?: string;
};

export type Chat = {
  turns: Turn[];
  pending: boolean;
  send: (question: string) => void;
  retry: (turn: Turn) => void;
};

let nextId = 0;

/** The conversation, held above the panes.

    It lives here rather than inside the chat pane because the wide and narrow
    layouts mount different trees — a split panel and a bottom sheet — and
    rotating a tablet across the breakpoint must not throw the answers away. */
export function useChat(docId: string): Chat {
  const [turns, setTurns] = useState<Turn[]>([]);

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

  return {
    turns,
    pending: ask.isPending,
    send(question) {
      const id = nextId++;
      setTurns((t) => [...t, { id, question }]);
      ask.mutate({ id, question });
    },
    retry(turn) {
      setTurns((t) =>
        t.map((x) => (x.id === turn.id ? { ...x, error: undefined } : x)),
      );
      ask.mutate({ id: turn.id, question: turn.question });
    },
  };
}
