import Link from "next/link";

/** The asterism: ⁂, the typographic mark that divides sections of a text, and
    in astronomy a shape picked out of scattered stars.

    Three points, one per modality — text, figures, tables — traced into a
    single figure, which is what the index does with a document. Drawn rather
    than set as the glyph so it holds its weight next to Inter, and so the
    trace can drop away at favicon sizes while the points survive. */
export function AsterismMark({
  size = 15,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      {/* An open trace, not a closed triangle — a constellation line, and it
          avoids reading as a warning sign. */}
      <path
        d="M3 12.1 8 3.2 13 12.1"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.28"
      />
      <circle cx="8" cy="3.2" r="1.75" fill="currentColor" />
      <circle cx="3" cy="12.1" r="1.75" fill="currentColor" />
      <circle cx="13" cy="12.1" r="1.75" fill="currentColor" />
    </svg>
  );
}

/** The clickable wordmark, used in the app's own chrome — it always goes to the
    library, which is the app's home.

    Deliberately takes no href. The landing page renders `AsterismMark` inside
    plain text instead: there, the mark is a logo and not a way out of the page
    you just arrived on. */
export function Wordmark() {
  return (
    <Link
      href="/library"
      className="flex shrink-0 items-center gap-2 rounded pr-1 text-n-12 transition-colors duration-150 hover:text-n-10"
      aria-label="Asterism — go to the library"
    >
      <AsterismMark />
      <span className="text-sm font-semibold tracking-tight">Asterism</span>
    </Link>
  );
}
