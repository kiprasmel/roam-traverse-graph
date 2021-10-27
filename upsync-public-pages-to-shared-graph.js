#!/usr/bin/env node

// @ts-check

const path = require("path");

const { readJsonSync, startTimerMs, getAllBlocksFromPages, poolPromises } = require("./util");
const { findPublicPages } = require("./findPublicPages");

const publicPagesRaw = findPublicPages(readJsonSync(path.resolve(__dirname, "../notes/json/kipras-g1.json")), {
	publicTag: "#public", // custom for testing
}).filter(
	(raw) =>
		![
			"PmdJYvQ1i" /* anon */, //
			"10-23-2021" /** TODO UPDATE TO CURRENT DAY */,
		].includes(raw.page.uid)
);

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
	headless: false,
	// @ts-expect-error
	folder: ".",
	// folder: "/tmp/",
});

const getDeltaMs = startTimerMs();

const allBlocks = getAllBlocksFromPages(publicPages); // .splice(0, 500); // TODO FIXME REMVOE

// console.log(
// 	"allBlocks",
// 	allBlocks,
// 	allBlocks.filter((b) => typeof b !== "string")
// );

const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);
const maxRequestsPerInterval = 300 - 5;

/**
 * @param { import("./types").PageWithMetadata[] } ppsRaw
 * @returns { import("./types").Page[] }
 */
const filterPublicPagesForHighPrio = (ppsRaw) =>
	ppsRaw
		.filter((raw) => {
			if (!raw) {
				return false;
			}
			return !!raw.isFullyPublic || !!raw.hasAtLeastOnePublicBlockAnywhereInTheHierarchy;
		})
		.map((raw) => raw.page);

// TODO FIXME TEMP
const _publicPagesHighPrio = filterPublicPagesForHighPrio(publicPagesRaw);

publicPages = publicPages.filter((pps) => !_publicPagesHighPrio.map((pp) => pp.uid).includes(pps.uid));

const secondHighPrio = publicPagesRaw.filter((p) => p.hasAtLeastOneMentionOfAPublicLinkedReference).map((p) => p.page);

publicPages = publicPages.filter((pps) => !secondHighPrio.map((pp) => pp.uid).includes(pps.uid));

console.log(_publicPagesHighPrio.length, secondHighPrio.length, publicPages.length);

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
	.then(() => api.import(_publicPagesHighPrio))
	.then(() => api.markSelectedPagesAsPubliclyReadable(_publicPagesHighPrio))
	.then(() => api.import(secondHighPrio))
	.then(() => api.import(publicPages))
	.then(() => console.log("done", getDeltaMs() / 1000))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
