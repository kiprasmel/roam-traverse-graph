#!/usr/bin/env node

// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");

const { readJsonSync, getAllBlocksFromPages, poolPromises } = require("./util");
const { findPublicPages } = require("./findPublicPages");

const publicPages = findPublicPages(readJsonSync(path.resolve(__dirname, "../notes/json/kipras-g1.json")), {
	recursive: true,
	publicTag: "#public", // custom for testing
}).map((p) => p.page);

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

// const allBlocks = getAllBlocksFromPages(publicPages).splice(0, 500); // TODO FIXME REMVOE

// console.log(
// 	"allBlocks",
// 	allBlocks,
// 	allBlocks.filter((b) => typeof b !== "string")
// );

const maxRequestsPerInterval = 300 - 5;
const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);

Promise.resolve()
	// .then(() => api.deleteBlocks(allBlocks))
	.then(() =>
		poolPromises(
			minimumIntervalMsBetweenMaxRequests,
			maxRequestsPerInterval,
			publicPages.map((page) => async () => await api.deletePage(page.uid))
		)
	)
	.then(() => api.import(publicPages))
	.then(() => api.markSelectedPagesAsPubliclyReadable(publicPages))
	.then(() => console.log("done", (new Date() - startTime) / 1000))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
