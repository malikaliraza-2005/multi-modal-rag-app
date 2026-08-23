export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** Drop the extension — it is shown separately as a format tag. */
export function baseName(filename: string) {
  return filename.replace(/\.[a-z0-9]{1,9}$/i, "");
}

export function extensionTag(filename: string, fallback = "") {
  const match = /\.([a-z0-9]{1,9})$/i.exec(filename);
  return (match?.[1] ?? fallback.replace(/^\./, "")).toUpperCase();
}
