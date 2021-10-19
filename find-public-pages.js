#!/usr/bin/env node

// @ts-check

const { defaultPublicTag, defaultRecursive } = require("./defaults");
const { findPublicPages } = require("./findPublicPages");

/** @type string */
const pathToGraphFile = process.argv?.[2] || "./json/kipras-g1.json";

/** @type string */
const publicTag = process.argv?.[3] || defaultPublicTag;

/** @type boolean */
const recursive = !!(Number(process.argv?.[4] ?? 0) ?? defaultRecursive);

/**
 * @type { import("./types").Page[] }
 */
const allPages = require(pathToGraphFile);

/**
 * @type { import("./types").PageWithMetadata[] }
 */
const publicPagesWrappedWithMetadata = findPublicPages(allPages, {
	publicTag,
	recursive,
});

console.log(
	publicPagesWrappedWithMetadata.map(({ isPublicTagInRootBlocks: isRoot, page, isFullyPublic }) => ({
		isRoot, //
		isFullyPublic,
		title: "title" in page ? page.title : undefined,
		string: "string" in page ? page.string : undefined,
		/** inside array to print `page: [ [Object] ]` instead of the whole */
		page: [page],
	})),
	publicPagesWrappedWithMetadata.length
);
