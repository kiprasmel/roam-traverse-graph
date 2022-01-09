import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedMention, LinkedRef, PageWithMetadata } from "../types";
import { withMetadata } from "../util/withMetadata";
import { StackTreeItem, StackTree } from "./parseASTFromBlockString";

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
		stackTree: StackTreeItem[];
	}
> = ({
	allPagesWithMetadata, //
	rootParentPage,
}) => (block) => {
	const linkedReferences: LinkedRef[] = block.metadata.hasCodeBlock
		? []
		: findMatchingLinkedReferences(block.metadata.stackTree, allPagesWithMetadata);

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
	const linkedReferences: LinkedRef[] = [];

	/**
	 * TODO - there's potential for optimization,
	 * but perhaps w/ a cost of some loss of clarity
	 * and it isn't an issue at all atm
	 * so maybe sometime in the future, if even.
	 */
	for (const metaPage of allPagesWithMetadata) {
		if (!metaPage.originalTitle) {
			/* TODO should never happen */
			continue;
		}

		blockStackTree.forEach(
			(item) =>
				item.type === "linked-reference" &&
				item.children
					.filter((child) => child.type === "text" && child.content === metaPage.originalTitle)
					.map((child) => linkedReferences.push({ metaPage, linkedRefNode: item, linkedRefTextNode: child }))
		);
	}

	return linkedReferences;
}

/**
 * TODO jscodeshift-like .find'ing w/ stack & needle
 */
export const hasLinkedReference = (blockStackTree: StackTree) => (wantedLinkedRef: string): boolean =>
	blockStackTree.some(
		(item) =>
			item.type === "linked-reference" &&
			/**
			 * TODO - this is quite fragile lmao
			 */
			item.children.length === 1 &&
			item.children[0].type === "text" &&
			item.children[0].content === wantedLinkedRef
	);
