/* eslint-disable indent */

/**
 * @type { import("./types").RemoveUnknownProperties }
 */
const removeUnknownProperties = () => (block) =>
	!block
		? block
		: {
				string: block.string,
				uid: block.uid,
				heading: block.heading,
				"create-time": block["create-time"],
				"edit-time": block["edit-time"],
				"edit-email": block["edit-email"],
				"text-align": block["text-align"],
				...("refs" in block ? { refs: block.refs } : {}),
				...("children" in block ? { children: block.children } : {}),
				metadata: block.metadata || {},
		  };

/**
 * @type { import("./types").FindPublicBlocks }
 */
const markBlockPublic = (
	{
		// parentBlock,
		rootParentPage,
		publicTags,
		publicOnlyTags,
		privateTag,
	},
	parentBlock
) => (block) => {
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
	const hasPublicTag =
		!block.metadata.hasCodeBlock && publicTags.some((publicTag) => block.string.includes(publicTag));

	const hasPublicOnlyTag =
		!block.metadata.hasCodeBlock && publicOnlyTags.some((publicOnlyTag) => block.string.includes(publicOnlyTag));

	const hasPrivateTag = !block.metadata.hasCodeBlock && block.string.includes(privateTag);

	/**
	 * ---
	 */

	const isPublicOnly = hasPublicOnlyTag && !hasPrivateTag && !parentBlock?.metadata.hasPrivateTag;

	/**
	 * @type { boolean }
	 */
	const isPublic = !!(
		(rootParentPage.isFullyPublic || //
			hasPublicTag ||
			parentBlock?.metadata.isPublic) &&
		!hasPrivateTag &&
		!isPublicOnly
	);

	block.metadata.isPublicOnly = isPublicOnly;
	block.metadata.isPublic = isPublic;
	block.metadata.hasPublicTag = hasPublicTag;
	block.metadata.hasPrivateTag = hasPrivateTag;

	if (isPublic || hasPublicOnlyTag) {
		/**
		 * TODO FIXME, very ugly work-around lmao
		 *
		 * tho, perhaps not so ugly; will see:
		 * - was (& still is & will be) needed for priority;
		 * - is needed for finding out which pages get mentioned in public pages
		 *   and thus hiding them has no point so...
		 */
		rootParentPage.hasAtLeastOnePublicBlockAnywhereInTheHierarchy = true;
	}

	return block;
};

module.exports = {
	removeUnknownProperties,
	markBlockPublic,
};
