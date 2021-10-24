// @ts-check

/* eslint-disable indent */

const { createLinkedReferences } = require("./util");

/**
 *
 * @type { import("./types").TraverseBlock }
 *
 */
function traverseBlock(
	// {
	// 	currentBlock,
	// 	parentBlock,
	// 	rootParentPage,
	// 	allPagesWithMetadata,
	// 	publicTag,
	// 	/** TODO */
	// 	// isRootPagePublic, // also consider "hasRootTagDirectlyInRootPage" or similar to convey the meaning properly
	// 	// areAnyParentsPublicUpUntilInterruptionOrRoot,
	// 	isParentPublic, // will be true if the parent is public, or parent's parent is public, repeat.
	// 	// upd: we do NOT need the `isParentPrivate` tag, the `isParentPublic` tag handles it fully.
	// 	// isParentPrivate, // will be true iff a parent has explicitly been marked with the #private (or equiv. configured) tag. does NOT apply to pages (edit: nvm).
	// 	doNotHideTodoAndDone,
	// 	hiddenStringValue,
	// },
	props,
	mutatingActionToExecute
) {
	const isSelfEmpty = !props.currentBlock.string || !props.currentBlock.string.trim();
	const hasNoChildren = !props.currentBlock.children || !props.currentBlock.children.length;

	if (isSelfEmpty && hasNoChildren) {
		// nothing to do here.
		// TODO investigate what happens w/ linkedReferences when block is empty and not exited early here.
		return props.currentBlock;
	}

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
	const hasPublicTag = props.currentBlock.string.includes(props.publicTag);
	const isPublic = hasPublicTag || props.isParentPublic;

	mutatingActionToExecute({
		hasPublicTag,
		isPublic,
	});

	if (props.currentBlock.children) {
		props.currentBlock.children = props.currentBlock.children.map((c) =>
			traverseBlock(
				{
					...props,
					currentBlock: c, //
					// parentBlock: props.currentBlock,
				},
				mutatingActionToExecute
			)
		);
	}

	return props.currentBlock;
}

/**
 * @type { import("./types").FindPublicBlocks }
 */
function findPublicBlocks({
	currentBlock, //
	// parentBlock,
	rootParentPage,
	allPagesWithMetadata,
	publicTag,
	isParentPublic,
	doNotHideTodoAndDone,
	hiddenStringValue,
}) {
	return traverseBlock(
		{
			currentBlock,
			isParentPublic,
			publicTag,
		},
		({ isPublic }) => {
			/**
			 * remove unknown properties from the `c` to avoid exposing them
			 * in case something changes upstream.
			 *
			 * @type { import("./types").Block }
			 */
			// TODO no re-assign? same w/ pages
			// eslint-disable-next-line no-param-reassign
			currentBlock = {
				string: currentBlock.string,
				uid: currentBlock.uid,
				heading: currentBlock.heading,
				"create-time": currentBlock["create-time"],
				"edit-time": currentBlock["edit-time"],
				"edit-email": currentBlock["edit-email"],
				"text-align": currentBlock["text-align"],
				...("refs" in currentBlock ? { refs: currentBlock.refs } : {}),
				...("children" in currentBlock ? { children: currentBlock.children } : {}),
			};

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
				let newString = `(${hiddenStringValue}) ${currentBlock.uid}`;

				if (doNotHideTodoAndDone) {
					if (currentBlock.string.includes("{{[[TODO]]}}")) {
						// currentBlock.string = `{{[[TODO]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
						newString = "{{[[TODO]]}}" + " " + newString;
					} else if (currentBlock.string.includes("{{[[DONE]]}}")) {
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
						if (currentBlock.string.includes(candidateLR.fullStr)) {
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

					currentBlock.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));
				}

				// console.log({
				// 	block: currentBlock.string,
				// 	newBlock: newString,
				// 	// linkedReferences: linkedReferences.flatMap((lr) => [lr.originalTitle, lr.page.title]),
				// });

				currentBlock.string = newString;
			}
		}
	);
}

module.exports = {
	findPublicBlocks,
};
