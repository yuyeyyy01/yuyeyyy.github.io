"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * 主题 Provider。
 * 用 data-theme 属性切换，默认深色，持久化到 localStorage。
 */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
