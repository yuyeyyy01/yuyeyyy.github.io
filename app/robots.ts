import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = "https://yuyeyyy01.github.io/yuyeyyy.github.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
