import { getLibraryId } from "@/lib/library-id";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/** Which ingest path produced the document, and therefore how it is viewed. */
export type DocumentKind =
  | "pdf"
  | "docx"
  | "pptx"
  | "sheet"
  | "image"
  | "text"
  | "html"
  | "email";

/** What one unit of the document is called. A deck cites slides, not pages. */
export type Locator = "page" | "slide" | "sheet" | "section" | "message" | "image";

export type DocumentRecord = {
  doc_id: string;
  filename: string;
  ext: string;
  kind: DocumentKind;
  locator: Locator;
  media_type: string;
  has_preview: boolean;
  size: number;
  created_at: string;
  pages: number;
  chunk_count: number;
  image_count: number;
  /** Figures the vision model would not describe — rate limits, refusals. They
      are visible in the viewer but absent from the index. */
  image_failed_count: number;
  table_count: number;
  vector_count: number;
};

export type PreviewBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "list_item"; text: string }
  | { type: "table"; html: string }
  | { type: "image"; src: string; caption: string };

export type PreviewPage = { number: number; blocks: PreviewBlock[] };

/** The structural stand-in shown for formats the browser cannot render. */
export type Preview = { locator: Locator; pages: PreviewPage[] };

export type FileTypes = {
  extensions: string[];
  media_types: string[];
  max_bytes: number;
  /** 0 when the instance does not throttle uploads. */
  uploads_per_hour: number;
};

export type SourceCategory = "text" | "figure" | "table";

export type Source = {
  page: number;
  category: SourceCategory;
  snippet: string;
  score: number;
};

export type QueryResponse = {
  answer: string;
  sources: Source[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Every document route is scoped to this header. Attached here rather
      // than per-call so a new endpoint cannot forget it.
      headers: { ...init?.headers, "X-Library-Id": getLibraryId() },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the indexing service. Is it running on port 8000?",
      0,
    );
  }

  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new ApiError(detail ?? `Request failed (${res.status})`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: () => request<DocumentRecord[]>("/documents"),

  fileTypes: () => request<FileTypes>("/filetypes"),

  getDocument: (docId: string) =>
    request<DocumentRecord>(`/documents/${docId}`),

  getPreview: (docId: string) =>
    request<Preview>(`/documents/${docId}/preview`),

  uploadDocument: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<DocumentRecord>("/documents", { method: "POST", body });
  },

  deleteDocument: (docId: string) =>
    request<void>(`/documents/${docId}`, { method: "DELETE" }),

  query: (docId: string, question: string) =>
    request<QueryResponse>(`/documents/${docId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  // Asset URLs are loaded by the browser itself — <img src> and pdf.js — which
  // cannot attach the header, so these carry the library id in the query.
  fileUrl: (docId: string) =>
    `${API_BASE}/documents/${docId}/file?library=${encodeURIComponent(getLibraryId())}`,

  previewFigureUrl: (docId: string, name: string) =>
    `${API_BASE}/documents/${docId}/preview/media/${name}?library=${encodeURIComponent(getLibraryId())}`,
};
