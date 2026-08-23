"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_HEIGHT = 160;

export function Composer({
  onSend,
  disabled,
  placeholder = "Ask about this document",
}: {
  onSend: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  // Auto-grow up to a cap, then scroll internally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  function submit() {
    const question = value.trim();
    if (!question || disabled) return;
    onSend(question);
    setValue("");
  }

  return (
    <div className="border-t border-n-3 bg-n-0 px-4 py-3">
      {/* The wrapper carries the focus indication, so the textarea suppresses
          its own outline — otherwise the two stack. */}
      <div className="flex items-end gap-2 rounded-lg border border-n-3 bg-n-0 px-3 py-2 transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-6 flex-1 resize-none bg-transparent py-0.5 text-sm leading-6 text-n-11 outline-none focus-visible:outline-none placeholder:text-n-6"
        />
        <button
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          aria-label="Send question"
          className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-accent-fg transition-colors duration-150 hover:bg-accent-hover disabled:bg-n-3 disabled:text-n-6"
        >
          <ArrowUp size={14} strokeWidth={2} />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-2xs text-n-6">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
