// @ts-check

/**
 * @param { import("./types").Block } currentBlock
 * @param { import("./types").Block | null } parentBlock should be `null` when passing in initially from the `rootParentPage`
 * @param { import("./types").PageWithMetadata  } rootParentPage
 * @param { import("./types").PageWithMetadata[] } allPagesWithMetadata
 * @param { string } publicTag
 * @param { boolean } isMarkedAsPublic
 * @returns { import("./types").Block[] } // TODO `BlockWithMetadata[]`
 * 
 */
function findPublicBlocks(currentBlock, parentBlock, rootParentPage, allPagesWithMetadata, publicTag, isMarkedAsPublic) {
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
		...("refs" in currentBlock ? {refs: currentBlock.refs} : {}),
		...("children" in currentBlock ? {children: currentBlock.children} : {}),
	};

	// const matchedLinkedReferencesForChild = findLinkedReferencesForPage(c);

	const childHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(currentBlock);
	/** @type { boolean } */
	// //const childHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(c);
	// const childHasAtLeastOneLinkedReference = !!matchedLinkedReferencesForChild.length;

	if (currentBlock.string.includes(publicTag)) {
		/** boom, do not hide the string or any strings of it's children */

		return {
			page: currentBlock,
			hasPublicTag: true,
			isFullyPublic: false,
			isPublicTagInRootBlocks: false,
			hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
			matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
			hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, //  childHasAtLeastOneLinkedReference, // TODO CHILDREN. EDIT NVM NO TODO, NO CHILDREN, ALL GOOD
		};
	} else {
		/**
		 *
		 *
		 * !!! hide the string !!!
		 *
		 *
		 *
		 * TODO find all hashtags, bi-directional references etc.
		 * and prepare them for either staying public,
		 * or replacement w/ hidden values
		 *
		 * (will need another round of parsing to figure out
		 * since we need to go through all pages 1st)
		 *
		 */

		if (currentBlock.string === "") {
			// do nothing
		} else if (doNotHideTodoAndDone) {
			if (currentBlock.string.includes("{{[[TODO]]}}")) {
				currentBlock.string = `{{[[TODO]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
			} else if (currentBlock.string.includes("{{[[DONE]]}}")) {
				currentBlock.string = `{{[[DONE]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
			} else {
				currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
			}
		} else {
			currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
		}

		/**
		 * search if any children are public and can be not hidden,
		 * and apply the same hiding mechanism for them too:
		 */
		const ret = findPublicBlocks(currentBlock.children, {
			...rest,
			publicTag,
			hiddenStringValue,
			makeThePublicTagPagePublic,
		});

		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore
		currentBlock.children = ret.map((r) => r.page);

		return {
			page: currentBlock,
			hasPublicTag: false,
			isFullyPublic: false,
			isPublicTagInRootBlocks: false,
			hasAtLeastOnePublicBlockAnywhereInTheHierarchy: !!ret.filter(
				(cc) => cc.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
			).length,
			matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
			hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, // childHasAtLeastOneLinkedReference
			// EXPLICITLY DISABLED - CHECK ONLY URSELF
			// || !!ret.find((cc) =>
			//		cc.hasAtLeastOneLinkedReference
			//		cc)
		};
	}

	// TODO CONTINUE HERE

	// @ts-ignore
	page.children = potentiallyPublicChildren.map((c) => c.page);

	const hasAtLeastOnePublicBlockAnywhereInTheHierarchy = !!potentiallyPublicChildren.filter(
		(p) => p.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
	).length;

	/**
	 *
	 * UPDATE: if page is not in `fullyPublicPages`,
	 * it should _always_ be hidden,
	 * just like the children.
	 *
	 */
	// if (!hasAtLeastOnePublicBlockAnywhereInTheHierarchy) {
	if (true) {
		/**
		 * hide the string, same as with the children.
		 */
		if ("title" in page) {
			page.title = `(${hiddenStringValue}) ${page.uid}`;
		}
		if ("string" in page) {
			page.string = `(${hiddenStringValue}) ${page.uid}`;
		}

		if ("title" in page && "string" in page) {
			console.warn("both title and string found in page", page.uid, page.title);
		}
	} else {
		/**
		 * YAY! page will be partly public.
		 *
		 * do __not__ hide the page title,
		 * and the children will be kept partly hidden partly visible,
		 * depending if they (or their parents) had the public attribute.
		 *
		 */
		// nothing extra needs to be done here
	}

	return {
		/**
		 * TODO VERIFY ALL CORRECT
		 */
		page: page, //
		isFullyPublic: false,
		hasPublicTag: false,
		isPublicTagInRootBlocks: false,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy,
		matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForPage,
		hasAtLeastOneLinkedReference: pageHasAtLeastOneLinkedReference,
	};

	// const hasPublicTagOnRootLevelParagraphs = !!page.children.filter((c) => c.string.includes(publicTag))
	// 	.length;

	// if (!recursive) {
	// 	return {
	// 		page, //
	// 		hasPublicTag: hasPublicTagOnRootLevelParagraphs,
	// 		isPublicTagInRootBlocks: isRoot,
	// 	};
	// }

	// if (hasPublicTagOnRootLevelParagraphs) {
	// 	return {
	// 		page, //
	// 		hasPublicTag: true,
	// 		isPublicTagInRootBlocks: isRoot,
	// 	};
	// }

	// /** @type boolean */
	// const doChildrenHavePublicTag = !!findPublicPages(page.children, {
	// 	...rest,
	// 	publicTag, //
	// 	recursive,
	// 	isRoot: false,
	// }).length;

	// return {
	// 	page,
	// 	hasPublicTag: doChildrenHavePublicTag,
	// 	isPublicTagInRootBlocks: false,
	// };
	// .filter((x) => x.hasChildren !== false)
	// .filter((x) => x.hasPublicTag);
}

module.exports = {
	findPublicBlocks,
};
