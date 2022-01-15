/* eslint-disable indent */
/* eslint-disable react/destructuring-assignment */

import fs from "fs";

// import escapeHtml from "escape-html";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef, Block, PageWithMetadata } from "../types";

import {
	Stack, //
	StackTree,
	StackTreeBoundaryItem,
	StackTreeItem,
	StackTreeTextItem,
} from "./parseASTFromBlockString";

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
			onNonText = ({ item, walk }: { walk: typeof _walk; item: StackTreeBoundaryItem }): string =>
				// if (item.type === "command") {
				(item.begin || "") +
				// (item.type === "code-block" ? item.children[0].text : walk(item.children, item)) +
				walk(item.children, item) +
				("doesNotConsumeEndingAndThusAlsoAllowsUnfinished" in item &&
				item.doesNotConsumeEndingAndThusAlsoAllowsUnfinished
					? ""
					: Array.isArray(item.end)
					? nonDeterministicItemEndArrayBug
					: item.end),
			// }
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
				if (parent.type === "code-block") {
					// return escapeHtml(item.text);
					return item.text;
				} else if (parent.type === "command") {
					// return escapeHtml(item.text);
					return item.text;
				} else if (parent.type === "linked-reference") {
					return item.text; // TODO FIXME
					// return extractMetaPagePotentiallyHiddenTitleFromLinkedRef(block, item);
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
					const r = onNonText({ walk: _walk, item });
					if (r === undefined) {
						throw new Error("undefined for onNonText");
					}
					s += r;
				} else {
					if (parent === null) {
						const r = onIndependentText({ item });
						if (r === undefined) {
							throw new Error("undefined for onIndependentText");
						}
						s += r;
					} else {
						const r = onTextInsideNonText({ item, parent });
						if (r === undefined) {
							throw new Error("undefined for onTextInsideNonText");
						}
						s += r;
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
		const hiddenLinkedRefPrefix: string = "(" + hiddenStringValue + ")" + " " + block.uid + " ";

		block.string = (
			hiddenLinkedRefPrefix +
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
		fs.mkdirSync("bad", { recursive: true });
		fs.writeFileSync(`bad/${item.text}`, "");

		// throw new Error(
		// 	"linked reference should've been there but wasn't." + //
		// 		"\n" +
		// 		"item.text = " +
		// 		item.text +
		// 		"\n" +
		// 		"block.metadata.linkedReferences = " +
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
