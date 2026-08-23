import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AsterismMark } from "@/components/shell/wordmark";

/* The landing page is the front door: there is no sign-in, so its only job is
   to say what the thing does and get out of the way. It reads from the same
   token layer as the app and adds nothing to it but two display type steps. */

/** Mirrors `api/filetypes.py`, which is the real allowlist. Duplicated on
    purpose: a marketing page should render when the API is not running. */
const FORMATS = [
  { label: "Documents", exts: "pdf · docx · doc · odt · rtf", cites: "page" },
  { label: "Presentations", exts: "pptx · ppt", cites: "slide" },
  { label: "Spreadsheets", exts: "xlsx · xls · csv · tsv", cites: "sheet" },
  {
    label: "Images",
    exts: "png · jpg · webp · gif · bmp · tiff · heic",
    cites: "image",
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
      <header className="flex h-header shrink-0 items-center gap-2 border-b border-n-3 px-4">
        <span className="flex items-center gap-2 text-n-12">
          <AsterismMark />
          <span className="text-sm font-semibold tracking-tight">Asterism</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <a
            href="#how"
            className="hidden h-8 items-center rounded px-2.5 text-xs font-medium text-n-8 transition-colors duration-150 hover:bg-n-2 hover:text-n-11 sm:inline-flex"
          >
            How it works
          </a>
          <ThemeToggle />
          <Link
            href="/library"
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded bg-n-12 px-3 text-sm font-medium text-n-0 transition-colors duration-150 hover:bg-n-11"
          >
            Open library
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Hero />
        <Modalities />
        <Formats />
        <HowItWorks />
        <Free />
        <Footer />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-n-3">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        {/* The mark at size, once. It is the only ornament on the page. */}
        <AsterismMark size={40} className="mb-9 text-n-11" />

        <h1 className="max-w-2xl text-2xl font-semibold leading-[1.12] tracking-tight text-n-12 sm:text-3xl">
          Ask a document.
          <br />
          Trace the answer back.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-n-9">
          Asterism indexes a PDF, a slide deck, a spreadsheet or a photograph —
          its text, its figures and its tables alike — then answers questions
          about it, citing the exact page, slide or sheet each claim came from.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-2">
          <Link
            href="/library"
            className="group inline-flex h-9 items-center gap-2 rounded bg-n-12 px-4 text-sm font-medium text-n-0 transition-colors duration-150 hover:bg-n-11"
          >
            Open the library
            <ArrowRight
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            />
          </Link>
          <a
            href="#how"
            className="inline-flex h-9 items-center rounded border border-n-3 bg-n-0 px-4 text-sm font-medium text-n-11 transition-colors duration-150 hover:border-n-4 hover:bg-n-1"
          >
            How it works
          </a>
        </div>

        <p className="mt-6 font-mono text-2xs uppercase tracking-wider text-n-7">
          No account · no card · free to use
        </p>
      </div>
    </section>
  );
}

function Modalities() {
  return (
    <Section
      eyebrow="Why three points"
      title="Three kinds of content, one index."
      lede="A document is not only its prose. Most retrieval tools read the text and skip everything that was worth putting in a figure — which is usually the part carrying the argument."
    >
      <ul className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 sm:grid-cols-3">
        {MODALITIES.map((m, i) => (
          <li key={m.name} className="flex flex-col gap-2 bg-n-0 p-5">
            <span className="font-mono text-2xs tabular-nums text-n-6">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-sm font-semibold tracking-tight text-n-12">
              {m.name}
            </h3>
            <p className="text-xs leading-relaxed text-n-8">{m.body}</p>
          </li>
        ))}
      </ul>
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
      <ul className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <li key={f.label} className="flex flex-col gap-1.5 bg-n-0 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-n-12">{f.label}</h3>
              <span className="shrink-0 rounded border border-n-3 px-1.5 py-px font-mono text-2xs text-n-7">
                cites {f.cites}
              </span>
            </div>
            <p className="font-mono text-2xs leading-relaxed text-n-7">
              {f.exts}
            </p>
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
      lede="Indexing is the slow part — layout detection and one vision call per figure. It happens once per document, and everything after it is fast."
    >
      <ol className="space-y-px overflow-hidden rounded-lg border border-n-3 bg-n-3">
        {STEPS.map((s, i) => (
          <li
            key={s.name}
            className="flex flex-col gap-2 bg-n-0 p-5 sm:flex-row sm:gap-6"
          >
            <div className="flex shrink-0 items-baseline gap-3 sm:w-40">
              <span className="font-mono text-2xs tabular-nums text-n-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-semibold tracking-tight text-n-12">
                {s.name}
              </h3>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-n-8">
              {s.body}
            </p>
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
          <div key={title} className="flex flex-col gap-2 bg-n-0 p-5">
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

function Footer() {
  return (
    <footer className="border-t border-n-3">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-8">
        <span className="flex items-center gap-2 text-n-11">
          <AsterismMark size={13} />
          <span className="text-xs font-semibold tracking-tight">Asterism</span>
        </span>
        <p className="text-xs text-n-7">
          An asterism is the mark that divides a text — and a shape picked out
          of scattered stars.
        </p>
        <Link
          href="/library"
          className="ml-auto text-xs font-medium text-n-9 underline underline-offset-2 transition-colors duration-150 hover:text-n-11"
        >
          Open the library
        </Link>
      </div>
    </footer>
  );
}

/** One section rhythm for the whole page, so the eye can predict it. */
function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-header border-b border-n-3">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="font-mono text-2xs uppercase tracking-wider text-n-6">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-xl text-lg font-semibold tracking-tight text-n-12">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-n-8">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
