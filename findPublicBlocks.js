// @ts-check

/* eslint-disable indent */

const { createLinkedReferences } = require("./util");

/**
 * @type { import("./types").RemoveUnknownProperties }
 */
const removeUnknownProperties = (block) => ({
	string: block.string,
	uid: block.uid,
	heading: block.heading,
	"create-time": block["create-time"],
	"edit-time": block["edit-time"],
	"edit-email": block["edit-email"],
	"text-align": block["text-align"],
	...("refs" in block ? { refs: block.refs } : {}),
	...("children" in block ? { children: block.children } : {}),
});

/**
 * @type { import("./types").FindPublicBlocks }
 */
const markBlockPublic = ({
	// parentBlock,
	rootParentPage,
	allPagesWithMetadata,
	publicTag,
	isParentPublic,
	doNotHideTodoAndDone,
	hiddenStringValue,
}) => (block) => {
	/**
	 * @type { boolean }
	 *
	 * TODO we'll likely need separate variables for `isPageFullyPublic`
	 * and `isCurrenlBlockPublic` and `isCurrentBlockOrAnyParentsPublic`
	 *
	 * (and also minding the upwards tree, not necessarily straight from the root,
	 * because we might have a #private tag that would affect this)
	 *
	 */
	const hasPublicTag = block.string.includes(publicTag);

	/**
	 * @type { boolean }
	 */
	const isPublic = hasPublicTag || isParentPublic;

	if (isPublic) {
		/**
		 * TODO FIXME, very ugly work-around lmao
		 *
		 * tho, perhaps not so ugly; will see:
		 * - was (& still is & will be) needed for priority;
		 * - is needed for finding out which pages get mentioned in public pages
		 *   and thus hiding them has no point so...
		 */
		rootParentPage.hasAtLeastOnePublicBlockAnywhereInTheHierarchy = true;
	} else {
		/** @type { string } */
		let newString = `(${hiddenStringValue}) ${block.uid}`;

		if (doNotHideTodoAndDone) {
			if (block.string.includes("{{[[TODO]]}}")) {
				// currentBlock.string = `{{[[TODO]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
				newString = "{{[[TODO]]}}" + " " + newString;
			} else if (block.string.includes("{{[[DONE]]}}")) {
				// currentBlock.string = `{{[[DONE]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
				newString = "{{[[DONE]]}}" + " " + newString;
			} else {
				// currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
			}
		} else {
			// currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
		}

		/**
		 * @type { ({ metaPage: import("./types").PageWithMetadata, candidateLR: import("./types").LinkedReference }[]) }
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
				if (block.string.includes(candidateLR.fullStr)) {
					linkedReferences.push({ metaPage, candidateLR });
				}
			}
		}

		if (linkedReferences.length) {
			/** @type { string } */
			const linkedRefs = linkedReferences
				.filter((lr) => {
					if (doNotHideTodoAndDone) {
						return !["TODO", "DONE"].includes(lr.candidateLR.origStr);
					}
					return true;
				})
				.map((lr) => lr.candidateLR.create(lr.metaPage.page.title))
				.join(" ");

			newString += " " + linkedRefs;

			block.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));
		}

		// console.log({
		// 	block: currentBlock.string,
		// 	newBlock: newString,
		// 	// linkedReferences: linkedReferences.flatMap((lr) => [lr.originalTitle, lr.page.title]),
		// });

		block.string = newString;
	}

	return block;
};

module.exports = {
	removeUnknownProperties,
	markBlockPublic,
};
