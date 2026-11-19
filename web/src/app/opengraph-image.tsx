import { ImageResponse } from "next/og";

/* The card shown when a link to the site is shared. It mirrors the hero in
   the dark theme: ink ground, the three-star mark, the headline with its
   brass last word. Colours are the dark-theme tokens from globals.css. */

export const alt = "Asterism — ask a document, trace the answer back";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0a0a0b";
const TEXT = "#f1efe8";
const MUTED = "#a5a39c";
const FAINT = "#6f6d68";
const BRASS = "#c9a45c";
const RULE = "#26251f";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          color: TEXT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="44" height="44" viewBox="0 0 16 16">
            <path
              d="M3.2 11.9 8 3.5 12.8 11.9"
              stroke={TEXT}
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.32"
            />
            <circle cx="8" cy="3.5" r="1.65" fill={TEXT} />
            <circle cx="3.2" cy="11.9" r="1.65" fill={TEXT} />
            <circle cx="12.8" cy="11.9" r="1.65" fill={TEXT} />
          </svg>
          <span style={{ fontSize: 34, letterSpacing: "-0.02em" }}>Asterism</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 22,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: FAINT,
            }}
          >
            Documents, figures and tables · cited
          </span>
          <span
            style={{
              marginTop: 28,
              fontSize: 84,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
            }}
          >
            Ask a document.
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 84,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: MUTED,
            }}
          >
            {/* Satori spaces words in a mixed-colour line unevenly, so each
                word is its own box with an explicit gap. */}
            {["Trace", "the", "answer"].map((w) => (
              <span key={w} style={{ marginRight: 22 }}>
                {w}
              </span>
            ))}
            <span style={{ color: BRASS }}>back.</span>
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${RULE}`,
            paddingTop: 28,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <span>PDF · Word · PowerPoint · Excel · images</span>
          <span style={{ color: FAINT }}>Free · no sign-up</span>
        </div>
      </div>
    ),
    size,
  );
}
