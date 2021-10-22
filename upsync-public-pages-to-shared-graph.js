#!/usr/bin/env node

// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");
const path = require("path");

const { readJsonSync, getAllBlocksFromPages, poolPromises } = require("./util");
const { findPublicPages } = require("./findPublicPages");

const publicPagesRaw = findPublicPages(readJsonSync(path.resolve(__dirname, "../notes/json/kipras-g1.json")), {
	publicTag: "#public", // custom for testing
});

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

const startTime = new Date();

const allBlocks = getAllBlocksFromPages(publicPages); // .splice(0, 500); // TODO FIXME REMVOE

// console.log(
// 	"allBlocks",
// 	allBlocks,
// 	allBlocks.filter((b) => typeof b !== "string")
// );

const minimumIntervalMsBetweenMaxRequests = 1000 * (60 + 2);
const maxRequestsPerInterval = 300 - 5;

const filterPublicPages = (pps) =>
	pps
		.filter((pp) => {
			const raw = publicPagesRaw.find((ppr) => ppr.page.uid === pp.uid);
			if (!raw) {
				console.warn("raw now found for page.uid", pp.uid);
				return true;
			}
			return !!raw.hasAtLeastOnePublicBlockAnywhereInTheHierarchy || !!raw.hasAtLeastOneLinkedReference;
		})
		.filter((pp) => !["PmdJYvQ1i" /* anon */, , "10-20-2021"].includes(pp.uid));
const _publicPages = publicPages;

// TODO FIXME - TEMP
publicPages = filterPublicPages(publicPages);

Promise.resolve()
	// DISABLED, DO NOT USE (NO NEED)
	.then(() => api.logIn()) // bad, need more time pause lol
	.then(() => api.beforeDeletePages())
	.then(() => api.deleteBlocks(allBlocks))
	.then(() =>
		poolPromises(
			minimumIntervalMsBetweenMaxRequests,
			maxRequestsPerInterval,
			_publicPages.map((page) => async () => await api.deletePage(page.uid))
		)
	)
	.then(() => api.afterDeletePages())
	.then(() => api.import(publicPages))
	.then(() => api.markSelectedPagesAsPubliclyReadable(filterPublicPages(publicPages)))
	.then(() => api.import(_publicPages.filter((pps) => !publicPages.map((pp) => pp.uid).includes(pps.uid))))
	.then(() => console.log("done", (new Date() - startTime) / 1000))
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => console.log("finally"));
