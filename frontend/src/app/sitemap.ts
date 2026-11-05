import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utils/site";

// Mettre à jour ces dates uniquement quand le contenu de la page change.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date("2026-11-05"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/comment-jouer`,
      lastModified: new Date("2026-11-05"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mentions-et-politiques`,
      lastModified: new Date("2026-10-11"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
