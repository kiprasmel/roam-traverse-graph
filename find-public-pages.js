#!/usr/bin/env node

// @ts-check

const path = require("path");

const { defaultPublicTag } = require("./defaults");
const { findPublicPages } = require("./findPublicPages");
const { readJsonSync, writeJsonSync } = require("./util");

/** @type string */
const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";

/** @type string */
const publicTag = process.argv?.[3] || defaultPublicTag;

/**
 * @type { import("./types").Page[] }
 */
const allPages = readJsonSync(path.resolve(__dirname, pathToGraphFile));

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages, {
	publicTag,
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
	"../kiprasmel.json",
	publicPagesWrappedWithMetadata.map((p) => p.page)
);
writeJsonSync("../kiprasmelraw.json", publicPagesWrappedWithMetadata);

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
