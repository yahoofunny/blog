import { type CollectionEntry, getCollection } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/ui";

/** filter out draft posts based on the environment */
export async function getAllPosts(): Promise<CollectionEntry<"post">[]> {
	return await getCollection("post", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
}

/**
 * 一篇「带语言视图」的文章：路由 id 与中文原文一致，
 * 英文站优先用 post-en 里的译文，缺译文时回落到中文原文（translated=false）。
 */
export interface LocalizedPost {
	id: string;
	lang: Locale;
	title: string;
	description: string;
	tags: string[];
	publishDate: Date;
	updatedDate?: Date | undefined;
	pinned: boolean;
	background?: string | undefined;
	ogImage?: string | undefined;
	/** 实际参与渲染的 entry */
	entry: CollectionEntry<"post"> | CollectionEntry<"postEn">;
	/** 该语言下是否有真正的译文 */
	translated: boolean;
}

export async function getLocalizedPosts(lang: Locale): Promise<LocalizedPost[]> {
	const zhPosts = await getAllPosts();

	if (lang === DEFAULT_LOCALE) {
		return zhPosts.map((p) => ({
			id: p.id,
			lang,
			title: p.data.title,
			description: p.data.description,
			tags: p.data.tags,
			publishDate: p.data.publishDate,
			updatedDate: p.data.updatedDate,
			pinned: p.data.pinned,
			background: p.data.background,
			ogImage: p.data.ogImage,
			entry: p,
			translated: true,
		}));
	}

	const enPosts = await getCollection("postEn");
	const enById = new Map(enPosts.map((p) => [p.id, p] as const));

	return zhPosts.map((p) => {
		const en = enById.get(p.id);
		return {
			id: p.id,
			lang,
			title: en?.data.title ?? p.data.title,
			description: en?.data.description ?? p.data.description,
			tags: p.data.tags,
			publishDate: p.data.publishDate,
			updatedDate: p.data.updatedDate,
			pinned: p.data.pinned,
			background: p.data.background,
			ogImage: p.data.ogImage,
			entry: en ?? p,
			translated: Boolean(en),
		};
	});
}

/** Get tag metadata by tag name */
export async function getTagMeta(tag: string): Promise<CollectionEntry<"tag"> | undefined> {
	const tagEntries = await getCollection("tag", (entry) => {
		return entry.id === tag;
	});
	return tagEntries[0];
}

/** groups posts by year (based on option siteConfig.sortPostsByUpdatedDate), using the year as the key
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 */
export function groupPostsByYear(posts: CollectionEntry<"post">[]) {
	return Object.groupBy(posts, (post) => post.data.publishDate.getFullYear().toString());
}

/** returns all tags created from posts (inc duplicate tags)
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getAllTags(posts: CollectionEntry<"post">[]) {
	return posts.flatMap((post) => [...post.data.tags]);
}

/** returns all unique tags created from posts
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTags(posts: CollectionEntry<"post">[]) {
	return [...new Set(getAllTags(posts))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTagsWithCount(posts: CollectionEntry<"post">[]): [string, number][] {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}
