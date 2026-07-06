import type { Metadata } from "next";
import "./globals.css";
// KaTeX 全局 CSS：让所有静态页（含 /about/）都带 katex 样式，
// Edge SSR（functions/blog）从 /about/ 提取 CSS 时也能拿到，文章公式有样式。
import "katex/dist/katex.min.css";
import ThemeProvider from "@/components/theme-provider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL + "/"),
  title: {
    default: SITE.title,
    template: "%s — Yuyeyyy",
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE.title,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
