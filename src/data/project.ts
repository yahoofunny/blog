import { type CollectionEntry, getCollection } from "astro:content";

export type ProjectEntry = CollectionEntry<"project">;

export const projectStatus: Record<
	ProjectEntry["data"]["status"],
	{ label: string; labelEn: string; color: string }
> = {
	active: { label: "实机运行中", labelEn: "Live", color: "var(--wm-primary)" },
	maintained: { label: "持续维护", labelEn: "Maintained", color: "var(--wm-primary-soft)" },
	wip: { label: "开发中", labelEn: "In progress", color: "#c98434" },
	archived: { label: "已归档", labelEn: "Archived", color: "var(--wm-muted)" },
};

/** 按 order、再按日期排序；草稿只在开发环境出现 */
export async function getProjects(): Promise<ProjectEntry[]> {
	const projects = await getCollection("project", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});

	return projects.sort((a, b) => {
		if (a.data.order !== b.data.order) return a.data.order - b.data.order;
		return b.data.publishDate.getTime() - a.data.publishDate.getTime();
	});
}
