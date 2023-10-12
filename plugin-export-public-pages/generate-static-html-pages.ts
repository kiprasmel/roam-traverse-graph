#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import fs from "fs-extra";
import path from "path";

import { findPublicPages } from "./findPublicPages";
import { maxWidthOfLine } from "./hideBlockStringsIfNotPublic";

import { readJsonSync, writeJsonSync } from "../util";
import { Block, LinkedMention, PageWithMetadata, RO } from "../types";

/**
 * configurables
 */
const notesOfName: string = process.env.NOTES_OF_NAME || "";

console.log({ notesOfName });

/**
 *
 */
const pageTitleExtras = "notes" + (!notesOfName ? "" : " | " + notesOfName);

console.log({ pageTitleExtras });

/**
 * there's a difference between reading from a already generated json file,
 * and re-run the function that generates the json file,
 *
 * because when we write into file, we remove circulars,
 * and it would break behavior.
 *
 */

export type RequiredBlockMetadata = {
	originalString: string;
};

// const pagesWithMeta: PageWithMetadata<{}, {}>[] = readJsonSync(path.join(__dirname, "..", "..", "graphraw.json")); // BAD, DO NOT USE
const pagesWithMeta: PageWithMetadata<
	RequiredBlockMetadata, //
	{}
>[] = findPublicPages<RequiredBlockMetadata>(
	readJsonSync(process.env.PATH_TO_ROAM_GRAPH || path.join(__dirname, "..", "..", "notes", "json", "kipras-g1.json")),
	{
		keepMetadata: true,
	}
);

writeJsonSync("./graphraw.json", pagesWithMeta);

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

const footerContent = ({
	pageSourceUrl, //
	pageHistoryUrl,
}: {
	pageSourceUrl: string; //
	pageHistoryUrl: string;
}): string => `
			<center>
				exported from
				<a target="_blank" rel="noopener" href="http://roamresearch.com">
					roam</a>
				via
				<a target="_blank" rel="noopener" href="http://github.com/kiprasmel/roam-traverse-graph">
					roam-traverse-graph</a>'s
				plugin
				<a target="_blank" rel="noopener" href="${pluginInfo.sourceUrl}">
					${pluginInfo.displayName}</a>.

				<!--
				<span style="display: block; width: 1px; height: 100%;"></span>.
				-->

				view
				<a target="_blank" rel="noopener" href="${pageSourceUrl}">source</a>

				&
				<a target="_blank" rel="noopener" href="${pageHistoryUrl}">history</a>.

				<!--
				by
				<a target="_blank" rel="noopener" href="${pluginInfo.originalAuthor.githubUrl}">
					${pluginInfo.originalAuthor.displayName}</a>,
				-->
			</center>
`;

const fixStaticHref = (
	depthUntilRootPage: number //
) => (
	remainingUrlAfterRootPage: string, //
	selector: string
) => `
		<script>
			/**
			 * if the website is mounted on a different path than the assumed "/notes",
			 * this will be needed for some links to work.
			 * 
			 * removes n paths (as specified at compile time with "depthUntilRootPage"),
			 * to make the href work again.
			 */
			document
				.querySelector('${selector}')
				.setAttribute(
					"href",
					window.location.href.replace(
													/(\\/[^\\/]*$){${depthUntilRootPage}}/, "")
													+
													"${remainingUrlAfterRootPage}"
												);
		</script>
`;

export const pagesWithMetaAndHtml: PageWithMetadata<
	RequiredBlockMetadata, //
	{}
