#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import fs from "fs-extra";
import path from "path";

import { findPublicPages } from "./findPublicPages";

import { readJsonSync } from "../util";
import { Block, LinkedMention, PageWithMetadata, RO } from "../types";

/**
 * there's a difference between reading from a already generated json file,
 * and re-run the function that generates the json file,
 *
 * because when we write into file, we remove circulars,
 * and it would break behavior.
 *
 */
// const pagesWithMeta: PageWithMetadata<{}, {}>[] = readJsonSync(path.join(__dirname, "..", "..", "graphraw.json")); // BAD, DO NOT USE
const pagesWithMeta: PageWithMetadata<{}, {}>[] = findPublicPages(
	readJsonSync(process.env.PATH_TO_ROAM_GRAPH || path.join(__dirname, "..", "..", "notes", "json", "kipras-g1.json")),
	{
		keepMetadata: true,
	}
);

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

	const mentionsGroupedByPage: LinkedMention<{}, {}>[][] = groupBy<LinkedMention<{}, {}>>(
		"originalTitleOfPageContainingBlock",
		(meta.linkedMentions || []) //
			.sort((A, B) => B.blockRef["create-time"] - A.blockRef["create-time"] || 0)
	).filter((mentionsGroupedByPage) => mentionsGroupedByPage.length);

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
			<!--
				TODO "in graphName"
			-->
			<a href="/">all notes</a>
		</nav>

		<h1>
			${page.title}
		</h1>

		<small>
			<div>
				last edit (excluding linked mentions) on: <!-- TODO linked mentions too -->
				<br/>
				${lastSignificantUpdate.toISOString()}
				
			</div>

			<div style="margin-top: 0.5rem; ">
				checked, re-generated & exported on:
				<br/>
				${startTime.toISOString()}
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
			<h2>
				Linked Mentions (${(meta.linkedMentions || []).length} in ${mentionsGroupedByPage.length} ${
		[1, -1].includes(mentionsGroupedByPage.length) ? "page" : "pages"
	})
			</h2>

			<ol>
${drawLinkedMentions(mentionsGroupedByPage)}
			</ol>
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
		.replace(/\//g, "_");

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

function groupBy<T, K extends keyof T = keyof T>(itemKey: K, items: T[]): T[][] {
	const map: Map<T[K], T[]> = new Map();

	items.forEach((item) => {
		const groupKey: T[K] = item[itemKey];

		let group: T[] | undefined = map.get(groupKey);

		if (!group) {
			group = [];
		}

		group.push(item);

		map.set(groupKey, group);
	});

	return [...map.values()];
}

function drawLinkedMentions<M0 extends RO, M1 extends RO>(mentionsGroupedByPage: LinkedMention<M0, M1>[][]): string {
	return mentionsGroupedByPage
		.map(
			(mentionsOfAPage) =>
				/**
				 * TODO - do advanced grouping, similar to turbo-schedule's hierarchy
				 *
				 * go to mention's root page,
				 * iter thru blocks recursively,
				 * detect if linkedReferences include this page,
				 * and group them, just like we do w/ the children when doing regular display.
				 */
				`\
<li>
	<h3>
		<!--
		<span style="background-color: hsl(0, 0%, 95%); padding: 4px 16px; ">
		-->
			${mentionsOfAPage[0].pageContainingBlock.page.title} (${mentionsOfAPage.length})
		<!--
		</span>
		-->
	</h3>
	<ul>
		${mentionsOfAPage
			.map(
				(mention) => `\
		<li>
			<!--
				TODO <h4> for semantics
			-->

			<!--
			TODO add this back, once clickable.

			<span style="background-color: hsl(0, 0%, 95%); padding: 3px 6px; ">
			-->
			${
				!mention.blockRef.string
					? ""
					: `<div style="max-width: 65ch; ">
				${mention.blockRef.string}
			</div>`
			}
			<!--
			</span>
			-->
${
	/**
	 * we're re-doing this multiple times.
	 * instead, this should already be available as metadata on the block.
	 *
	 * we need to walk properly to implement that.
	 *
	 * proper walking also will allow advanced grouping.
	 *
	 */
	joinChildren(
		(mention.blockRef.children || []).map((block) => blockRecursively(block, 0 + 1)),
		0
	)
}
		</li>`
			)
			.join("\n")}
	</ul>
</li>`
		)
		.join("\n");
}
