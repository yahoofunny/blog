import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  url: "https://blog-6rb.pages.dev/",
  title: "bt's Blog",
  author: "bt",
  description: "数据结构、算法笔记 :)",
  lang: "zh-CN",
  ogLocale: "zh_CN",
  date: {
    locale: "zh-CN",
    options: {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  },
};

export const menuLinks: { path: string; title: string }[] = [
  { path: "/", title: "Home" },
  { path: "/posts/", title: "Posts" },
  { path: "/about/", title: "About" },
];

export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
  styleOverrides: {
    borderRadius: "6px",
    codeFontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    codeFontSize: "0.85rem",
    codeLineHeight: "1.5rem",
    codePaddingInline: "1rem",
    frames: { frameBoxShadowCssValue: "none" },
    uiLineHeight: "inherit",
  },
  themeCssSelector(theme, { styleVariants }) {
    if (styleVariants.length >= 2) {
      const baseTheme = styleVariants[0]?.theme;
      const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
      if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
    }
    return `[data-theme="${theme.name}"]`;
  },
  themes: ["github-dark", "github-light"],
  useThemedScrollbars: false,
};
