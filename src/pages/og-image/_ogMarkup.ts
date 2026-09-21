import { html } from "satori-html";
import { siteConfig } from "@/site.config";

// OG image markup, use https://og-playground.vercel.app/ to design your own.
export const ogMarkup = (title: string, pubDate: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[#fdfdfd] text-[#4a4a4a]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6 text-[#8a8a8a]">${pubDate}</p>
			<h1 tw="text-6xl font-bold leading-snug text-[#111111]">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t-2 border-[#0000f2] text-[#111111]">
			<p tw="text-2xl ml-3 font-semibold text-[#0000f2]">${siteConfig.title}</p>
			<p>by ${siteConfig.author}</p>
		</div>
	</div>`;
