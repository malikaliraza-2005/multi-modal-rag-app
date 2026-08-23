const STORAGE_KEY = "asterism:library-id";

let cached: string | null = null;

/** The anonymous id that separates your library from everyone else's.

    There are no accounts, so this is the whole identity system: a random value
    minted on first use and kept in localStorage. It is a partition, not a
    credential — it keeps strangers out of each other's uploads on a shared
    deployment, and it is not a login.

    Clearing site data mints a new one, which loses access to the old library.
    That is the honest cost of asking for nothing. */
export function getLibraryId(): string {
  if (cached) return cached;

  // Server render has no storage and makes no API calls; the placeholder just
  // keeps the type honest until the client takes over.
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) {
      cached = existing;
      return existing;
    }
  } catch {
    // Private mode or blocked storage — fall through and mint a throwaway.
  }

  const minted = mint();
  try {
    window.localStorage.setItem(STORAGE_KEY, minted);
  } catch {
    // Not persistable; the library lasts as long as this tab does.
  }
  cached = minted;
  return minted;
}

/** URL-safe base64 of 24 random bytes — 32 characters, matching the server's
    `[A-Za-z0-9_-]{16,64}`. */
function mint(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
