/* eslint-disable indent */

import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedMention, LinkedRef, PageWithMetadata } from "../types";
import { withMetadata } from "../util/withMetadata";

import { createLinkedReferences } from "../util";

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
	}
> = ({
	allPagesWithMetadata, //
	rootParentPage,
}) => (block) => {
	const linkedReferences: LinkedRef[] = block.metadata.hasCodeBlock
		? []
		: findMatchingLinkedReferences(block.string, allPagesWithMetadata);

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

/**
 * #parent
 * #pa
 * #rent
 *
 * #parent -> #parent, not #pa, not #rent, not combination of multiple
 *
 * ---
 *
 * racecar::
 * race::
 * car::
 *
 * racecar:: -> racecar::, not race::, not car::, not combination of multiple
 *
 * ---
 *
 * impl:
 * 1. sort all candidates by length (longest to shortest)
 * 2. go 1 by 1 from longest to shortest
 * 2.1 check if the block string includes the candidate
 * 2.2 (!) check if the candidate is not already included in the end result (as a substring)
 * 2.3 add candidate to end result
 *
 */

function findMatchingLinkedReferences(
	blockString: string,
	allPagesWithMetadata: PageWithMetadata<{}, {}>[] // TODO TS
): LinkedRef[] {
	return (
		allPagesWithMetadata
			/** begin collection (could be done once for all blocks, except the filter part) */
			.map((metaPage) =>
				createLinkedReferences(metaPage.originalTitle)
					.filter((candidate) => blockString.includes(candidate.fullStr))
					.map((candidateLR) => ({ metaPage, candidateLR }))
			)
			.flat()
			.sort((a, b) => b.candidateLR.origStr.length - a.candidateLR.origStr.length)
			/** end collection */
			.reduce(
				(acc, candidate) => (
					!(
						acc.alreadyTakenLinkedRefs.includes(candidate.candidateLR.fullStr) ||
						acc.alreadyTakenLinkedRefs.some((linkedRef) =>
							/* partial match */ linkedRef.includes(candidate.candidateLR.fullStr)
						)
					) &&
						(acc.uniqueLinkedReferences.push(candidate),
						acc.alreadyTakenLinkedRefs.push(candidate.candidateLR.fullStr)),
					acc
				),
				{ uniqueLinkedReferences: [] as LinkedRef[], alreadyTakenLinkedRefs: [] as string[] }
			).uniqueLinkedReferences
	);
}
