import { DEFAULT_LOCALE, type Locale } from "./ui";

/** 从 URL 路径判断当前语言：/en/... 是英文，其它一律中文 */
export function getLocaleFromPath(pathname: string): Locale {
	const p = pathname.replace(/\/+$/, "") || "/";
	if (p === "/en" || p.startsWith("/en/")) return "en";
	return DEFAULT_LOCALE;
}

/** 把一条「中文路径」转成目标语言路径 */
export function localizePath(path: string, lang: Locale): string {
	const clean = path.startsWith("/") ? path : `/${path}`;
	if (lang === DEFAULT_LOCALE) return clean;
	return clean === "/" ? "/en/" : `/en${clean}`;
}

/** 当前路径 → 另一种语言的同一页路径（用于语言切换按钮） */
export function switchLocalePath(pathname: string, target: Locale): string {
	const p = pathname.replace(/\/+$/, "") || "/";
	const bare = p === "/en" ? "/" : p.startsWith("/en/") ? p.slice(3) : p;
	return localizePath(bare, target);
}
