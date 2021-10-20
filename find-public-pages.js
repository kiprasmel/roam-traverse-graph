#!/usr/bin/env node

// @ts-check

const fs = require("fs");
const path = require("path");

const { defaultPublicTag, defaultRecursive } = require("./defaults");
const { findPublicPages } = require("./findPublicPages");
const { readJsonSync } = require("./util");

/** @type string */
const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";

/** @type string */
const publicTag = process.argv?.[3] || defaultPublicTag;

/** @type boolean */
const recursive = !!(Number(process.argv?.[4] ?? 0) ?? defaultRecursive);

/**
 * @type { import("./types").Page[] }
 */
const allPages = readJsonSync(path.resolve(__dirname, pathToGraphFile));

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages, {
	publicTag,
	recursive,
});

fs.writeFileSync(
	path.resolve(__dirname, "../kiprasmel.json"), //
	JSON.stringify(
		publicPagesWrappedWithMetadata.map((p) => p.page),
		null,
		2
	),
	{
		encoding: "utf-8",
	}
);

console.log(
	publicPagesWrappedWithMetadata
		.filter((p) => p.hasAtLeastOnePublicBlockAnywhereInTheHierarchy)
		.map(({ isPublicTagInRootBlocks: isRoot, page, isFullyPublic }) => ({
			isRoot, //
			isFullyPublic,
			title: "title" in page ? page.title : undefined,
			string: "string" in page ? page.string : undefined,
			/** inside array to print `page: [ [Object] ]` instead of the whole */
			page: [page],
		})),
	publicPagesWrappedWithMetadata.length
);
