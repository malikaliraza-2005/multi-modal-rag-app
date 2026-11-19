/* The per-format landing pages (/chat-with/<slug>), each aimed at one search
   ("chat with pdf", "ask questions about excel"...). Every claim here has to
   be true of the pipeline: which formats get their pictures read is decided
   in api/media.py, and the citation unit comes from api/filetypes.py. Limits
   are configurable on the server, so no numbers are quoted. */

export type Faq = { q: string; a: string };

export type FormatPage = {
  slug: string;
  /** How the format is named in running text: "a PDF", "an Excel file". */
  noun: string;
  /** Short label for link lists. */
  label: string;
  exts: string;
  cites: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  points: { name: string; body: string }[];
  faqs: Faq[];
};

export const FORMAT_PAGES: FormatPage[] = [
  {
    slug: "pdf",
    noun: "a PDF",
    label: "PDF",
    exts: "pdf",
    cites: "page",
    title: "Chat with a PDF — free, with cited answers | Asterism",
    description:
      "Upload a PDF and ask it questions. Asterism reads its text, tables and charts, and cites the exact page every answer came from. Free, no sign-up.",
    h1: "Chat with a PDF",
    lede: "Upload a PDF and ask it anything. Asterism reads the text, the tables and the figures, then answers with a citation to the page each claim came from. Click the citation and that page opens beside the answer.",
    points: [
      {
        name: "Scanned pages, too",
        body: "PDFs go through layout detection with OCR, so a scanned report is read rather than skipped. How well depends on the scan, as it would for a person.",
      },
      {
        name: "Charts and diagrams",
        body: "Each figure is described by a vision model. A question about a chart has something to match against, instead of the blank a text-only reader sees.",
      },
      {
        name: "Tables as tables",
        body: "Table structure is recovered, then summarised in plain language, so the comparisons inside a table can be found by an ordinary question.",
      },
    ],
    faqs: [
      {
        q: "Can it read a scanned PDF?",
        a: "Yes. Pages are run through layout detection and OCR, so text in a scanned document is recovered. A faint or skewed scan gives weaker text, and weaker answers.",
      },
      {
        q: "How do I check an answer?",
        a: "Every claim carries a numbered citation, like a footnote. Clicking one opens the PDF beside the answer at the page the passage came from.",
      },
      {
        q: "How long does indexing take?",
        a: "It depends mostly on how many figures the PDF has, since each is described once by a vision model. Indexing happens once per document; questions afterwards are fast.",
      },
    ],
  },
  {
    slug: "word",
    noun: "a Word document",
    label: "Word",
    exts: "docx · doc · odt · rtf",
    cites: "page",
    title: "Chat with a Word document — free, cited answers | Asterism",
    description:
      "Ask questions about a Word document (.docx, .doc, .odt or .rtf) and get answers that cite the page they came from. Reads tables and images too. Free.",
    h1: "Chat with a Word document",
    lede: "Upload a .docx, .doc, .odt or .rtf file and ask it questions. Answers are written from the document alone and cite the page each claim came from.",
    points: [
      {
        name: "Split along its headings",
        body: "The document is chunked at its own headings, so a retrieved passage arrives whole instead of cut off mid-thought.",
      },
      {
        name: "Pictures in a .docx",
        body: "Images embedded in a .docx are pulled out of the file and described by a vision model, so a diagram is as answerable as the paragraph beside it.",
      },
      {
        name: "Tables included",
        body: "Tables are read as structure and summarised, which puts the figures in them within reach of a plain-language question.",
      },
    ],
    faqs: [
      {
        q: "Does it work with older .doc files?",
        a: "Yes. .doc, .odt and .rtf are read alongside .docx. Pictures are recovered from .docx files; from the older formats, the text and tables are.",
      },
      {
        q: "Can I see the document while I ask?",
        a: "Yes. A preview of the document opens beside the conversation, and clicking a citation takes the preview to the passage it refers to.",
      },
    ],
  },
  {
    slug: "powerpoint",
    noun: "a PowerPoint deck",
    label: "PowerPoint",
    exts: "pptx · ppt",
    cites: "slide",
    title: "Chat with a PowerPoint deck — cites the slide | Asterism",
    description:
      "Ask questions about a PowerPoint presentation and get answers that cite the exact slide. Reads slide text, tables and the diagrams on each slide. Free.",
    h1: "Chat with a PowerPoint deck",
    lede: "Upload a .pptx or .ppt file and ask what the deck says. Answers cite slides, not pages, because that is the unit a deck is actually made of.",
    points: [
      {
        name: "Diagrams on the slide",
        body: "Most of a deck's argument sits in its pictures. In a .pptx each one is pulled out, described by a vision model and tied back to the slide it sits on.",
      },
      {
        name: "Cited by slide",
        body: "Every claim in an answer names its slide, so you can go straight to slide 14 instead of paging through the whole deck.",
      },
      {
        name: "Tables on slides",
        body: "Tables are read as structure and summarised, so a comparison laid out on a slide can be asked about in plain language.",
      },
    ],
    faqs: [
      {
        q: "Does it see the images and charts on my slides?",
        a: "For .pptx files, yes: embedded pictures are extracted and described, and each description keeps the number of the slide it came from. For older .ppt files, the slide text and tables are read.",
      },
      {
        q: "Why does it cite slides rather than pages?",
        a: "A deck has slides, not pages. Asterism uses whichever unit the format actually has: pages for reports, slides for decks, sheets for workbooks.",
      },
    ],
  },
  {
    slug: "excel",
    noun: "an Excel spreadsheet",
    label: "Excel",
    exts: "xlsx · xls · csv · tsv",
    cites: "sheet",
    title: "Chat with an Excel spreadsheet or CSV — free | Asterism",
    description:
      "Ask questions about an Excel workbook or CSV file in plain language. Answers cite the sheet they came from. Works with .xlsx, .xls, .csv and .tsv. Free.",
    h1: "Chat with an Excel spreadsheet",
    lede: "Upload an .xlsx, .xls, .csv or .tsv file and ask what is in it. Each sheet is read as a table, summarised in plain language, and cited by sheet in the answer.",
    points: [
      {
        name: "Read as structure",
        body: "A sheet is read as a table rather than a wall of numbers, then described, so a question like “which region grew fastest?” has something to match against.",
      },
      {
        name: "Cited by sheet",
        body: "A workbook's unit is the sheet, so that is what an answer cites. You know which tab to open to check it.",
      },
      {
        name: "CSV and TSV too",
        body: "Exports from other tools work as they are. A .csv or .tsv file is treated as a single sheet.",
      },
    ],
    faqs: [
      {
        q: "Can it do calculations over the whole spreadsheet?",
        a: "Not reliably. It answers from the passages it retrieves, which makes it good at explaining what a sheet contains and what its tables say. A sum over thousands of rows is still a job for a formula.",
      },
      {
        q: "Which spreadsheet files can I upload?",
        a: "Excel workbooks (.xlsx and .xls), plus .csv and .tsv files.",
      },
    ],
  },
  {
    slug: "images",
    noun: "an image",
    label: "Images",
    exts: "png · jpg · webp · gif · bmp · tiff · heic",
    cites: "image",
    title: "Ask questions about an image or screenshot | Asterism",
    description:
      "Upload a photo, screenshot or scanned image and ask about it. A vision model describes it and OCR reads the text in it. PNG, JPG, HEIC and more. Free.",
    h1: "Ask questions about an image",
    lede: "Upload a photograph, a screenshot or a scan and ask about it. The picture is described by a vision model, and any text in it is read with OCR.",
    points: [
      {
        name: "Described, not just read",
        body: "A vision model describes the whole picture, so a question about what a diagram shows works even when there is no text in it at all.",
      },
      {
        name: "Text in the picture",
        body: "OCR recovers the words in a screenshot, a photographed page or a slide photo, and those are searchable too.",
      },
      {
        name: "Phone photos as they are",
        body: "HEIC from an iPhone, WebP, TIFF and animated GIF are all accepted and converted on the way in. Nothing to export first.",
      },
    ],
    faqs: [
      {
        q: "Which image formats are supported?",
        a: "PNG, JPEG, WebP, GIF, BMP, TIFF and HEIC/HEIF.",
      },
      {
        q: "Can I ask about a screenshot or a photo of a whiteboard?",
        a: "Yes. The image is described as a whole and the text in it is read with OCR, so you can ask both what it shows and what it says. Very small or blurred text may not be recovered.",
      },
    ],
  },
];