>[] = pagesWithMeta.map((meta, metaIdx) => {
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
			.sort((A, B) => (B.blockRef["create-time"] || -Infinity) - (A.blockRef["create-time"] || -Infinity) || 0)
	).filter((mentionsGroupedByPageTmp) => mentionsGroupedByPageTmp.length);

	/**
	 * TODO - we want static html here. is it time for Svelte?!
	 *
	 * -> YES
	 * -> MAYBE
	 *
	 */

	/**
	 * TODO configurable
	 */
	// let initialOrderOfLinkedMentions: "oldest-first" | "newest-first" = "newest-first";
	// eslint-disable-next-line prefer-const
	let initialOrderOfLinkedMentions: "oldest-first" | "newest-first" = (meta.linkedReferencesFromChildren || []).some(
		(lr) =>
			lr.blockRef.metadata.depth === 1 &&
			// TODO config
			lr.referencedPageRef.originalTitle === "oldest-first"
	)
		? "oldest-first"
		: "newest-first";

	/**
	 * let's paint.
	 */

	(meta as any).html = `\
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />

		<title>${page.title} | ${pageTitleExtras}</title>

		<link rel="shortcut icon" type="image/x-icon" href="/notes/favicon.ico">
		${fixStaticHref(1)("/favicon.ico", 'link[type="image/x-icon"]')}

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

			/*
				works almost exactly how it should
				but the problem is -- the href element should only appear
				when you hover the __list-style item of the li__,
				and __not__ the li itself.

				that would also fix the problem that
				the :hover propagates up into higher li's.
			*/
			/*
			ul > li[id]:hover {
				list-style: none;
			}
			*/
			/*
				we used these 2 w/ the previous one,
				but turns out it's pretty meh,
				& also the links are not clickable unless you're hovering,
				which is not ideal, e.g. screen readers, or even vimium
			*/
			/*
			ul > li[id] a {
				visibility: hidden;
			}

			ul > li[id]:hover > a {
				visibility: initial;
			}
			*/

			/*
				simply become an invisible, empty, yet clickable, element,
				& hide right behind the list-style'ing of the <li>
			*/
			a.block-ref {
				/* ensure moves left */
				float: left;

				/* moves right around the list-style'ing */
				margin-left: -21px;
				margin-top: -1px;

				width: 20px;
				height: 20px;

				/*
					become clickable, even if hovering on the li's list-style'ing
					does not seem to be going in weird places, surprisingly just works
				*/
				position: absolute;
			}

			/*
				links
			*/
			a {
				text-decoration: none;
			}
			a:hover {
				text-decoration: underline;
			}

			/* same color for visited & non visited */
			a, a:visited {
				color: blue;
			}

			pre {
				border: 1px solid;
				border-radius: 4px;
				position: relative;
			}
			pre > .lang {
				position: absolute;
				top: 0;
				right: 0;
				padding: 0.3em;
				border-bottom: 1px solid black;
				border-left: 1px solid black;

				pointer-events: none;
				user-select: none;

				color: black;
			}
			pre[data-line-count="1"] > .lang,
			pre[data-line-count="2"] > .lang {
				padding: 0.2em;
			}
			pre > code {
				display: block;
				padding: 1em;
			}
			pre[data-first-line-clashes] > code {
  				margin-top: 1.8em;
			}
			code.inline {
				/*
				padding: 0.1em 0.4em;
				background-color: hsl(35, 100%, 80%);
				*/
				padding: 0em 0.4em;
				border: 2px solid hsl(35, 100%, 80%);
				color: black;
				border-radius: 3px;
			}
			code {
				overflow-x: auto;
			}

		</style>

		<script type="text/javascript">
			/** note - interval won't work because of this - if enabling again (unlikely), disable this: */
			var pageLoadTime = new Date();

			function updateAndSetIntervalToUpdateFor(id, initialTimeMs) {
				var el = document.getElementById(id);

				function update() {
					/**
					 * floor & divide & multiple to make the milisecond difference go away,
					 * so that if multiple functions are called,
					 * and the page is refreshed fast,
					 * all values update at the same time.
					 */
					var msAgo = pageLoadTime.getTime() - (Math.floor(initialTimeMs / 1000) * 1000);
					/* var msAgo = new Date().getTime() - initialTimeMs; */

					var secAgo =  msAgo / 1000;
					var minAgo = secAgo /   60;
					var hAgo   = minAgo /   60;
					var dayAgo =   hAgo /   24;

					dayAgo = Math.floor(dayAgo);
					hAgo   = Math.floor(  hAgo);
					minAgo = Math.floor(minAgo);
					secAgo = Math.floor(secAgo);
					msAgo  = Math.floor( msAgo);

					msAgo  = msAgo  - (secAgo * 1000);
					secAgo = secAgo - (minAgo *   60);
					minAgo = minAgo - (  hAgo *   60);
					hAgo   = hAgo   - (dayAgo *   24);
					dayAgo = dayAgo                  ;

					console.log({ id, dayAgo, hAgo, minAgo, secAgo, msAgo });

					el.textContent = dayAgo + " days, " + (hAgo) + " hours, " + (minAgo) + " mins, " + (secAgo) + " seconds" + " ago."
				};

				update();
				
				/* disabled because gives false sense of security because if actually re-generated, it won't refresh the page. */
				/* window.setInterval(update, 1000); */
			}
		</script>
		<!--
					el.textContent = "(" + dayAgo + " days, " + (hAgo) + " hours, " + (minAgo) + " mins, " + (secAgo) + " secs" + " ago)";

				window.setInterval(update, 1000);
		-->

	</head>

	<body>
		<nav>
			<!--
				TODO "in graphName"
			-->
			<a id="all-notes" href="/notes">
				all notes
			</a>
			${fixStaticHref(1)("/", "a#all-notes")}
		</nav>

		<h1>
			${page.title}
		</h1>

		<small>
			<table>
				<tbody>
					<tr title="self + linked mentions = total">
						<td>words:</td>
						<td>
							<span>${meta.wordCount}</span>
							+ <span>${meta.wordCountOfLinkedMentions}</span>
							= <span>${meta.wordCountTotal}</span>
						</td>
					</tr>
					<tr title="${startTime.toISOString()} (only self: ${lastSignificantUpdate.toISOString()})"> <!-- GIT_MEANINGLESS_CHANGE -->
						<td>last update:</td>
						<td>
							<span id="ago-2"></span>
						</td>
					</tr>
				</tbody>
			</table>

			<script type="text/javascript">
				updateAndSetIntervalToUpdateFor("ago-2", ${startTime.getTime()}); /** GIT_MEANINGLESS_CHANGE */
			</script>
		</small>

		<main>
${joinChildren(
	(page.children || []).map((block) => blockRecursively(block, 3 + 1)),
	3
)}
		</main>

		<aside>
			<script>
				// var localStorageKeyOfLinkedMentionsOrder = "notes.linked-mentions-order.${meta.page.uid}";

				function toggleOrderOfLinkedMentions(btn /*, localStorageKey */) {
					var oldest = "oldest-first";
					var newest = "newest-first";

					var linkedMentions = document.getElementById("linked-mentions");
					var order = "data-order"
					var currentOrder = linkedMentions.attributes[order].value;

					if (currentOrder === oldest) {
						var newOrder = newest;

						btn.textContent = newOrder;
						// localStorage.setItem(localStorageKey, newOrder);

						linkedMentions.attributes[order].value = newOrder;
						linkedMentions.style["flex-direction"] = "column-reverse";

					} else if (currentOrder === newest) {
						var newOrder = oldest;

						btn.textContent = newOrder;
						// localStorage.setItem(localStorageKey, newOrder);

						linkedMentions.attributes[order].value = newOrder;
						linkedMentions.style["flex-direction"] = "column";
					} else {
						throw new Error("invalid order found: " + currentOrder);
					}
				}
			</script>

			<h2>
				Linked Mentions 
				(${(meta.linkedMentions || []).length}
				in
				${mentionsGroupedByPage.length}
				${[1, -1].includes(mentionsGroupedByPage.length) ? "page" : "pages"})

				<button
					id="order-toggle"
					onclick="toggleOrderOfLinkedMentions(this)"
					title="shows current value. click to toggle."
				>
					${initialOrderOfLinkedMentions}
				</button>

			</h2>

			<ol
				id="linked-mentions"
				data-order="${initialOrderOfLinkedMentions}"
				style="display: flex; flex-direction: ${initialOrderOfLinkedMentions === "oldest-first" ? "column" : "column-reverse"};"
			>
				${drawLinkedMentions(mentionsGroupedByPage.reverse())}
			</ol>
		</aside>

		<footer>
			<!--
				TODO FIXME - fix the title into proper filename/url in a central place
				& use it here.
			-->
			${footerContent({
				pageSourceUrl: `http://github.com/kiprasmel/notes/tree/master/${page.title}.html`,
				pageHistoryUrl: `https://github.com/kiprasmel/notes/commits/master/${page.title}.html`,
			})}
		</footer>
	</body>
