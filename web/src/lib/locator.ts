import type { DocumentKind, Locator } from "@/lib/api";

/** The short form a citation carries. Kept to a few characters so the sources
    list stays a scannable column rather than a wall of words. */
const ABBREVIATION: Record<Locator, string> = {
  page: "p.",
  slide: "s.",
  sheet: "sh.",
  section: "§",
  message: "msg",
  image: "img",
};

export function citationLabel(locator: Locator, n: number) {
  return `${ABBREVIATION[locator] ?? "p."}${n}`;
}

export function citationBlank(locator: Locator) {
  return `${ABBREVIATION[locator] ?? "p."}—`;
}

/** Spelled out, for headers with room for the whole word. */
export function locatorTitle(locator: Locator, n: number) {
  const noun = `${locator[0].toUpperCase()}${locator.slice(1)}`;
  return locator === "image" ? noun : `${noun} ${n}`;
}

/** How long a document is, in whatever unit it counts in. A library holding a
    report, a deck and a photo has no single word for this, so each row says
    which unit it means. */
export function extentLabel(locator: Locator, count: number) {
  if (!count) return "—";
  if (locator === "page") return `${count} pp`;
  if (locator === "image") return "1 img";
  return `${count} ${locator}${count === 1 ? "" : "s"}`;
}

/** How the workspace describes what it is showing beside the answer. */
export const KIND_NOUN: Record<DocumentKind, string> = {
  pdf: "PDF",
  docx: "document",
  pptx: "presentation",
  sheet: "spreadsheet",
  image: "image",
  text: "document",
  html: "page",
  email: "message",
};
