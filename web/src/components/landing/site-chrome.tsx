import Link from "next/link";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AsterismMark } from "@/components/shell/wordmark";
import { FORMAT_PAGES, type Faq } from "@/lib/formats";

/* The public pages' frame: the landing page and the per-format pages share
   one header, footer and section rhythm, built from the same tokens. */

export function SiteHeader() {
  return (
    <header className="flex h-header shrink-0 items-center gap-2 border-b border-n-3 px-3 sm:px-4">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-n-12">
        <AsterismMark />
        <span className="text-sm font-semibold tracking-tight">Asterism</span>
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <Link
          href="/#how"
          className="hidden h-8 items-center rounded px-2.5 text-xs font-medium text-n-8 transition-colors duration-150 hover:bg-n-2 hover:text-n-11 sm:inline-flex"
        >
          How it works
        </Link>
        <ThemeToggle />
        <Link
          href="/library"
          className="ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-n-12 px-3 text-sm font-medium text-n-0 transition-colors duration-150 hover:bg-n-11"
        >
          Open library
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-n-3">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8">
        <nav aria-label="Formats" className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="font-mono text-2xs uppercase tracking-wider text-n-7">
            Chat with
          </span>
          {FORMAT_PAGES.map((f) => (
            <Link
              key={f.slug}
              href={`/chat-with/${f.slug}`}
              className="text-xs text-n-9 transition-colors duration-150 hover:text-n-12"
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
      </div>
    </footer>
  );
}

/** One section rhythm for every public page, so the eye can predict it. */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-header border-b border-n-3">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="reveal max-w-xl">
          <p className="font-mono text-2xs uppercase tracking-wider text-n-7">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-n-12">
            {title}
          </h2>
          {lede && <p className="mt-3 text-sm leading-relaxed text-n-8">{lede}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/** Questions as ruled rows, in the same register as the modality list:
    always open, because an answer hidden behind a click is one fewer
    people read. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <dl className="flex max-w-3xl flex-col">
      {faqs.map((f) => (
        <div
          key={f.q}
          className="reveal grid gap-2 border-t border-n-3 py-5 last:border-b sm:grid-cols-5 sm:gap-8"
        >
          <dt className="text-sm font-semibold tracking-tight text-n-12 sm:col-span-2">{f.q}</dt>
          <dd className="text-sm leading-relaxed text-n-8 sm:col-span-3">{f.a}</dd>
        </div>
      ))}
    </dl>
  );
}
