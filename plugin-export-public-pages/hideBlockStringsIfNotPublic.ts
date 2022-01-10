// import escapeHtml from "escape-html";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef, Block } from "../types";

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

	/**
	 * TODO convertStackTreeItemsIntoStrings
	 */
	function walkStackTree(
		initialStackTree: StackTree,
		{
			onNonText = ({ item, walk }: { walk: typeof _walk; item: StackTreeBoundaryItem }): string =>
				// if (item.type === "command") {
				(item.begin || "") + walk(item.children, item) + item.end,
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
				onNonText: ({ item, walk }) =>
					item.type === "linked-reference" || item.type === "command"
						? (item.begin || "") + //
						  walk(item.children, item) +
						  item.end
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
							stack: block.metadata.stack.map((i) => (i[0] === "text" ? i : i[1])),
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
		(lr) => lr.metaPage.originalTitle === item.text //
	);

	if (!linkedReference) {
		throw new Error(
			"linked reference should've been there but wasn't." + //
				"\n" +
				"item.text = " +
				item.text +
				"\n" +
				"block.metadata.linkedReferences = " +
				block.metadata.linkedReferences.map((lr) => lr.textNode.text)
		);
		// TODO FIXME HACK
		// return "__WHAT__";
	}

	/**
	 * TODO PRIVACY - ensure that the page.title
	 * already had a chance to be hidden.
	 */
	return linkedReference.metaPage.page.title;
}
