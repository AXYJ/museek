// URL publique du site, utilisée par les métadonnées, le sitemap et les données structurées.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://museek.xiao-web.com"
).replace(/\/$/, "");
