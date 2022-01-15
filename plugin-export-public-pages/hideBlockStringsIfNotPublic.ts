/* eslint-disable indent */
/* eslint-disable react/destructuring-assignment */

// import fs from "fs";

// import escapeHtml from "escape-html";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef, Block } from "../types";

import {
	Boundary,
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
}) => (block) => {
	/**
	 * TODO rename the plugin
	 */

	block.string = "";

	const startsWith = (haystack: string) => (needle: string): boolean => haystack.slice(needle.length) === needle;

	// const findMatchingEnd = (item: StackTreeBoundaryItem, nextItem: StackTreeItem | null): string =>
	// 	nextItem?.type === "text"
	// 		? "allowUnfinished" in item && item.allowUnfinished
	// 			? // ? Array.isArray(item.end)
	// 			  item.end.find(startsWith(nextItem.text)) ?? ""
	// 			: // :
	// 			//  (item.end as string)
	// 			startsWith(nextItem.text)(item.end)
	// 			? item.end
	// 			: ""
	// 		: "TODO";
	// // Array.isArray(item.end) ?
	// // : "allowUnfinished" in item ? ;

	/**
	 * is this even needed?
	 */
	const findMatchingEnd = (end: Boundary["end"], nextItem: StackTreeItem | null): string =>
		// nextItem === null
		// 	? Array.isArray(end)
		// 		?
		// 		: end === null
		// 			?
		// :
		nextItem === null || nextItem.type !== "text"
			? // = is another boundary (or is empty), nope
			  !Array.isArray(end)
				? end === null
					? ""
					: "<ERROR unmatched end - item.end === null, nextItem.type !== 'text'>"
				: // = is array
				end.some((e) => e === null)
				? // = allow empty
				  ""
				: "<ERROR unmatched end(s) - end.some(e => e === null) !== true (no 'allow empty'), nextItem.type !== 'text'>"
			: // = nextItem is text
			!Array.isArray(end)
			? end === null // = allow empty (only)
				? nextItem === null // = empty (never true)
					? "" // never
					: "<ERROR unmatched (empty) ending - item.end === null, nextItem !== null>"
				: startsWith(nextItem.text)(end as Exclude<typeof end, readonly any[] | null>) // TODO TS AUTO (should be)
				? end
				: ""
			: // = item.end is array
			  // : end.some(e => e === null)
			  // 	? "<ERROR nextItem.type === 'text', end.some(e => e === )>"

			  end.find(startsWith(nextItem.text)) ??
			  "<ERROR nextItem.type === 'text', end.find(e => startsWith(nextItem.text)) !== true>";

	// 	// TODO RM:
	// ? nextItem === null
	// 	? Array.isArray(item.end)
	// 		? item.end.includes(null)
	// 			? ""
	// 			: "TODO"
	// 		: Array.isArray(item.end)
	// 		? item.end.find(startsWith(nextItem.text)) ?? ""
	// 		: item.end
	// 	: startsWith(nextItem.text)(item.end)
	// 	? item.end
	// 	: ""
	// : "TODO";
	// Array.isArray(item.end) ?
	// : "allowUnfinished" in item ? ;

	/**
	 * TODO convertStackTreeItemsIntoStrings
	 */
	function walkStackTree(
		initialStackTree: StackTree,
		{
			onNonText = ({
				item,
				walk,
				nextItem,
			}: {
				walk: typeof _walk;
				item: StackTreeBoundaryItem;
				nextItem: StackTreeItem | null;
			}): string =>
				// if (item.type === "command") {
				(item.begin || "") +
				(item.type === "code-block" ? item.children[0] : walk(item.children, item)) +
				("doesNotConsumeEndingAndThusAlsoAllowsUnfinished" in item &&
				item.doesNotConsumeEndingAndThusAlsoAllowsUnfinished
					? ""
					: findMatchingEnd(item.end, nextItem)),

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
		let s: string = "";

		function _walk(stackTree: StackTree, parent: null | StackTreeBoundaryItem) {
			stackTree.forEach((item: StackTreeItem, i) => {
				const nextItem: StackTreeItem | null = i + 1 >= stackTree.length - 1 ? null : stackTree[i + 1];

				if (item.type !== "text") {
					s += onNonText({ walk: _walk, item, nextItem });
				} else {
					if (parent === null) {
						s += onIndependentText({ item });
					} else {
						s += onTextInsideNonText({ item, parent });
					}
				}
			});
		}

		_walk(initialStackTree, null);
		return s;
	}

	if (block.metadata.isPublic || block.metadata.isPublicOnly) {
		block.string = walkStackTree(block.metadata.stackTree).trim();
		return block;
	} else {
		const hiddenLinkedRefPrefix: string = "(" + hiddenStringValue + ")" + " ";

		block.string = (
			hiddenLinkedRefPrefix +
			walkStackTree(block.metadata.stackTree, {
				onIndependentText: () => "",
				onNonText: ({ item, walk, nextItem }) =>
					item.type === "linked-reference" || item.type === "command"
						? (item.begin || "") + //
						  walk(item.children, item) +
						  findMatchingEnd(item.end, nextItem)
						: "",
				onTextInsideNonText: ({ item, parent }) => {
					if (parent.type === "code-block") {
						return "";
					} else if (parent.type === "command") {
						return "";
					} else if (parent.type === "linked-reference") {
						// const unwrap = (sr: StackTree): any =>
						// 	sr.map((tree) => (tree.type === "text" ? tree.text : unwrap(tree.children)));

						console.log({
							parent,
							children: parent.children,
							block,
							stackTree: block.metadata.stackTree,
							stackTreeChildren: JSON.stringify(block.metadata.stackTree),
							stack: block.metadata.stack.map((i) => (i[0] === "text" ? i : JSON.stringify(i))),
						});

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
		// fs.mkdirSync("bad", { recursive: true });
		// fs.writeFileSync(`bad/${item.text}`, "");

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
