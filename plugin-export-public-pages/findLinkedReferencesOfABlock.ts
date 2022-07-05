/* eslint-disable indent */
/* eslint-disable no-param-reassign */

import { ReadonlyTuple } from "util/tuple";
import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedMention, LinkedRef, PageWithMetadata } from "../types";
import { withMetadata } from "../util/withMetadata";
import { StackTreeItem, StackTree, StackTreeTextItem, Stack, StackTreeBoundaryItem } from "./parseASTFromBlockString";

export const findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions: MutatingActionToExecute<
	{
		rootParentPage: PageWithMetadata<{}, {}>; // TODO FIXME
		allPagesWithMetadata: PageWithMetadata<{}, {}>[];
	},
	{
		linkedReferences: LinkedRef[];
	},
	{
		hasCodeBlock: boolean;
		isPublic: boolean;
		isPublicOnly: boolean;
		depth: number;
		stack: Stack;
		stackTree: StackTreeItem[];
	}
> = ({
	allPagesWithMetadata, //
	rootParentPage,
}) => (block) => {
	// console.log({allPagesWithMetadata: allPagesWithMetadata.map(meta => meta.originalTitle)});
	const linkedReferences: LinkedRef[] = findMatchingLinkedReferences(block.metadata.stackTree, allPagesWithMetadata);
	// console.log({stack: block.metadata.stack, linkedReferences});

	const isBlockPublic = block.metadata.isPublic || block.metadata.isPublicOnly;

	if (isBlockPublic) {
		/**
		 * mark the metaPage's that they have at least 1 linked ref.
		 * will be used to NOT hide their titles.
		 */
		linkedReferences.forEach((lr) => (lr.metaPage.hasAtLeastOnePublicLinkedReference = true));
	}

	linkedReferences.forEach(
		(lr) => (
			(lr.metaPage.linkedMentions = lr.metaPage.linkedMentions || []),
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			lr.metaPage.linkedMentions.push(<LinkedMention<{}, {}>>{
				/**
				 * WARNING - do NOT add `block.string` here,
				 * because if it's private (hidden),
				 * it's still not applied & you'll leak info,
				 * use the `blockRef` instead!
				 *
				 * we'll make this impossible to do accidently soon
				 * w/ explicit metadata & slight re-design.
				 *
				 */
				// TODO TS
				blockUid: block.uid,
				isBlockPublic,
				uidOfPageContainingBlock: rootParentPage.page.uid,
				originalTitleOfPageContainingBlock: rootParentPage.originalTitle,
				blockRef: block,
				pageContainingBlock: rootParentPage, // expect to be removed when JSON.stringify'd since circular

				/**
				 * TODO ENABLE, fix circular deps @ JSON.stringify:
				 *
				 * both-each-other-referencing blocks/pages create a circle
				 * & JSON.stringify errors.
				 *
				 */
				// block,
				// pageContainingBlock:
				// 	rootParentPage.page.uid === lr.metaPage.page.uid ? "[circular, self reference]" : rootParentPage,
			}),
			(rootParentPage.linkedReferencesFromChildren = rootParentPage.linkedReferencesFromChildren || []),
			rootParentPage.linkedReferencesFromChildren.push({
				blockUid: block.uid,
				blockRef: block,
				//
				uidOfReferencedPage: lr.metaPage.page.uid,
				originalTitleOfReferencedPage: lr.metaPage.originalTitle,
				referencedPageRef: lr.metaPage,
			})
		)
	);

	// Object.assign(block.metadata, { linkedReferences });

	return withMetadata({
		linkedReferences,
	})(block);

	// return {
	// 	...block,
	// 	metadata: {
	// 		...block.metadata,
	// 		linkedReferences,
	// 	},
	// };
};

function findMatchingLinkedReferences(
	blockStackTree: StackTree,
	allPagesWithMetadata: PageWithMetadata<{}, {}>[] // TODO TS
): LinkedRef[] {
	const linkedRefs: string[] = getLinkedReferences(blockStackTree)

	return allPagesWithMetadata
		.map((meta): LinkedRef | [] => {
			let current: string | undefined = linkedRefs.find(lr => lr === (meta.originalTitle))

			return !current
				? []
				: {
						metaPage: meta,
						text: current,
				}
		})
		.flat();
}

/**
 * TODO unique? or should keep it this way to resemble how many times linked ref was used?
 */
export const getLinkedReferences = (
	blockStackTree: StackTree //
): string[] => {

	return (blockStackTree
		// .filter(item => item.type === "linked-reference" && item.children.length)
		.map(item => item.type === "linked-reference"
			? (item.children.filter(c => c.type === "text").map(c => [c, item] as const) as unknown as ReadonlyTuple<StackTreeItem, StackTreeBoundaryItem>[])
				// .filter(([child, parent]) => parent.type === "linked-reference" && child.type === "text")
				.map(([child]) => child as StackTreeTextItem).map(ref => ref.text)
		: "children" in item ? getLinkedReferences(item.children) : [])
		).flat()
}
