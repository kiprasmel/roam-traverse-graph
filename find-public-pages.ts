#!/usr/bin/env ts-node-dev

const path = require("path");

const { publicTags: defaultPublicTags, publicOnlyTags: defaultPublicOnlyTags } = require("./defaults");
const { findPublicPages } = require("./findPublicPages");
const { readJsonSync, writeJsonSync } = require("./util");

/** @type string */
const pathToGraphFile = process.argv?.[2] || "../notes/json/kipras-g1.json";

/** @type string[] */
const publicTags = process.argv?.[3]?.split?.(",") || defaultPublicTags;

/** @type string[] */
let publicOnlyTags = (process.argv?.[4] || "").split(",").filter((po) => !!po);
if (!publicOnlyTags.length) {
	publicOnlyTags = defaultPublicOnlyTags;
}

/**
 * @type { import("./types").Page[] }
 */
const allPages = readJsonSync(path.resolve(__dirname, pathToGraphFile));

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages, {
	publicTags,
	publicOnlyTags,
	keepMetadata: !process.env.CI, // TODO testing
	makeThePublicTagPagePublic: true, // TODO testing
});

// fs.writeFileSync(
// 	path.resolve(__dirname, "../kiprasmel.json"), //
// 	JSON.stringify(
// 		publicPagesWrappedWithMetadata.map((p) => p.page),
// 		null,
// 		2
// 	),
// 	{
// 		encoding: "utf-8",
// 	}
// );

writeJsonSync(
	"../graph.json",
	publicPagesWrappedWithMetadata.map((p) => p.page)
);
writeJsonSync("../graphraw.json", publicPagesWrappedWithMetadata);

console.log(
	publicPagesWrappedWithMetadata
		.filter((p) => p.hasAtLeastOnePublicBlockAnywhereInTheHierarchy)
		.map(({ isPublicTagInRootBlocks: isRoot, page, isFullyPublic }) => ({
			isRoot, //
			isFullyPublic,
			title: page.title,
			/** inside array to print `page: [ [Object] ]` instead of the whole */
			page: [page],
		}))
		.map((p) => p.title),
	{
		hasAtLeastOnePublicBlock: publicPagesWrappedWithMetadata.filter(
			(p) => p.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
		).length,
		hasAtLeastOneMentionOfAPublicLinkedRef: publicPagesWrappedWithMetadata.filter(
			(p) => p.hasAtLeastOneMentionOfAPublicLinkedReference
		).length,
		hasAtLeastOneLinkedRef: publicPagesWrappedWithMetadata.filter((p) => p.hasAtLeastOnePublicLinkedReference)
			.length,
		pages: publicPagesWrappedWithMetadata.length,
	}
);
