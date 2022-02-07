/* eslint-disable indent */
/* eslint-disable react/destructuring-assignment */

import fs from "fs";

import escapeHtml from "escape-html";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef, Block, PageWithMetadata } from "../types";

import {
	Stack, //
	StackTree,
	StackTreeBoundaryItem,
	StackTreeItem,
	StackTreeTextItem,
} from "./parseASTFromBlockString";

/**
 * TODO move into `generate-static-html-pages`,
 * but only after it won't invoke the generation process
 * unless module.parent is empty.
 */
export const maxWidthOfLine: number = Number(process.env.NOTES_MAX_WIDTH_OF_LINE) || 65;

// const isNotString = <T>(item: T | string): item is T => typeof item !== "string";
const assertNever = (_x: never): never => {
	throw new Error("never");
};

export const hideBlockStringsIfNotPublic: MutatingActionToExecute<
	{
		hiddenStringValue: string;
		rootParentPage: PageWithMetadata<{}, {}>;
	},
	{},
	{
		isPublic: boolean;
		isPublicOnly: boolean;
		hasCodeBlock: boolean;
		linkedReferences: LinkedRef[];
		stack: Stack;
		stackTree: StackTree;
	}
> = ({
	hiddenStringValue, //
	rootParentPage,
}) => (block) => {
	/**
	 * TODO rename the plugin
	 */

	if (!block.string?.trim()) {
		return block;
	}

	block.string = "";

	const nonDeterministicItemEndArrayBug = "<BUG item.end should NEVER be an array if it does consume it's ending, because then choosing the ending is non-deterministic.>" as const;

	/**
	 * TODO convertStackTreeItemsIntoStrings
	 */
	function walkStackTree(
		initialStackTree: StackTree,
		{
			onNonText = ({ item, walk }: { walk: typeof _walk; item: StackTreeBoundaryItem }): string => (
				void 0,
				// if (item.type === "command") {
				(item.type === "formatting" || item.type === "code-block"
					? ""
					: `<span style="color: hsl(207,18%,71%);">${item.begin || ""}</span>`) +
					// (item.type === "code-block" ? item.children[0].text : walk(item.children, item)) +
					walk(item.children, item) +
					("doesNotConsumeEndingAndThusAlsoAllowsUnfinished" in item &&
					item.doesNotConsumeEndingAndThusAlsoAllowsUnfinished
						? ""
						: Array.isArray(item.end)
						? nonDeterministicItemEndArrayBug
						: item.type === "formatting" || item.type === "code-block"
						? ""
						: `<span style="color: grey;">${item.end}</span>`)
				// }
			),
			onIndependentText = ({ item }: { item: StackTreeTextItem }): string =>
				// if (block.metadata.isPublic || block.metadata.isPublicOnly) {
				// escapeHtml(item.text),
				item.text,
			// } else {
			// }
			onTextInsideNonText = ({
				item,
				parent,
			}: {
				item: StackTreeTextItem;
				parent: StackTreeBoundaryItem;
			}): string => {
				const escapedText = escapeHtml(item.text);

				if (parent.type === "code-block") {
					if (parent.kind === "inline") {
						return `<code class="inline">${escapedText}</code>`;
					} else if (parent.kind === "whole") {
						const lines = escapedText.split("\n");

						const lang: string = lines[0];
						lines.splice(0, 1); // remove 1st
						const code: string = lines.join("\n");

						let preSuffix: string = "";

						preSuffix += ` data-lang="${lang}"`;
						preSuffix += ` data-line-count="${lines.length}"`;

						const remainingWidthOfLine = maxWidthOfLine - lang.length - 6;
						const firstLineClashesWithLang = lines[0].length > remainingWidthOfLine;
						if (firstLineClashesWithLang) {
							preSuffix += ` data-first-line-clashes`;
						}

						return `<pre${preSuffix}><div class="lang">${lang}</div><code>${code}</code></pre>`;
					} else {
						return assertNever(parent);
					}
				} else if (parent.type === "command") {
					return escapedText;
					// return item.text;
				} else if (parent.type === "linked-reference") {
					/**
					 * TODO proper href (fix title, also hiding, etc.)
					 */
					return `<a href="/${escapedText}.html">${escapedText}</a>`;

					// return item.text; // TODO FIXME
					// return extractMetaPagePotentiallyHiddenTitleFromLinkedRef(block, item);
				} else if (parent.type === "formatting") {
					if (parent.kind === "****") {
						return `<b>${escapedText}</b>`;
					} else if (parent.kind === "____") {
						return `<i>${escapedText}</i>`;
					} else if (parent.kind === "~~~~") {
						return `<s>${escapedText}</s>`;
					} else if (parent.kind === "^^^^") {
						return `<mark>${escapedText}</mark>`;
					} else {
						return assertNever(parent);
					}
				} else {
					return assertNever(parent);
				}
			},
		} = {}
	) {
		function _walk(stackTree: StackTree, parent: null | StackTreeBoundaryItem) {
			let s: string = "";

			stackTree.forEach((item: StackTreeItem) => {
				if (item.type !== "text") {
					s += onNonText({ walk: _walk, item });
				} else {
					if (parent === null) {
						s += onIndependentText({ item });
					} else {
						s += onTextInsideNonText({ item, parent });
					}
				}
			});

			return s;
		}

		return _walk(initialStackTree, null);
	}

	// TODO FIXME UNDO
	if (block.metadata.isPublic || block.metadata.isPublicOnly || rootParentPage.isFullyPublic) {
		// if (Math.random() > -1) {
		block.string = walkStackTree(block.metadata.stackTree).trim();
		return block;
	} else {
		const hiddenLinkedRefPrefix: string = "(" + hiddenStringValue + ")" + " ";

		block.string = (
			hiddenLinkedRefPrefix +
			block.uid +
			" " +
			walkStackTree(block.metadata.stackTree, {
				/**
				 * TODO figure out private logic
				 */
				onIndependentText: ({ item }) => (rootParentPage.isFullyPublic ? item.text : ""),
				onNonText: ({ item, walk }) =>
					item.type === "linked-reference" || item.type === "command"
						? (item.begin || "") + //
						  walk(item.children, item) +
						  ("doesNotConsumeEndingAndThusAlsoAllowsUnfinished" in item &&
						  item.doesNotConsumeEndingAndThusAlsoAllowsUnfinished
								? ""
								: Array.isArray(item.end)
								? nonDeterministicItemEndArrayBug
								: item.end)
						: "",
				onTextInsideNonText: ({ item, parent }) => {
					if (parent.type === "code-block") {
						return "";
					} else if (parent.type === "command") {
						return "";
					} else if (parent.type === "linked-reference") {
						// const unwrap = (sr: StackTree): any =>
						// 	sr.map((tree) => (tree.type === "text" ? tree.text : unwrap(tree.children)));

						// console.log({
						// 	parent,
						// 	children: parent.children,
						// 	block,
						// 	stackTree: block.metadata.stackTree,
						// 	stackTreeChildren: JSON.stringify(block.metadata.stackTree),
						// 	stack: block.metadata.stack.map((i) => (i[0] === "text" ? i : JSON.stringify(i))),
						// });

						return extractMetaPagePotentiallyHiddenTitleFromLinkedRef(block, item);
					} else if (parent.type === "formatting") {
						return ""; // TODO
					} else {
						return assertNever(parent);
					}
				},
			}).trimStart()
		).trim();

		return block;
	}
};

