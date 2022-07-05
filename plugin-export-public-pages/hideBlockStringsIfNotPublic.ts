/* eslint-disable indent */
/* eslint-disable react/destructuring-assignment */

import fs from "fs";

import escapeHtml from "escape-html";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef, Block, PageWithMetadata } from "../types";

import {
	ASS, //
	AST,
	beginBoundaries,
	BeginBoundary,
	blockReferenceBeginBoundaries,
	codeblockBeginBoundaries,
	commandBeginBoundaries,
	endBoundaries,
	extras,
	formattingBeginBoundaries,
	LLBeginBoundaries,
	TreeBoundaryNode,
	TreeNode,
	TreeTextNode,
} from "./blockStringToAST";

/**
 * TODO move into `generate-static-html-pages`,
 * but only after it won't invoke the generation process
 * unless module.parent is empty.
 */
export const maxWidthOfLine: number = Number(process.env.NOTES_MAX_WIDTH_OF_LINE) || 65;

// const isNotString = <T>(item: T | string): item is T => typeof item !== "string";
// TODO
// const assertNever = (_x: never): never => {
// 	throw new Error("never");
// };

export const hideBlockStringsIfNotPublic: MutatingActionToExecute<
	{
		hiddenStringValue: string;
		rootParentPage: PageWithMetadata<{}, {}>;
	},
	{},
	{
		isPublic: boolean;
		isPublicOnly: boolean;
		originalString: string;
		hasCodeBlock: boolean;
		linkedReferences: LinkedRef[];
		ASS: ASS;
		AST: AST;
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

	/**
	 * TODO convertStackTreeItemsIntoStrings
	 */
	function walkStackTree(
		initialStackTree: AST,
		{
			onNonText = ({ item, walk }: { walk: typeof _walk; item: TreeBoundaryNode }): string => {
				const begin: BeginBoundary = item[0] as BeginBoundary; // TODO TS NARROW in original AST definition
				const end = beginBoundaries[begin];

				// TODO REFACTOR - take from extras as well?
				const isFormattingOrCodeBlock: boolean =
					begin in formattingBeginBoundaries || begin in codeblockBeginBoundaries;

				const doesNotHaveEnd =
					// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
					// @ts-ignore
					begin in extras && !!((extras?.[begin as any] as any)?.["doesNotHaveEnd"] as boolean); // TODO TS
				const doesNotHaveBegin =
					// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
					// @ts-ignore
					begin in extras && !!((extras?.[begin as any] as any)?.["doesNotHaveBegin"] as boolean); // TODO TS

				const beginStr =
					doesNotHaveBegin || isFormattingOrCodeBlock
						? ""
						: `<span style="color: hsl(207,18%,71%);">${begin || ""}</span>`;
				const midStr = walk([item[1]], item); // TODO VERIFY
				const endStr =
					doesNotHaveEnd || isFormattingOrCodeBlock ? "" : `<span style="color: grey;">${end}</span>`;

				return beginStr + midStr + endStr;
			},
			onIndependentText = ({ item }: { item: TreeTextNode }): string =>
				// if (block.metadata.isPublic || block.metadata.isPublicOnly) {
				// escapeHtml(item.text),
				item,
			// } else {
			// }
			onTextInsideNonText = ({
				item,
				parent,
			}: {
				item: TreeTextNode; //
				parent: TreeBoundaryNode;
			}): string => {
				const escapedText = escapeHtml(item);
				const kind = parent[0];

				if (kind in codeblockBeginBoundaries) {
					if (kind === "`") {
						return `<code class="inline">${escapedText}</code>`;
					} else if (kind === "```") {
						const lines = escapedText.split("\n");

						const lang: string = lines[0];
						lines.splice(0, 1); // remove 1st
						const code: string = lines.join("\n");

						let preSuffix: string = "";

						preSuffix += ` data-lang="${lang}"`;
						preSuffix += ` data-line-count="${lines.length}"`;

						const remainingWidthOfLine =
							maxWidthOfLine - lang.length - kind.length - endBoundaries[kind].length;
						const firstLineClashesWithLang = lines[0].length > remainingWidthOfLine;
						if (firstLineClashesWithLang) {
							preSuffix += ` data-first-line-clashes`;
						}

						return `<pre${preSuffix}><div class="lang">${lang}</div><code>${code}</code></pre>`;
					} else {
						throw new Error("TODO TS -- should be `assertNever`");
						// return assertNever(); // TODO TS
					}
				} else if (kind in commandBeginBoundaries) {
					return escapedText;
					// return item.text;
				} else if (kind in LLBeginBoundaries) {
					/**
					 * TODO proper href (fix title, also hiding, etc.)
					 */
					return `<a href="/${escapedText}.html">${escapedText}</a>`;

					// return item.text; // TODO FIXME
					// return extractMetaPagePotentiallyHiddenTitleFromLinkedRef(block, item);
				} else if (kind in blockReferenceBeginBoundaries) {
					// TODO ACTUALLY INLINE CONTENTS OF BLOCK (or not. think about better UX)
					return `((${escapedText}))`;
				} else if (kind in formattingBeginBoundaries) {
					if (kind === "**") {
						return `<b>${escapedText}</b>`;
					} else if (kind === "__") {
						return `<i>${escapedText}</i>`;
					} else if (kind === "~~") {
						return `<s>${escapedText}</s>`;
					} else if (kind === "^^") {
						return `<mark>${escapedText}</mark>`;
					} else {
						throw new Error("TODO TS -- should be `assertNever`");
						// return assertNever(kind); // TODO TS
					}
				} else {
					throw new Error("TODO TS -- should be `assertNever`");
					// return assertNever(parent); // TODO TS
				}
			},
		} = {}
	) {
		function _walk(stackTree: AST, parent: null | TreeBoundaryNode) {
			let s: string = "";

			stackTree.forEach((item: TreeNode) => {
				if (typeof item !== "string") {
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

		// console.log({ initialStackTree });

		return _walk(initialStackTree, null);
	}

	// TODO FIXME UNDO
	if (block.metadata.isPublic || block.metadata.isPublicOnly || rootParentPage.isFullyPublic) {
		// if (Math.random() > -1) {
		block.string = walkStackTree(block.metadata.AST).trim();
		return block;
	} else {
		const hiddenLinkedRefPrefix: string = "(" + hiddenStringValue + ")" + " ";

		block.string = (
			hiddenLinkedRefPrefix +
			block.uid +
			" " +
			walkStackTree(block.metadata.AST, {
				/**
				 * TODO figure out private logic
				 */
				onIndependentText: ({ item }) => (rootParentPage.isFullyPublic ? item : ""),

				onNonText: ({ item, walk }) => {
					const begin: BeginBoundary = item[0] as BeginBoundary; // TODO TS NARROW in original AST definition
					const end = beginBoundaries[begin];

					const isFormattingOrCodeBlock: boolean =
						begin in formattingBeginBoundaries || begin in codeblockBeginBoundaries;

					const beginStr = isFormattingOrCodeBlock ? "" : begin || "";
					const midStr = walk([item[1]], item); // TODO VERIFY
					const endStr = isFormattingOrCodeBlock ? "" : `<span style="color: grey;">${end}</span>`;

					return beginStr + midStr + endStr;
				},

				onTextInsideNonText: ({ item, parent }) => {
					const kind = parent[0];
					// console.log({ parent, kind, item, block });

					if (kind in codeblockBeginBoundaries) {
						return "";
					} else if (kind in commandBeginBoundaries) {
						return "";
					} else if (kind in LLBeginBoundaries) {
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
					} else if (kind in blockReferenceBeginBoundaries) {
						return ""; // TODO
					} else if (kind in formattingBeginBoundaries) {
						return ""; // TODO
					} else {
						throw new Error("TODO TS -- should be `assertNever`");
						// return assertNever(parent); // TODO TS
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
			originalString: string;
		},
		{}
	>,
	item: TreeTextNode
): string {
	if (!item) {
		return "";
	}

	const linkedReference = block.metadata.linkedReferences.find((lr) => lr.metaPage.originalTitle === item);

	if (!linkedReference) {
		fs.appendFileSync("bad.off", item + "\n");

		throw new Error(
			"linked reference should've been there but wasn't." + //
				"\n" +
				"block.metadata.originalString (block.string was reset previously) = " +
				block.metadata.originalString +
				"\n" +
				"item.text = " +
				item +
				"\n" +
				"block.refs = " +
				JSON.stringify(block.refs, null, 2) +
				"\n" +
				"block.metadata.linkedReferences (" +
				block.metadata.linkedReferences.length +
				") = " +
				block.metadata.linkedReferences.map((lr) => lr.text) +
				"\n" +
				"AST: " +
				JSON.stringify((block.metadata as any).AST, null, 2) // TODO TS
		);
		// return "__WHAT__";
	}

	/**
	 * TODO PRIVACY - ensure that the page.title
	 * already had a chance to be hidden.
	 */
	return linkedReference.metaPage.page.title;
}
