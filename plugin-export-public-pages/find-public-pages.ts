#!/usr/bin/env ts-node-dev

import path from "path";

import { Page, PageWithMetadata, RO } from "../types";
import { readJsonSync, writeJsonSync } from "../util";

import { findPublicPages, getDefaultSettingsForPluginFindPublicPages } from "./findPublicPages";

const pathToGraphFile: string = process.argv?.[2] || "../notes/json/kipras-g1.json";

const publicTags: string[] = process.argv?.[3]?.split?.(",") || getDefaultSettingsForPluginFindPublicPages().publicTags;

let publicOnlyTags: string[] = (process.argv?.[4] || "").split(",").filter((po) => !!po);
if (!publicOnlyTags.length) {
	publicOnlyTags = getDefaultSettingsForPluginFindPublicPages().publicOnlyTags;
}

const allPages: Page<RO, RO>[] = readJsonSync(path.resolve(__dirname, "..", pathToGraphFile));

const publicPagesWrappedWithMetadata: PageWithMetadata<RO, RO>[] = findPublicPages(allPages, {
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
