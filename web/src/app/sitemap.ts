import type { MetadataRoute } from "next";
import { FORMAT_PAGES } from "@/lib/formats";
import { SITE_URL } from "@/lib/site";

/* The public pages: the landing page and one page per format. The library
   and workspaces are per-visitor and noindexed, so they are not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    ...FORMAT_PAGES.map((f) => ({
      url: `${SITE_URL}/chat-with/${f.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
