#!/usr/bin/env node

// @ts-check

const path = require("path");

const { publicTags: defaultPublicTag, publicOnlyTags: defaultPublicOnlyTags } = require("./defaults");
const { findPublicPages } = require("./findPublicPages");
const { readJsonSync, writeJsonSync } = require("./util");

/** @type string */
const pathToGraphFile = process.argv?.[2] || "../notes/json/kipras-g1.json";

/** @type string[] */
const publicTags = process.argv?.[3]?.split?.(",") || defaultPublicTag;

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
	keepMetadata: true,
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
		})),
	publicPagesWrappedWithMetadata.length
);