export function formatPage(slug: string): FormatPage | undefined {
  return FORMAT_PAGES.find((f) => f.slug === slug);
}

/** The landing page's FAQ. Answers repeat what the page states elsewhere. */
export const SITE_FAQS: Faq[] = [
  {
    q: "Is Asterism free?",
    a: "Yes. There is no paid tier and no trial. Uploads are capped in size and in number per hour, so that it can stay free.",
  },
  {
    q: "Do I need an account?",
    a: "No. Your library is kept against an anonymous id your browser creates on first visit. The trade-off: clearing your browser data, or switching device, means a different library.",
  },
  {
    q: "Which files can I chat with?",
    a: "Thirty-one formats: PDF, Word (.docx, .doc, .odt, .rtf), PowerPoint (.pptx, .ppt), Excel (.xlsx, .xls), CSV and TSV, images (PNG, JPEG, WebP, GIF, BMP, TIFF, HEIC), plain text, Markdown, HTML, XML, EPUB and email (.eml, .msg).",
  },
  {
    q: "How are answers cited?",
    a: "Like footnotes. Each claim is numbered against the passage it came from, labelled with the page, slide, sheet or section, and clicking it opens that place beside the answer.",
  },
  {
    q: "Does it read charts and tables, or only text?",
    a: "All three. Figures are described by a vision model and tables are summarised by a language model, so all of it sits in one index and a single question can reach any of it.",
  },
  {
    q: "Can it answer across several documents at once?",
    a: "No, by design. Each document is indexed into its own collection, so an answer is grounded in the document you are asking and can never borrow from another file.",
  },
  {
    q: "Where do my documents go?",
    a: "They are uploaded to and stored on the Asterism server, and sent on to the model providers behind it (currently Groq and Google Gemini) to describe their figures and tables. Other visitors cannot see, query or delete them.",
  },
];

/** FAQPage structured data for a list of questions shown on the page. */
export function faqJsonLd(faqs: Faq[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
