#!/usr/bin/env node

const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";
const publicTag = process.argv?.[3] || "#public";
const enableRecursiveSearch = Boolean(Number(process.argv?.[4] ?? 0) ?? 0);

console.log({
	pathToGraphFile, //
	publicTag,
	enableRecursiveSearch,
});

const allPages = require(pathToGraphFile);

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
					isRoot,
				};
			}

			if (hasPublicTagOnRootLevelParagraphs) {
				return {
					page, //
					hasPublicTag: true,
					isRoot,
				};
			}

			return {
				page,
				hasPublicTag: !!findPublicPages(page.children, false).length,
				isRoot: false,
			};
		})
		.filter((x) => x.hasPublicTag);

const publicPagesWrappedWithMetadata = findPublicPages(allPages);

console.log(
	publicPagesWrappedWithMetadata.length,
	publicPagesWrappedWithMetadata.map(({ isRoot, page }) => ({
		isRoot, //
		title: page.title,
		page: [page],
	}))
);
