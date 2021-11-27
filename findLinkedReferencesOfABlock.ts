import { MutatingActionToExecute } from "./traverseBlockRecursively";
import { LinkedRef, PageWithMetadata } from "./types";
import { withMetadata } from "./util/withMetadata";

const { createLinkedReferences } = require("./util");

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
			((lr.metaPage as any).linkedMentions = (lr.metaPage as any).linkedMentions || []), // TODO TS
			// TODO TS
			(lr.metaPage as any).linkedMentions.push({
				blockUid: block.uid,
				isBlockPublic,
				blockString: block.string,
				uidOfPageContainingBlock: rootParentPage.page.uid,
				originalTitleOfPageContainingBlock: rootParentPage.originalTitle,
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
	blockString: string,
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

		for (const candidateLR of createLinkedReferences(metaPage.originalTitle)) {
			if (blockString.includes(candidateLR.fullStr)) {
				linkedReferences.push({ metaPage, candidateLR });
			}
		}
	}

	return linkedReferences;
}