</html>`;

	// .replace(/^[\s\t]+/g, "");

	return meta;
});

const prefix = path.join(__dirname, "notes");

fs.mkdirpSync(prefix);

const oldFilePaths = fs.readdirSync(prefix).map((file) => path.join(prefix, file));
oldFilePaths //
	.filter((file) => /.html$/.test(file))
	.map((file) => fs.removeSync(file));

const fixTitle = (title: string): string =>
	title
		.replace(/\(/g, "(") //
		.replace(/\)/g, ")")
		.replace(/\//g, "_") + ".html";

pagesWithMetaAndHtml.forEach((meta) => {
	const fixedTitle: string = fixTitle(meta.page.title);

	const fullPath = path.join(prefix, fixedTitle);
	fs.createFileSync(fullPath);
	fs.writeFileSync(fullPath, (meta as any).html);
});

const indexHtml: string = `\
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${pageTitleExtras}</title>

	<link rel="shortcut icon" type="image/x-icon" href="/notes/favicon.ico">
	${fixStaticHref(0)("/favicon.ico", 'link[type="image/x-icon"]')}

	</head>

	<body>
		<ol>
		${pagesWithMetaAndHtml
			.map(
				(meta): string => `\
			<li id="${meta.page.uid}">
				<a href="${fixTitle(meta.page.title)}">
					${meta.page.title}
				</a>
			</li>`
			)
			.join("\n")}
		</ol>

		<footer>
			${footerContent({
				pageSourceUrl: `http://github.com/kiprasmel/notes/tree/master/index.html`,
				pageHistoryUrl: `https://github.com/kiprasmel/notes/commits/master/index.html`,
			})}
			
		</footer>
	</body>
</html>
`;

fs.writeFileSync(path.join(prefix, "index.html"), indexHtml);

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
	<div style="max-width: ${maxWidthOfLine}ch;">
			${block.string}
	</div>
	`;

	const childrenHtml: string[] = (block.children || []).map((child) => blockRecursively(child, existingTabCount + 1));

	const joinedChildrenHtml: string = !block.children?.length ? "" : joinChildren(childrenHtml, 1);

	return `<li id="${block.uid}">
<a href="#${block.uid}" class="block-ref"></a>

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

function joinChildren(childrenHtmls: string[], _existingTabCount: number): string {
	return `${"\t".repeat(0)}<ul>
${childrenHtmls
	.filter((html) => !!html)
	.map((html) =>
		html
			.split("\n")
			// .map((line) => "\t".repeat(0 + 1) + line)
			.map((line) => "\t".repeat(0 + 0) + line)
			.join("\n")
	)
	.join("\n")}
${"\t".repeat(0)}</ul>`;

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
		<li id="${mention.blockRef.uid}">
			<a href="#${mention.blockRef.uid}" class="block-ref"></a>

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
					: `<div style="max-width: ${maxWidthOfLine}ch; ">
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
