import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Constellation } from "@/components/landing/constellation-lazy";
import { ExplodedDocument } from "@/components/landing/exploded-document";
import {
  FaqList,
  Section,
  SiteFooter,
  SiteHeader,
} from "@/components/landing/site-chrome";
import { WorkspacePreview } from "@/components/landing/workspace-preview";
import { SITE_FAQS, faqJsonLd, jsonLdScript } from "@/lib/formats";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/* Canonical lives here, not in the layout: set there, every route would
   inherit "/" and tell search engines it is a copy of the landing page. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Structured data: tells search engines this is a free web app, and what
    it does, beyond what they can infer from the prose. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Ask questions about PDF, Word, PowerPoint, Excel, image, text and email files",
        "Answers cite the page, slide or sheet each claim came from",
        "Reads figures and tables, not only text",
        "No account or sign-up required",
      ],
      image: `${SITE_URL}/opengraph-image`,
    },
    { ...faqJsonLd(SITE_FAQS), "@id": `${SITE_URL}/#faq` },
  ],
};

/* The landing page is the front door: there is no sign-in, so its only job is
   to say what the thing does and get out of the way. It reads from the same
   token layer as the app. Its motion (the WebGL field, the scroll-driven
   reveals) is all progressive: with no WebGL, no view timelines or reduced
   motion, every section still renders complete and still. */

/** Mirrors `api/filetypes.py`, which is the real allowlist. Duplicated on
    purpose: a marketing page should render when the API is not running.
    `href` points at the format's own page where it has one. */
const FORMATS: { label: string; exts: string; cites: string; href?: string }[] = [
  { label: "Documents", exts: "pdf · docx · doc · odt · rtf", cites: "page", href: "/chat-with/pdf" },
  { label: "Presentations", exts: "pptx · ppt", cites: "slide", href: "/chat-with/powerpoint" },
  { label: "Spreadsheets", exts: "xlsx · xls · csv · tsv", cites: "sheet", href: "/chat-with/excel" },
  {
    label: "Images",
    exts: "png · jpg · webp · gif · bmp · tiff · heic",
    cites: "image",
    href: "/chat-with/images",
  },
  { label: "Text & markup", exts: "txt · md · rst · html · xml · epub", cites: "section" },
  { label: "Mail", exts: "eml · msg", cites: "message" },
];

const MODALITIES = [
  {
    name: "Text",
    body: "Chunked along the document's own headings, so a retrieved passage arrives whole instead of severed mid-thought.",
  },
  {
    name: "Figures",
    body: "Every diagram, chart and photograph is described by a vision model — which is what gives a question about a chart something to match against.",
  },
  {
    name: "Tables",
    body: "Read as structure rather than a wall of numbers, then summarised, so the comparisons inside them are searchable in plain language.",
  },
];

const STEPS = [
  {
    name: "Parse",
    body: "Layout detection over PDFs and images; native readers for Office formats. Out comes an ordered stream of headings, paragraphs, tables and pictures.",
  },
  {
    name: "Describe",
    body: "Figures go to a vision model, tables to a language model. Both come back as prose — the step that puts all three modalities in reach of one query.",
  },
  {
    name: "Embed",
    body: "Everything lands in a single vector space, in a collection belonging to that document alone. Retrieval can never reach into another file.",
  },
  {
    name: "Answer",
    body: "A question pulls the closest passages across all three modalities. The answer is written from those, and each source links back to where it sits.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex h-full flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(JSON_LD) }}
      />
      <SiteHeader />

      <main className="flex-1 overflow-y-auto">
        <Hero />
        <Preview />
        <Modalities />
        <Formats />
        <HowItWorks />
        <Free />
        <Section id="faq" eyebrow="Questions" title="Asked before you ask.">
          <FaqList faqs={SITE_FAQS} />
        </Section>
        <SiteFooter />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-n-3">
      {/* The field sits behind the type; on wide screens the scene keeps its
          dense part to the right, clear of the headline. */}
      <Constellation className="absolute inset-0" />

      <div className="relative mx-auto flex min-h-[600px] w-full max-w-6xl flex-col justify-center px-5 py-20 sm:min-h-[680px] sm:px-8">
        <p
          className="rise font-mono text-2xs uppercase tracking-wider text-n-7"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          Documents, figures and tables · cited
        </p>

        <h1 className="mt-6 max-w-[14ch] text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-n-12">
          <span className="rise block" style={{ "--d": "350ms" } as React.CSSProperties}>
            Ask a document.
          </span>
          <span
            className="rise block font-serif font-normal italic tracking-[-0.01em] text-n-10"
            style={{ "--d": "520ms" } as React.CSSProperties}
          >
            Trace the answer <span className="text-accent">back.</span>
          </span>
        </h1>

        <p
          className="rise mt-7 max-w-md text-base leading-relaxed text-n-9"
          style={{ "--d": "700ms" } as React.CSSProperties}
        >
          Asterism reads a PDF, a slide deck, a spreadsheet or a photograph, its
          figures and tables included, then answers questions about it and
          cites the exact page, slide or sheet each claim came from.
        </p>

        <div
          className="rise mt-9 flex flex-wrap items-center gap-2"
          style={{ "--d": "860ms" } as React.CSSProperties}
        >
          <Link
            href="/library"
            className="group inline-flex h-10 items-center gap-2 rounded bg-n-12 px-4 text-sm font-medium text-n-0 transition-colors duration-150 hover:bg-n-11"
          >
            Open the library
            <ArrowRight
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-200 ease-out group-hover:translate-x-1"
            />
          </Link>
          <a
            href="#how"
            className="inline-flex h-10 items-center rounded border border-n-4 px-4 text-sm font-medium text-n-11 transition-colors duration-150 hover:border-n-6 hover:bg-n-1"
          >
            How it works
          </a>
        </div>

        <p
          className="rise mt-6 text-xs text-n-7"
          style={{ "--d": "1000ms" } as React.CSSProperties}
        >
          No account, no card, free to use.
        </p>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="border-b border-n-3">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="reveal mb-10 max-w-xl">
          <p className="font-mono text-2xs uppercase tracking-wider text-n-7">The workspace</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-n-12">
            Every claim, marked where it came from.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-n-8">
            The answer cites its sources like footnotes. Click one and the page
            opens beside it at the passage it came from.
          </p>
        </div>
        <WorkspacePreview />
      </div>
    </section>
  );
}

