import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaqList,
  Section,
  SiteFooter,
  SiteHeader,
} from "@/components/landing/site-chrome";
import {
  FORMAT_PAGES,
  faqJsonLd,
  formatPage,
  jsonLdScript,
} from "@/lib/formats";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/* One page per format, each answering one search ("chat with pdf", "ask
   questions about excel"). All prerendered; an unknown slug is a 404. */

export const dynamicParams = false;

export function generateStaticParams() {
  return FORMAT_PAGES.map((f) => ({ format: f.slug }));
}

export async function generateMetadata(
  props: PageProps<"/chat-with/[format]">,
): Promise<Metadata> {
  const { format } = await props.params;
  const page = formatPage(format);
  if (!page) return {};
  const path = `/chat-with/${page.slug}`;
  /* Setting openGraph here replaces the root's, share image included, so
     the root card is named again explicitly. */
  const image = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Asterism — ask a document, trace the answer back",
  };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: page.title,
      description: page.description,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [image],
    },
  };
}

export default async function FormatPage(props: PageProps<"/chat-with/[format]">) {
  const { format } = await props.params;
  const page = formatPage(format);
  if (!page) notFound();

  const url = `${SITE_URL}/chat-with/${page.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#app` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: page.h1, item: url },
        ],
      },
      faqJsonLd(page.faqs),
    ],
  };

  const others = FORMAT_PAGES.filter((f) => f.slug !== page.slug);

  return (
    <div className="flex h-full flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <SiteHeader />

      <main className="flex-1 overflow-y-auto">
        <section className="border-b border-n-3">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <nav aria-label="Breadcrumb" className="font-mono text-2xs uppercase tracking-wider text-n-7">
              <Link href="/" className="transition-colors duration-150 hover:text-n-11">
                Asterism
              </Link>
              <span aria-hidden="true" className="mx-2">/</span>
              <span>{page.label}</span>
            </nav>

            <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-n-12">
              {page.h1}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-n-9">{page.lede}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link
                href="/library"
                className="group inline-flex h-10 items-center gap-2 rounded bg-n-12 px-4 text-sm font-medium text-n-0 transition-colors duration-150 hover:bg-n-11"
              >
                Upload {page.noun}
                <ArrowRight
                  size={15}
                  strokeWidth={1.5}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                />
              </Link>
              <span className="text-xs text-n-7">Free, no account.</span>
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-3 border-t border-n-3 pt-5 font-mono text-2xs text-n-7">
              <div className="flex gap-2">
                <dt>Accepts</dt>
                <dd className="text-n-10">{page.exts}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Cites by</dt>
                <dd className="text-accent">{page.cites}</dd>
              </div>
            </dl>
          </div>
        </section>

        <Section
          eyebrow="What it reads"
          title={`More of ${page.noun} than its text.`}
          lede="Answers are drawn from one index that holds the prose, the tables and the pictures alike, so a question can reach whichever of them holds the answer."
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 md:grid-cols-3">
            {page.points.map((p) => (
              <li key={p.name} className="reveal flex flex-col gap-2 bg-n-0 p-5">
                <h3 className="text-sm font-semibold tracking-tight text-n-12">{p.name}</h3>
                <p className="text-sm leading-relaxed text-n-8">{p.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Questions" title={`About ${page.label} files.`}>
          <FaqList faqs={page.faqs} />
        </Section>

        <Section
          eyebrow="Other formats"
          title="The same, for the rest of your files."
          lede="Thirty-one formats in all, each cited in the unit it actually has."
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-n-3 bg-n-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((f) => (
              <li
                key={f.slug}
                className="group relative flex flex-col gap-2 bg-n-0 p-5 transition-colors duration-200 hover:bg-n-1"
              >
                <h3 className="text-sm font-medium text-n-12">
                  <Link href={`/chat-with/${f.slug}`} className="after:absolute after:inset-0">
                    {f.h1}
                  </Link>
                </h3>
                <p className="font-mono text-2xs text-n-7 transition-colors duration-200 group-hover:text-accent">
                  cites {f.cites}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <SiteFooter />
      </main>
    </div>
  );
}
