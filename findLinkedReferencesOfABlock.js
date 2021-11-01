// @ts-check

const { createLinkedReferences } = require("./util");

/**
 * @type { import("./types").FindLinkedReferences }
 */
const findIfPagesHavePublicLinkedReferences = ({
	allPagesWithMetadata, //
}) => (block) => {
	/**
	 * @type { import("./types").LinkedRef[] }
	 */
	const linkedReferences = findMatchingLinkedReferences(block.string, allPagesWithMetadata);

	if (block.metadata.isPublic || block.metadata.isPublicOnly) {
		/**
		 * mark the metaPage's that they have at least 1 linked ref.
		 * will be used to NOT hide their titles.
		 */
		linkedReferences.forEach((lr) => (lr.metaPage.hasAtLeastOnePublicLinkedReference = true));
	}

	// Object.assign(block.metadata, { linkedReferences });

	return {
		...block,
		metadata: {
			...block.metadata,
			linkedReferences,
		},
	};
};

/**
 * @param { string } blockString
 * @param { import("./types").PageWithMetadata[] } allPagesWithMetadata
 * @returns { import("./types").LinkedRef[] }
 */
function findMatchingLinkedReferences(blockString, allPagesWithMetadata) {
	/**
	 * @type { import("./types").LinkedRef[] }
	 */
	const linkedReferences = [];

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

module.exports = {
	findIfPagesHavePublicLinkedReferences,
};
