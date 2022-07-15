/* eslint-disable indent */

import { ASS, AST } from "./blockStringToAST";
import { getLinkedReferences } from "./getLinkedReferencesFromAST";

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedMention, LinkedRef, PageWithMetadata } from "../types";
import { withMetadata } from "../util/withMetadata";

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
		ASS: ASS;
		AST: AST;
	}
> = ({
	allPagesWithMetadata, //
	rootParentPage,
}) => (block) => {
	// console.log({allPagesWithMetadata: allPagesWithMetadata.map(meta => meta.originalTitle)});
	const linkedReferences: LinkedRef[] = findMatchingLinkedReferences(block.metadata.AST, allPagesWithMetadata);
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
	AST: AST,
	allPagesWithMetadata: PageWithMetadata<{}, {}>[] // TODO TS
): LinkedRef[] {
	const linkedRefs: string[] = getLinkedReferences(AST);

	return allPagesWithMetadata
		.map((meta): LinkedRef | [] => {
			let current: string | undefined = linkedRefs.find((lr) => lr === meta.originalTitle);

			return !current
				? []
				: {
						metaPage: meta,
						text: current,
				  };
		})
		.flat();
}
