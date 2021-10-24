#!/usr/bin/env node

// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");
const path = require("path");

const { readJsonSync, getAllBlocksFromPages, poolPromises } = require("./util");
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

const publicPages = publicPagesRaw.map((p) => p.page);

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

const startTime = new Date();

const allBlocks = getAllBlocksFromPages(publicPages); // .splice(0, 500); // TODO FIXME REMVOE

// console.log(
// 	"allBlocks",
// 	allBlocks,
// 	allBlocks.filter((b) => typeof b !== "string")
// );

const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);
const maxRequestsPerInterval = 300 - 5;

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

Promise.resolve()
	// DISABLED, DO NOT USE (NO NEED)
	.then(() => api.logIn()) // bad, need more time pause lol
	.then(() => api.gotoAllPages())
	.then(() => api.beforeDeletePages())
	.then(() => api.deleteBlocks(allBlocks))
	.then(() =>
		poolPromises(
			minimumIntervalMsBetweenMaxRequests,
			maxRequestsPerInterval,
			publicPages.map((page) => async () => await api.deletePage(page.uid))
		)
	)
	.then(() => api.afterDeletePages())
	.then(() => api.import(_publicPagesHighPrio))
	.then(() => api.markSelectedPagesAsPubliclyReadable(_publicPagesHighPrio))
	.then(() => api.import(publicPages.filter((pps) => !_publicPagesHighPrio.map((pp) => pp.uid).includes(pps.uid))))
	.then(() => console.log("done", (new Date() - startTime) / 1000))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
