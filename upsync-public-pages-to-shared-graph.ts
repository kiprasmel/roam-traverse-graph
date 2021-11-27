#!/usr/bin/env ts-node-dev

import path from "path";

import RoamPrivateApi from "./roam-research-private-api";

import { defaultSettingsForPluginFindPublicPages } from "./defaults";
import secrets from "./secrets.json";

import { findPublicPages } from "./findPublicPages";
import { readJsonSync, startTimerMs /* getAllBlocksFromPages, poolPromises */, writeJsonSync } from "./util";

// fs.writeFileSync("public-pages.json", JSON.stringify(publicPages, null, 2), { encoding: "utf-8" });

console.log({ PATH_TO_ROAM_GRAPH: process.env.PATH_TO_ROAM_GRAPH });

let publicOnlyTags = (process.env.ROAM_PUBLIC_ONLY_TAGS || "").split(",").filter((po) => !!po);
if (!publicOnlyTags.length) {
	publicOnlyTags = defaultSettingsForPluginFindPublicPages.publicOnlyTags;
}

let publicPagesRaw = findPublicPages(
	readJsonSync(
		path.resolve(
			__dirname, //
			process.env.PATH_TO_ROAM_GRAPH || "../notes/json/kipras-g1.json"
		)
	),
	{
		publicTags: (
			process.env.ROAM_PUBLIC_TAGS || defaultSettingsForPluginFindPublicPages.publicTags.join(",")
		) /* TODO FIXME careful w/ this join lol */
			.split(","), // custom for testing
		privateTag: process.env.ROAM_PRIVATE_TAG || defaultSettingsForPluginFindPublicPages.privateTag,
		publicOnlyTags,
	}
).filter(
	(raw) =>
		![
			"PmdJYvQ1i" /* anon */, //
			"10-23-2021" /** TODO UPDATE TO CURRENT DAY */,
		].includes(raw.page.uid)
);

writeJsonSync("../graphraw.to-be-uploaded.json", publicPagesRaw);

const origRawLen = publicPagesRaw.length;

let publicPages = publicPagesRaw.map((p) => p.page); // TODO FIXME

/**
 * TODO implement helpful measures to avoid deleting pages
 * if the user specifies the wrong graph.
 *
 * e.g. have a #custom-touched-by-roam-safe-public-updates tag,
 * and check if it's already there.
 *
 * if it is:
 *   all good, continue
 *
 * if not:
 *   do we have any pages that have the `publicTag`, even recursively?
 *     if yes: VERY BAD !!! we're in the wrong graph -- ABORT & report to user
 *     if no: all good, continue
 *
 */
const publicGraphToImportInto = process.env.PUBLIC_GRAPH_TO_IMPORT_TO || "kiprasmel";

const api = new RoamPrivateApi(publicGraphToImportInto, secrets.email, secrets.password, {
	headless: !!process.env.ROAM_BROWSER_HEADLESS || false,
	// @ts-expect-error
	folder: ".",
	// folder: "/tmp/",
});

const getDeltaSec = startTimerMs({ divider: 1000 });

// const allBlocks = getAllBlocksFromPages(publicPages); // .splice(0, 500); // TODO FIXME REMVOE

// // console.log(
// // 	"allBlocks",
// // 	allBlocks,
// // 	allBlocks.filter((b) => typeof b !== "string")
// // );

// const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);
// const maxRequestsPerInterval = 300 - 5;

// TODO FIXME TEMP
const publicPagesHighPrio = publicPagesRaw
	.filter((raw) => {
		if (!raw) return false;
		return !!raw.isFullyPublic || !!raw.hasAtLeastOnePublicBlockAnywhereInTheHierarchy;
	})
	.map((raw) => raw.page);

publicPagesRaw = publicPagesRaw.filter((pps) => !publicPagesHighPrio.map((pp) => pp.uid).includes(pps.page.uid));

const secondHighPrio = publicPagesRaw.filter((p) => p.hasAtLeastOneMentionOfAPublicLinkedReference).map((p) => p.page);

publicPagesRaw = publicPagesRaw.filter((pps) => !secondHighPrio.map((pp) => pp.uid).includes(pps.page.uid));

publicPages = publicPagesRaw
	.filter((pps) => !secondHighPrio.map((pp) => pp.uid).includes(pps.page.uid))
	.map((p) => p.page);

const len1 = publicPagesHighPrio.length,
	len2 = secondHighPrio.length,
	len3 = publicPages.length,
	sum = len1 + len2 + len3;

console.log({
	publicPagesHighPrio: len1, //
	pagesWithAtLeast1MentionOfLinkedRefExclPrev: len2,
	remainingPages: len3,
	sum,
	origRawLen,
	sumEqOrigRawLen: sum === origRawLen /** should be true */,
});

Promise.resolve()
	// DISABLED, DO NOT USE (NO NEED)
	.then(() => api.logIn()) // bad, need more time pause lol
	.then(() => console.log("logged in"))
	.then(() => api.gotoAllPages())
	.then(() => console.log("went to page"))
	.then(() => api.restoreGraphFromEDNByDefaultToEmpty())
	.then(() => console.log("restored graph to empty from edn"))
	/**
	 * TODO - just use the empty graph to nuke existing one into oblivion emptyness state
	 */
	// .then(() => api.beforeDeletePages())
	// .then(() => api.deleteBlocks(allBlocks))
	// .then(() =>
	// 	poolPromises(
	// 		minimumIntervalMsBetweenMaxRequests,
	// 		maxRequestsPerInterval,
	// 		publicPages.map((page) => async () => await api.deletePage(page.uid))
	// 	)
	// )
	// .then(() => api.afterDeletePages())
	.then(() => console.log("begin stage 1"))
	.then(() => api.import(publicPagesHighPrio))
	// .then(() => api.markSelectedPagesAsPubliclyReadable(publicPagesHighPrio))
	.then(() => api.markEntireGraphReadableByAnyone())
	.then(() => console.log("end stage 1", getDeltaSec(), "begin stage 2"))
	.then(() => api.import(secondHighPrio))
	.then(() => console.log("end stage 2", getDeltaSec(), "begin stage 3"))
	// .then(() => api.import(publicPages)) // TODO configurable
	.then(() => console.log("done", getDeltaSec()))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
