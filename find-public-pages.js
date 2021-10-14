#!/usr/bin/env node

// @ts-check

/** @type string */
const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";

/** @type string */
const publicTag = process.argv?.[3] || "#public";

/** @type boolean */
const enableRecursiveSearch = Boolean(Number(process.argv?.[4] ?? 0) ?? 0);

console.log({
	pathToGraphFile, //
	publicTag,
	enableRecursiveSearch,
});

/**
 * @type { import("./types").Page[] }
 */
const allPages = require(pathToGraphFile);

/**
 * @type { import("./types").FindPublicPages }
 */
const findPublicPages = (somePages, isRoot = true) =>
	somePages
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

			return {
				page,
				hasPublicTag: !!findPublicPages(page.children, false).length,
				isPublicTagInRootBlocks: false,
			};
		})
		.filter((x) => x.hasPublicTag);

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages);

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
