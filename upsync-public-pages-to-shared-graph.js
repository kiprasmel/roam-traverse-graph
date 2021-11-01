#!/usr/bin/env node

// @ts-check

const path = require("path");

const { readJsonSync, startTimerMs, getAllBlocksFromPages, poolPromises } = require("./util");
const { findPublicPages } = require("./findPublicPages");

const { defaultPublicTag, defaultPrivateTag, defaultPublicOnlyTags } = require("./defaults");

console.log({ PATH_TO_ROAM_GRAPH: process.env.PATH_TO_ROAM_GRAPH });

let publicOnlyTags = (process.env.ROAM_PUBLIC_ONLY_TAGS || "").split(",").filter((po) => !!po);
if (!publicOnlyTags.length) {
	publicOnlyTags = defaultPublicOnlyTags;
}

let publicPagesRaw = findPublicPages(
	readJsonSync(
		path.resolve(
			__dirname, //
			process.env.PATH_TO_ROAM_GRAPH || "../notes/json/kipras-g1.json"
		)
	),
	{
		publicTag: process.env.ROAM_PUBLIC_TAG || defaultPublicTag, // custom for testing
		privateTag: process.env.ROAM_PRIVATE_TAG || defaultPrivateTag,
		publicOnlyTags,
	}
).filter(
	(raw) =>
		![
			"PmdJYvQ1i" /* anon */, //
			"10-23-2021" /** TODO UPDATE TO CURRENT DAY */,
		].includes(raw.page.uid)
);

const origRawLen = publicPagesRaw.length;

let publicPages = publicPagesRaw.map((p) => p.page);

// fs.writeFileSync("public-pages.json", JSON.stringify(publicPages, null, 2), { encoding: "utf-8" });

const RoamPrivateApi = require("./roam-research-private-api");
const secrets = require("./secrets.json"); // TODO FIXME

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
const publicGraphToImportInto = "kiprasmel";

const api = new RoamPrivateApi(publicGraphToImportInto, secrets.email, secrets.password, {
	headless: !!process.env.ROAM_BROWSER_NOT_HEADLESS || false,
	// @ts-expect-error
	folder: ".",
	// folder: "/tmp/",
});

const getDeltaSec = startTimerMs({ divider: 1000 });

const allBlocks = getAllBlocksFromPages(publicPages); // .splice(0, 500); // TODO FIXME REMVOE

// console.log(
// 	"allBlocks",
// 	allBlocks,
// 	allBlocks.filter((b) => typeof b !== "string")
// );

const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);
const maxRequestsPerInterval = 300 - 5;

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

console.log(len1, len2, len3, sum, origRawLen, sum === origRawLen /** should be true */);

Promise.resolve()
	// DISABLED, DO NOT USE (NO NEED)
	.then(() => api.logIn()) // bad, need more time pause lol
	.then(() => api.gotoAllPages())
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
	.then(() => api.markSelectedPagesAsPubliclyReadable(publicPagesHighPrio))
	.then(() => console.log("end stage 1", getDeltaSec(), "begin stage 2"))
	.then(() => api.import(secondHighPrio))
	.then(() => console.log("end stage 2", getDeltaSec(), "begin stage 3"))
	.then(() => api.import(publicPages))
	.then(() => console.log("done", getDeltaSec()))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
