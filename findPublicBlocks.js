// @ts-check

/* eslint-disable indent */

const { createLinkedReferences } = require("./util");

/**
 * @param { import("./types").Block } currentBlock
 * @param { import("./types").Block | null } parentBlock should be `null` when passing in initially from the `rootParentPage`
 * @param { import("./types").PageWithMetadata  } rootParentPage
 * @param { import("./types").PageWithMetadata[] } allPagesWithMetadata
 * @param { string } publicTag
 * @param { boolean } haveParentsBeenMarkedAsPublic
 * @param { boolean } doNotHideTodoAndDone
 * @param { string } hiddenStringValue
 *
 * @returns { import("./types").Block } // TODO `BlockWithMetadata[]`
 *
 */
function findPublicBlocks(
	currentBlock,
	parentBlock,
	rootParentPage,
	allPagesWithMetadata,
	publicTag,
	haveParentsBeenMarkedAsPublic,
	doNotHideTodoAndDone,
	hiddenStringValue
) {
	const isSelfEmpty = !currentBlock.string || !currentBlock.string.trim();
	const hasNoChildren = !currentBlock.children || !currentBlock.children.length;

	if (isSelfEmpty && hasNoChildren) {
		// nothing to do here.
		// TODO investigate what happens w/ linkedReferences when block is empty and not exited early here.
		return currentBlock;
	}

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

	/** @type { boolean } */
	const isMarketAsPublic = haveParentsBeenMarkedAsPublic || currentBlock.string.includes(publicTag);

	if (isMarketAsPublic) {
		/**
		 * TODO FIXME, very ugly work-around lmao
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
		 * TODO optimize lmao
		 *
		 * pagesWithLinkedReferences
		 *
		 * @type { ({ metaPage: import("./types").PageWithMetadata, candidateLR: import("./types").LinkedReference }[]) }
		 */
		const linkedReferences = [];

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

		// const linkedReferences = allPagesWithMetadata
		// 	.map(
		// 		(metaPage) =>
		// 			!metaPage.originalTitle
		// 				? false /* TODO should never happen */
		// 				: createLinkedReferences(metaPage.originalTitle)
		// 						.map((candidateLR) =>
		// 							currentBlock.string.includes(candidateLR.fullStr)
		// 								? { metaPega: metaPage, candidateLR }
		// 								: false
		// 						)
		// 						.filter((lr) => !!lr)
		// 						.flat() // should only be 1 regardless
		// 	)
		// 	.filter((lr) => !!lr)
		// 	.flat();

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

	if (currentBlock.children) {
		currentBlock.children = currentBlock.children.map((c) =>
			findPublicBlocks(
				c, //
				currentBlock,
				rootParentPage,
				allPagesWithMetadata,
				publicTag,
				isMarketAsPublic,
				doNotHideTodoAndDone,
				hiddenStringValue
			)
		);
	}

	return currentBlock;

	// const childHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(currentBlock);

	// if (currentBlock.string.includes(publicTag)) {
	// 	/** boom, do not hide the string or any strings of it's children */

	// 	return {
	// 		page: currentBlock,
	// 		hasPublicTag: true,
	// 		isFullyPublic: false,
	// 		isPublicTagInRootBlocks: false,
	// 		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
	// 		matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
	// 		hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, //  childHasAtLeastOneLinkedReference, // TODO CHILDREN. EDIT NVM NO TODO, NO CHILDREN, ALL GOOD
	// 	};
	// } else {
	// 	/**
	// 	 *
	// 	 *
	// 	 * !!! hide the string !!!
	// 	 *
	// 	 *
	// 	 *
	// 	 * TODO find all hashtags, bi-directional references etc.
	// 	 * and prepare them for either staying public,
	// 	 * or replacement w/ hidden values
	// 	 *
	// 	 * (will need another round of parsing to figure out
	// 	 * since we need to go through all pages 1st)
	// 	 *
	// 	 */

	// 	if (currentBlock.string === "") {
	// 		// do nothing
	// 	} else if (doNotHideTodoAndDone) {
	// 		if (currentBlock.string.includes("{{[[TODO]]}}")) {
	// 			currentBlock.string = `{{[[TODO]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
	// 		} else if (currentBlock.string.includes("{{[[DONE]]}}")) {
	// 			currentBlock.string = `{{[[DONE]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
	// 		} else {
	// 			currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
	// 		}
	// 	} else {
	// 		currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
	// 	}

	// 	/**
	// 	 * search if any children are public and can be not hidden,
	// 	 * and apply the same hiding mechanism for them too:
	// 	 */
	// 	const ret = findPublicBlocks(currentBlock.children, {
	// 		...rest,
	// 		publicTag,
	// 		hiddenStringValue,
	// 		makeThePublicTagPagePublic,
	// 	});

	// 	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// 	// @ts-ignore
	// 	currentBlock.children = ret.map((r) => r.page);

	// 	return {
	// 		page: currentBlock,
	// 		hasPublicTag: false,
	// 		isFullyPublic: false,
	// 		isPublicTagInRootBlocks: false,
	// 		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: !!ret.filter(
	// 			(cc) => cc.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
	// 		).length,
	// 		matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
	// 		hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, // childHasAtLeastOneLinkedReference
	// 		// EXPLICITLY DISABLED - CHECK ONLY URSELF
	// 		// || !!ret.find((cc) =>
	// 		//		cc.hasAtLeastOneLinkedReference
	// 		//		cc)
	// 	};
	// }
}

module.exports = {
	findPublicBlocks,
};