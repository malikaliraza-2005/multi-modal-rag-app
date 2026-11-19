import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* The landing page is the only page meant to be found by search; the library
   and workspaces are per-visitor and noindexed. Add content pages here. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
