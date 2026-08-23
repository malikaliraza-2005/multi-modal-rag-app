import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { DocumentTable } from "@/components/library/document-table";
import { Dropzone } from "@/components/library/dropzone";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Wordmark } from "@/components/shell/wordmark";

export const metadata: Metadata = {
  title: "Library — Asterism",
};

export default function LibraryPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-header shrink-0 items-center gap-3 border-b border-n-3 px-4">
        <Wordmark />
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-n-8 transition-colors duration-150 hover:bg-n-2 hover:text-n-11"
          >
            <ArrowLeft size={13} strokeWidth={1.5} />
            About
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="mb-8">
            <h1 className="text-lg font-semibold tracking-tight text-n-12">
              Library
            </h1>
            <p className="mt-1 text-sm text-n-8">
              Each document is indexed into its own collection, so answers are
              grounded in that document alone.
            </p>
          </div>

          <div className="space-y-8">
            <Dropzone />
            <DocumentTable />
          </div>
        </div>
      </main>
    </div>
  );
}
