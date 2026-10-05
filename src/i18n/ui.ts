// 站点 UI 文案：zh（默认，无前缀路由）/ en（/en/ 前缀路由）
// 颜文字模式不是独立语言，是在当前语言上叠加的显示效果（见 Base.astro 的 _setLang）

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";

export const localeLabels: Record<Locale, string> = {
	zh: "中",
	en: "EN",
};

/** 每种语言在 <html lang> 上用的值 */
export const htmlLang: Record<Locale, string> = {
	zh: "zh-CN",
	en: "en",
};

export const ui = {
	zh: {
		// 导航
		navChat: "Chat",
		navGames: "Games",
		navArchives: "Archives",
		navGadgets: "Gadgets",
		navAbout: "About",
		navHome: "Home",
		menu: "菜单",
		// 聊天页
		clawdHint: "点我聊天 · 双击说话 · 可拖动",
		chatTitle: "Chat",
		chatDesc: "跟 bt 养的分身聊两句",
		chatGreeting: "Hello！我是 Clawd，bt 养在这网页上的螃蟹。想聊啥？",
		chatPlaceholder: "说点什么…（Enter 发送 / Shift+Enter 换行）",
		chatSend: "发送",
		chatClear: "重开",
		chatOfflineTitle: "后端还没接上",
		chatOfflineDesc: "聊天服务还在本地测试，暂时没挂到线上。先占个位，接好了就能聊。",
		chatError: "歪日，线断了。要不再试一次？",
		chatThinking: "在想…",
		chatTyping: "在打字…",
		chatIdle: "在线",
		chatNote: "bt 自己用 MiniMind 训的 64M 小模型，说错话别打它",
		// 通用
		backHome: "← 返回首页",
		onThisPage: "On This Page",
		scrollToSeeHeadings: "向下滚动查看目录",
		noSections: "暂无目录",
		tags: "Tags",
		language: "语言",
		// 排序
		sortNewest: "最新",
		sortOldest: "最早",
		sortAz: "A → Z",
		sortZa: "Z → A",
		// 首页
		homeKicker: "bt's blog — tech notes",
		homeTagline: "金鳞岂是池中物，一遇风云便化龙",
		groupIelts: "IELTS · 雅思",
		groupCs: "CS · 计算机专业",
		groupEssay: "随笔",
		groupTest: "测试",
		postCount: "篇",
		pinned: "PINNED",
		// 归档
		archivesTitle: "Archives",
		archivesDesc: "按年份归档的全部文章",
		postsTotal: "篇文章",
		// 文章页
		updated: "更新于",
		published: "发布于",
		readMore: "阅读全文",
		// 关于
		aboutTitle: "About",
		aboutDesc: "技术博客，记录学习与成长。",
		// 页脚
		footerRights: "保留所有权利",
	},
	en: {
		navChat: "Chat",
		navGames: "Games",
		navArchives: "Archives",
		navGadgets: "Gadgets",
		navAbout: "About",
		navHome: "Home",
		menu: "Menu",
		// Chat page
		clawdHint: "Click to chat · double-click to talk · draggable",
		chatTitle: "Chat",
		chatDesc: "Have a word with bt's little persona",
		chatGreeting: "Hello! I'm Clawd, the crab bt keeps on this page. What's up?",
		chatPlaceholder: "Say something… (Enter to send / Shift+Enter for a new line)",
		chatSend: "Send",
		chatClear: "Reset",
		chatOfflineTitle: "Backend not wired up yet",
		chatOfflineDesc:
			"The chat service is still being tested locally and isn't online yet. Holding the spot for now.",
		chatError: "Ugh, the line dropped. Try again?",
		chatThinking: "Thinking…",
		chatTyping: "Typing…",
		chatIdle: "Online",
		chatNote: "A 64M MiniMind model bt trained himself — go easy on it when it gets things wrong",
		backHome: "← Back to Home",
		onThisPage: "On This Page",
		scrollToSeeHeadings: "Scroll to see headings",
		noSections: "No sections",
		tags: "Tags",
		language: "Language",
		sortNewest: "Newest",
		sortOldest: "Oldest",
		sortAz: "A → Z",
		sortZa: "Z → A",
		homeKicker: "bt's blog — tech notes",
		homeTagline:
			"A golden carp is no pond creature — once it meets the wind and clouds, it becomes a dragon.",
		groupIelts: "IELTS",
		groupCs: "CS · Computer Science",
		groupEssay: "Essays",
		groupTest: "Tests",
		postCount: "posts",
		pinned: "PINNED",
		archivesTitle: "Archives",
		archivesDesc: "Every post, archived by year",
		postsTotal: "posts in total",
		updated: "Updated",
		published: "Published",
		readMore: "Read more",
		aboutTitle: "About",
		aboutDesc: "A tech blog, documenting learning and growth.",
		footerRights: "All rights reserved",
	},
} as const;

export type UIKey = keyof (typeof ui)["zh"];

export function useTranslations(lang: Locale) {
	return function t(key: UIKey): string {
		return ui[lang][key] ?? ui[DEFAULT_LOCALE][key];
	};
}

/**
 * 标签的英文展示名。URL 里仍然用中文 slug（/tags/雅思/ 与 /en/tags/雅思/ 指向同一批文章），
 * 只翻译显示出来的那个词。
 */
const tagLabelsEn: Record<string, string> = {
	8086: "8086",
	Minecraft: "Minecraft",
	happy: "happy",
	写作: "Writing",
	口语: "Speaking",
	壁纸: "Wallpaper",
	备考: "Exam Prep",
	排序: "Sorting",
	数据结构: "Data Structures",
	期末复习: "Final Review",
	查找: "Searching",
	模板: "Templates",
	模电: "Analog Electronics",
	汇编语言: "Assembly",
	电路: "Circuits",
	算法: "Algorithms",
	考试: "Exam",
	随笔: "Essay",
	雅思: "IELTS",
	题库: "Question Bank",
};

export function tagLabel(tag: string, lang: Locale): string {
	return lang === "en" ? (tagLabelsEn[tag] ?? tag) : tag;
}
