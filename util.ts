// @ts-check

/* eslint-disable indent */

const fs = require("fs");
const path = require("path");

/**
 * @param { string } pathToFile
 */
const readJsonSync = (pathToFile) => JSON.parse(fs.readFileSync(path.resolve(pathToFile), { encoding: "utf-8" }));

/**
 * @param { string } pathToFile
 * @param { Parameters<typeof JSON.stringify>[0] } json
 */
const writeJsonSync = (pathToFile, json /*, pageContainingBlockSeenMap = new Map() */) =>
	fs.writeFileSync(
		path.resolve(pathToFile),
		JSON.stringify(
			json,
			(key, value) =>
				["metaPage"].includes(key)
					? "[circular]"
					: key === "pageContainingBlock"
					? "[dangerous, highly likely circular if at least 1 cross-referencing in a cycle]"
					: // : key === "refOfPageContainingBlock"
					  // ? (({ linkedReferences, ...rest } = value), rest)
					  // : key === "linkedMentions"
					  // ? "[linkedMentions]"

					  // : key === "pageContainingBlock"
					  // ? pageContainingBlockSeenMap.has(`${key}--${value.originalTitle}`)
					  // 	? `[circular, cross-referencing pages, value.orig: ${
					  // 			value.originalTitle
					  // 	  }, seenMap.value.orig: ${
					  // 			pageContainingBlockSeenMap.get(key + "--" + value.originalTitle).originalTitle
					  // 	  }]`
					  // 	: (pageContainingBlockSeenMap.set(`${key}--${value.originalTitle}`, value), value)
					  value,
			2
		),
		{ encoding: "utf-8" }
	);

/**
 * @typedef { { uid: string, children?: MinimalPageOrBlock[] } } MinimalPageOrBlock
 *
 * @type { (pagesOrBlocks: MinimalPageOrBlock[]) => MinimalPageOrBlock["uid"][] }
 */
const getAllBlocksFromPages = (somePages = []) =>
	(somePages || []).map((p) => [p.uid, ...getAllBlocksFromPages(p.children || [])]).flat();

/**
 * @template T
 * @param { number } timeoutMs
 * @returns { Promise<T> }
 */
const delay = (timeoutMs = 0) => new Promise((r) => setTimeout(r, timeoutMs));

/**
 * returns a `getTimeDeltaMs` function
 *
 * @param { { startTime?: number, divider?: number } } options
 * @returns { (endTime?: number) => number }
 */
const startTimerMs = ({ startTime = new Date().getTime(), divider = 1 } = {}) => (endTime = new Date().getTime()) =>
	(endTime - startTime) / divider;

/**
 * @template T
 * @typedef { () => Promise<T> } PromiseCreator
 */

/**
 * @template T
 * @param { number } intervalMs
 * @param { number } maxRequestsPerIntervalIncl
 * @param { PromiseCreator<T>[] } arrayOfPromiseCreators
 * @returns { Promise<T[]> }
 *
 */
const poolPromises = async (intervalMs, maxRequestsPerIntervalIncl, arrayOfPromiseCreators = []) => {
	/**
	 * @type T[][]
	 */
	const results = [];

	while (arrayOfPromiseCreators.length > 0) {
		/**
		 * @type PromiseCreator<T>[]
		 */
		const current = arrayOfPromiseCreators.splice(0, maxRequestsPerIntervalIncl + 1);

		console.log(
			"pool #", //
			results.length,
			"current.length",
			current.length,
			"remaining",
			arrayOfPromiseCreators.length - results.length
		);

		const getDeltaMs = startTimerMs();

		/**
		 * @type T[]
		 */
		const tmpResults = await Promise.all(current.map((promiseCreator) => promiseCreator()));

		results.push(tmpResults);

		console.log("delta", getDeltaMs() / 1000);
		await delay(intervalMs - getDeltaMs());
	}

	return results.flat();
};

/**
 * @param { string } str
 * @returns { import("./types").LinkedReference[] }
 */
function createLinkedReferences(str) {
	return [
		{
			origStr: str,
			fullStr: "#" + str, //
			kind: "#",
			create: (newStr) => "#[[" + newStr + "]]",
		},
		{
			origStr: str,
			fullStr: "#[[" + str + "]]", //
			kind: "#[[]]",
			create: (newStr) => "#[[" + newStr + "]]",
		},
		{
			origStr: str,
			fullStr: "[[" + str + "]]", //
			kind: "[[]]",
			create: (newStr) => "[[" + newStr + "]]",
		},
		{
			origStr: str,
			fullStr: str + "::", //
			kind: "::",
			create: (newStr) => newStr + "::",
		},
	];
}

/**
 * @type { import("./types").WithMeta }
 */
// function withMeta(block, key, val) {
function withMeta(block, meta) {
	return {
		...block,
		metadata: {
			...("metadata" in block ? block.metadata : {}),
			...(meta),
		},
	};
}

//
module.exports = {
	readJsonSync, //
	writeJsonSync,
	getAllBlocksFromPages,
	delay,
	startTimerMs,
	poolPromises,
	createLinkedReferences,
	withMeta,
};
