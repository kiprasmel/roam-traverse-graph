// @ts-check

const fs = require("fs");
const path = require("path");

const readJsonSync = (pathToFile) => JSON.parse(fs.readFileSync(path.resolve(pathToFile), { encoding: "utf-8" }));

const writeJsonSync = (pathToFile, json) =>
	fs.writeFileSync(path.resolve(pathToFile), JSON.stringify(json, null, 2), { encoding: "utf-8" });

/**
 * @type { (somePages?: import("./types").PageOrBlock[]) => import("./types").EntityBase["uid"][] }
 */
const getAllBlocksFromPages = (somePages = []) =>
	(!somePages || !somePages.length) ? [] : somePages.map((p) => [p.uid, ...getAllBlocksFromPages(p.children)]).flat();
//, ...(!p.children ? [] : p.children.map((c) => getAllBlocksFromPages(c)))]).flat();

const delay = (timeoutMs = 0) => new Promise((r) => setTimeout(r, timeoutMs));

const poolPromises = async (intervalMs, maxRequestsPerIntervalIncl, arrayOfPromiseCreators = []) => {
	const results = [];

	while (arrayOfPromiseCreators.length > 0) {
		const current = arrayOfPromiseCreators.splice(0, maxRequestsPerIntervalIncl + 1);

		console.log(
			"pool #", //
			results.length,
			"current.length",
			current.length,
			"remaining",
			arrayOfPromiseCreators.length - results.length
		);

		const startTime = new Date().getTime();
		const tmpResults = await Promise.all(current.map((promiseCreator) => promiseCreator()));
		results.push(tmpResults);

		const endTime = new Date().getTime();
		const delta = endTime - startTime;
		await delay(intervalMs - delta);
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

//
module.exports = {
	readJsonSync, //
	writeJsonSync,
	getAllBlocksFromPages,
	delay,
	poolPromises,
	createLinkedReferences,
};
