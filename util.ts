/* eslint-disable indent */

import fs from "fs";
import path from "path";

import { LinkedReference } from "./types";

/**
 * @param { string } pathToFile
 */
export const readJsonSync = (pathToFile: string) =>
	JSON.parse(fs.readFileSync(path.resolve(pathToFile), { encoding: "utf-8" }));

export const writeJsonSync = (
	pathToFile: string, //
	json: Parameters<typeof JSON.stringify>[0]
	/*, pageContainingBlockSeenMap = new Map() */
) =>
	fs.writeFileSync(
		path.resolve(pathToFile),
		JSON.stringify(
			json,
			(key, value) =>
				["metaPage"].includes(key)
					? "[circular]"
					: ["pageContainingBlock", "blockRef", "parentBlockRef", "referencedPageRef"].includes(key)
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

export type MinimalPageOrBlock = {
	uid: string; //
	children?: MinimalPageOrBlock[];
};

export const getAllBlocksFromPages = (
	somePages: MinimalPageOrBlock[] = [] //
): MinimalPageOrBlock["uid"][] =>
	(somePages || []) //
		.map((p) => [p.uid, ...getAllBlocksFromPages(p.children || [])])
		.flat();

export const delay = (timeoutMs: number = 0) => new Promise((r) => setTimeout(r, timeoutMs));

/**
 * returns a `getTimeDeltaMs` function
 */
export const startTimerMs: (opts?: { startTime?: number; divider?: number }) => (endTime?: number) => number = (
	{
		startTime = new Date().getTime(), //
		divider = 1,
	} = {} //
) => (
	endTime = new Date().getTime() //
) => (endTime - startTime) / divider;

export type PromiseCreator<T> = () => Promise<T>;

export const poolPromises = async <T>(
	intervalMs: number, //
	maxRequestsPerIntervalIncl: number,
	arrayOfPromiseCreators: PromiseCreator<T>[] = []
): Promise<T[]> => {
	const results: T[][] = [];

	while (arrayOfPromiseCreators.length > 0) {
		const current: PromiseCreator<T>[] = arrayOfPromiseCreators.splice(0, maxRequestsPerIntervalIncl + 1);

		console.log(
			"pool #", //
			results.length,
			"current.length",
			current.length,
			"remaining",
			arrayOfPromiseCreators.length - results.length
		);

		const getDeltaMs = startTimerMs();

		const tmpResults: T[] = await Promise.all(current.map((promiseCreator) => promiseCreator()));

		results.push(tmpResults);

		console.log("delta", getDeltaMs() / 1000);
		await delay(intervalMs - getDeltaMs());
	}

	return results.flat();
};

export function createLinkedReferences(str: string): LinkedReference[] {
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
