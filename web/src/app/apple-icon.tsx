import { ImageResponse } from "next/og";

/* iOS ignores SVG icons for the home screen, so the mark is rendered to PNG.
   Same drawing as app/icon.svg; iOS rounds the corners itself. */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131317",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 16 16">
          <path
            d="M3.2 11.9 8 3.5 12.8 11.9"
            stroke="#fafafb"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.32"
          />
          <circle cx="8" cy="3.5" r="1.65" fill="#fafafb" />
          <circle cx="3.2" cy="11.9" r="1.65" fill="#fafafb" />
          <circle cx="12.8" cy="11.9" r="1.65" fill="#fafafb" />
        </svg>
      </div>
    ),
    size,
  );
}
