#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

// import { findPublicPages } from "./findPublicPages";
// const publicPages = findPublicPages();

import fs from "fs-extra";
import path from "path";

import { readJsonSync } from "../util";
import { Block, PageWithMetadata } from "../types";

// TODO TS
const pagesWithMeta: PageWithMetadata<{}, {}>[] = readJsonSync(path.join(__dirname, "..", "..", "graphraw.json")); // TODO FIXME

export type PluginInfo = {
	displayName: string;
	sourceUrl: string;
	originalAuthor: {
		displayName: string;
		githubUrl: string;
	};
};

export const pluginInfo: PluginInfo = {
	// displayName: "plugin-export-public-pages",
	displayName: path.basename(__dirname),
	sourceUrl: "http://github.com/kiprasmel/roam-traverse-graph/tree/master/plugin-export-public-pages",
	originalAuthor: {
		displayName: "kiprasmel",
		githubUrl: "http://github.com/kiprasmel",
	},
};

export const pagesWithMetaAndHtml: PageWithMetadata<{}, {}>[] = pagesWithMeta.map((meta, metaIdx) => {
	console.log(metaIdx, "orig title", meta.originalTitle);
	const { page } = meta;

	// if (meta.originalTitle === "how-fuse-works") {
	// 	(meta as any).html = "";
	// 	return meta;
	// }

	const startTime: Date = new Date();
	const lastSignificantUpdate: Date = new Date(page["edit-time"]);

	/**
	 * TODO - we want static html here. is it time for Svelte?!
	 *
	 * -> YES
	 *
	 */

	(meta as any).html = `\
<!DOCTYPE html>
<html>
	<head>
		<title>${page.title} | notes</title>

		<style>
			/*
				first child
			*/
			ul li:nth-child(1) {
				margin-top: 8px;

				/*
				color: green;
				*/
			}

			/*
				everyone except the first child
			*/
			ul li + li {
				margin-top: 8px;

				/*
				color: blue;
				*/
			}
		</style>
	</head>

	<body>
		<nav>
			<a href="/">/</a>
		</nav>

		<h1>
			${page.title}
		</h1>

		<small>
			<div>
				last edit on:
				<br/>
				${lastSignificantUpdate.toISOString()}.
			</div>

			<div>
				checked, re-generated & exported on:
				<br/>
				${startTime.toISOString()}.
			</div>

			<!--
				TODO dynamic updates "x sec/min/h/day etc. ago" w/ a simple js function + setInterval
			-->
		</small>

		<main>
${joinChildren(
	(page.children || []).map((block) => blockRecursively(block, 3 + 1)),
	3
)}
		</main>

		<aside>

		</aside>

		<footer>
			<center>
				exported from
				<a target="_blank" rel="noopener" href="http://roamresearch.com">
					roam</a>
				via
				<a target="_blank" rel="noopener" href="http://github.com/kiprasmel/roam-traverse-graph">
					roam-traverse-graph</a>'s
				plugin
				<a target="_blank" rel="noopener" href="${pluginInfo.sourceUrl}">
					${pluginInfo.displayName}</a>
				by
				<a target="_blank" rel="noopener" href="${pluginInfo.originalAuthor.githubUrl}">
					${pluginInfo.originalAuthor.displayName}</a>.
			</center>
		</footer>
	</body>
</html>`;

	// .replace(/^[\s\t]+/g, "");

	return meta;
});

const prefix = path.join(__dirname, "notes");

fs.rmdirSync(prefix, { recursive: true });
fs.mkdirpSync(prefix);

pagesWithMetaAndHtml.forEach((meta) => {
	let fixedTitle: string = meta.page.title
		.replace(/\(/g, "(") //
		.replace(/\)/g, ")")
		.replace(/\//g, "/_");

	fixedTitle += ".html";

	const fullPath = path.join(prefix, fixedTitle);
	fs.createFileSync(fullPath);
	fs.writeFileSync(fullPath, (meta as any).html);
});

//

function blockRecursively<M0, M1>(block: Block<M0, M1>, existingTabCount: number): string {
	/**
	 * returning if string is empty would remove empty blocks,
	 * but we don't want that.
	 */
	// if (!block.string) return ``;

	const selfHtml: string = !block.string
		? ""
		: `
	<div style="max-width: 65ch;">
			${block.string}
	</div>
	`;

	const childrenHtml: string[] = (block.children || []).map((child) => blockRecursively(child, existingTabCount + 1));

	const joinedChildrenHtml: string = !block.children?.length ? "" : joinChildren(childrenHtml, 1);

	return `<li>
${selfHtml}

${joinedChildrenHtml}
</li>` //
		.split("\n")
		.map((line) => line.replace(/^[\s\t]*$/g, ""))
		.map((line) => line.replace(/^[\s\t]*\n$/g, "\n"))
		.join("\n")
		.replace(/\n\n\n/g, "\n")
		.replace(/\n\n/g, "\n")
		.replace(/<li>\n\t*<\/li>/, "<li></li>");
}

function joinChildren(childrenHtmls: string[], existingTabCount: number): string {
	return `${"\t".repeat(existingTabCount)}<ul>
${childrenHtmls
	.filter((html) => !!html)
	.map((html) =>
		html
			.split("\n")
			.map((line) => "\t".repeat(existingTabCount + 1) + line)
			.join("\n")
	)
	.join("\n")}
${"\t".repeat(existingTabCount)}</ul>`;

	// ${childrenHtmls.map((html) => "\t".repeat(existingTabCount + 1) + html).join("\n")}
}
