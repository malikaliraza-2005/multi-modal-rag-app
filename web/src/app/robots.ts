import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Everything stays crawlable on purpose. /library and /d/* carry a noindex
   meta tag instead, and a crawler has to be allowed to fetch a page to see
   that tag: blocking them here would let a bare URL be indexed anyway. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