function Modalities() {
  return (
    <Section
      eyebrow="Why three points"
      title="Three kinds of content, one index."
      lede="A document is not only its prose. Most retrieval tools read the text and skip everything that was worth putting in a figure, which is usually the part carrying the argument."
    >
      <div className="grid items-center gap-10 md:grid-cols-2">
        <ExplodedDocument />
        <ul className="flex flex-col">
          {MODALITIES.map((m) => (
            <li
              key={m.name}
              className="reveal flex flex-col gap-1.5 border-t border-n-3 py-5 last:border-b"
            >
              <h3 className="text-sm font-semibold tracking-tight text-n-12">{m.name}</h3>
              <p className="text-sm leading-relaxed text-n-8">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Formats() {
  return (
    <Section
      eyebrow="What it reads"
      title="Thirty-one formats, and the right word for each."
      lede="A deck cites slides, a workbook cites sheets, a report cites pages. Asterism uses whichever unit the format actually has, rather than calling everything a page."
    >
      <ul className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f) => (
          <li
            key={f.label}
            className="reveal group relative flex flex-col gap-2 bg-n-0 p-5 transition-colors duration-200 hover:bg-n-1"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-n-12">
                {/* The link's ::after covers the card, so the whole card is
                    the target while the accessible name stays the label. */}
                {f.href ? (
                  <Link href={f.href} className="after:absolute after:inset-0">
                    {f.label}
                  </Link>
                ) : (
                  f.label
                )}
              </h3>
              <span className="shrink-0 font-mono text-2xs text-n-7 transition-colors duration-200 group-hover:text-accent">
                cites {f.cites}
              </span>
            </div>
            <p className="font-mono text-2xs leading-relaxed text-n-7">{f.exts}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="Four steps, then a question."
      lede="Indexing is the slow part: layout detection and one vision call per figure. It happens once per document, and everything after it is fast."
    >
      <ol className="relative flex flex-col gap-10 pl-8">
        {/* The rail, and the brass line that runs down it as you read. */}
        <span aria-hidden="true" className="absolute bottom-2 left-[5px] top-2 w-px bg-n-3" />
        <span aria-hidden="true" className="fill-down absolute bottom-2 left-[5px] top-2 w-px bg-accent" />
        {STEPS.map((s, i) => (
          <li key={s.name} className="reveal relative flex flex-col gap-2 sm:flex-row sm:gap-8">
            <span
              aria-hidden="true"
              className="absolute -left-8 top-1 h-[11px] w-[11px] rounded-full border border-accent bg-n-0"
            />
            <div className="flex shrink-0 items-baseline gap-3 sm:w-40">
              <span className="font-mono text-2xs tabular-nums text-n-7">{i + 1}</span>
              <h3 className="text-base font-semibold tracking-tight text-n-12">{s.name}</h3>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-n-8">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Free() {
  return (
    <Section
      eyebrow="Free to use"
      title="No account, because there is nothing to attach one to."
      lede="Open it and use it. No email, no password, no trial, no card. Your library is kept against an anonymous id your browser generates on first visit — enough to keep it yours, not enough to identify you."
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 sm:grid-cols-3">
        {[
          [
            "Nothing to sign",
            "No sign-up screen exists. Open the library, drop in a file, ask it something.",
          ],
          [
            "Nothing to pay",
            "Indexing and answering are on us. There is no paid tier to be nudged toward.",
          ],
          [
            "Your library is yours",
            "Other visitors cannot see, query or delete your documents, and you cannot see theirs.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="reveal flex flex-col gap-2 bg-n-0 p-5">
            <h3 className="text-sm font-semibold tracking-tight text-n-12">
              {title}
            </h3>
            <p className="text-xs leading-relaxed text-n-8">{body}</p>
          </div>
        ))}
      </div>

      {/* Asking for nothing has real consequences for the person using it.
          Stating them here is cheaper than a support conversation later, and a
          "free and private" claim that omitted them would simply be false. */}
      <dl className="mt-5 max-w-2xl space-y-2.5 text-xs leading-relaxed text-n-7">
        <div>
          <dt className="inline font-medium text-n-9">
            Your documents are uploaded here.
          </dt>{" "}
          <dd className="inline">
            They are indexed and stored on this server, not in your browser, and
            to describe their figures and tables they are sent on to the model
            providers behind Asterism — currently Groq and Google Gemini.
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-n-9">
            Clearing your browser data loses your library.
          </dt>{" "}
          <dd className="inline">
            The anonymous id lives in this browser alone, so another browser or
            another device is another library. That is the price of not asking
            you to sign up for anything.
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-n-9">
            There are limits, so the free part stays free.
          </dt>{" "}
          <dd className="inline">
            Uploads are capped in size and in number per hour, and very
            figure-heavy documents have some figures left undescribed. You are
            told when a limit is what stopped you.
          </dd>
        </div>
      </dl>
    </Section>
  );
}
