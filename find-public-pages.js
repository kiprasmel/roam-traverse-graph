#!/usr/bin/env node

// @ts-check

/**
 * @type { import("./types").FindPublicPages }
 */
const findPublicPages = (
	somePages = [], //
	{
		// pathToGraphJsonFile, //
		publicTag = "#public",
		enableRecursiveSearch = false,
		isRoot = true,
		...rest
	} = {}
) => {
	if (isRoot) {
		console.log({
			// pathToGraphFile, //
			publicTag, //
			enableRecursiveSearch,
		});
	}

	return somePages
		.filter((page) => !!page.children?.length)
		.map((page) => {
			const hasPublicTagOnRootLevelParagraphs = !!page.children.filter((c) => c.string.includes(publicTag))
				.length;

			if (!enableRecursiveSearch) {
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
				enableRecursiveSearch,
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

/** @type string */
const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";

/** @type string */
const publicTag = process.argv?.[3] || "#public";

/** @type boolean */
const enableRecursiveSearch = !!(Number(process.argv?.[4] ?? 0) ?? 0);

/**
 * @type { import("./types").Page[] }
 */
const allPages = require(pathToGraphFile);

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages, {
	publicTag,
	enableRecursiveSearch,
});

console.log(
	publicPagesWrappedWithMetadata.map(({ isPublicTagInRootBlocks: isRoot, page }) => ({
		isRoot, //
		title: "title" in page ? page.title : undefined,
		string: "string" in page ? page.string : undefined,
		/** inside array to print `page: [ [Object] ]` instead of the whole */
		page: [page],
	})),
	publicPagesWrappedWithMetadata.length
);
