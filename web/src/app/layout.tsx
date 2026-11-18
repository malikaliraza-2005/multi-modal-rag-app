import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* The reading face: answers, and the landing page's display line. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Asterism — ask a document, trace the answer back",
    template: "%s",
  },
  description:
    "Asterism indexes a PDF, deck, spreadsheet or image — its text, figures and tables alike — then answers questions about it, citing the page, slide or sheet each claim came from. Free to use, with no account to create.",
};

/* The workspace is a fixed-height app shell, not a scrolling page: when the
   keyboard opens it should shrink the layout rather than scroll it out from
   under itself. Browsers that ignore this are handled in the chat sheet. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