/**
 * @throws if not found!
 */
function extractMetaPagePotentiallyHiddenTitleFromLinkedRef(
	block: Block<
		{
			linkedReferences: LinkedRef[];
		},
		{}
	>,
	item: StackTreeTextItem
): string {
	// const linkedReference = block.metadata.linkedReferences.find((lr) => lr.textNode === item);

	const linkedReference = block.metadata.linkedReferences.find(
		(lr) =>
			lr.metaPage.originalTitle === item.text ||
			/**
			 * TODO FIXME temp work-around until i remove the "#foo's" in my graph
			 */
			(item.text.includes("#") &&
				item.text.includes("'") &&
				item.text.split("'")[0] === lr.metaPage.originalTitle) //
	);

	if (!linkedReference) {
		fs.appendFileSync("bad.off", item.text + "\n");

		// throw new Error(
		// 	"linked reference should've been there but wasn't." + //
		// 		"\n" +
		// 		"item.text = " +
		// 		item.text +
		// 		"\n" +
		// 		"block.metadata.linkedReferences = " +item
		// 		block.metadata.linkedReferences.map((lr) => lr.textNode.text)
		// );
		// TODO FIXME HACK
		return "__WHAT__";
	}

	/**
	 * TODO PRIVACY - ensure that the page.title
	 * already had a chance to be hidden.
	 */
	return linkedReference.metaPage.page.title;
}
