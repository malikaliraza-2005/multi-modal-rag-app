/* What search engines and link previews are told about the site, in one place
   so the metadata, the sitemap, the structured data and the share image can't
   drift apart. */

/** The public origin, which canonical URLs, the sitemap and share images are
    built on. NEXT_PUBLIC_SITE_URL wins when set (use it for a custom domain).
    Otherwise Vercel's own production hostname, which it sets on every build,
    so preview deployments still point search engines at production. */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Asterism";

/** Leads with what people search for ("chat with PDF"), not the tagline. */
export const SITE_TITLE = "Chat with PDFs, decks & spreadsheets, cited — Asterism";

export const SITE_DESCRIPTION =
  "Ask questions about any PDF, Word, PowerPoint, Excel file or image, free. Every answer cites the exact page, slide or sheet it came from. No sign-up.";

export const SITE_TAGLINE = "Ask a document. Trace the answer back.";
