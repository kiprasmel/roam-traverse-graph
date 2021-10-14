// @ts-check

/**
 * @type { import("./types").FindPublicPages }
 */
const findPublicPages = (
	somePages = [], //
	{
		publicTag = "#public", //
		recursive = false,
		isRoot = true,
		...rest
	} = {}
) => {
	if (isRoot) {
		console.log({
			publicTag, //
			recursive,
			isRoot,
			...rest,
		});
	}

	return somePages
		.filter((page) => !!page.children?.length)
		.map((page) => {
			const hasPublicTagOnRootLevelParagraphs = !!page.children.filter((c) => c.string.includes(publicTag))
				.length;

			if (!recursive) {
				return {
					page, //
					hasPublicTag: hasPublicTagOnRootLevelParagraphs,
					isPublicTagInRootBlocks: isRoot,
				};
			}

			if (hasPublicTagOnRootLevelParagraphs) {
				return {
					page, //
					hasPublicTag: true,
					isPublicTagInRootBlocks: isRoot,
				};
			}

			/** @type boolean */
			const doChildrenHavePublicTag = !!findPublicPages(page.children, {
				publicTag, //
				recursive,
				isRoot: false,
				...rest,
			}).length;

			return {
				page,
				hasPublicTag: doChildrenHavePublicTag,
				isPublicTagInRootBlocks: false,
			};
		})
		.filter((x) => x.hasPublicTag);
};

module.exports = {
	findPublicPages,
};
