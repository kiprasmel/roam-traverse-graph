// @ts-check

const fs = require("fs");
const path = require("path");

const readJsonSync = (pathToFile) => JSON.parse(fs.readFileSync(path.resolve(pathToFile), { encoding: "utf-8" }));

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

		const startTime = new Date().getTime();
		const tmpResults = await Promise.all(current.map((promiseCreator) => promiseCreator()));
		results.push(tmpResults);

		const endTime = new Date().getTime();
		const delta = endTime - startTime;
		await delay(intervalMs - delta);
	}

	return results.flat();
};

//
module.exports = {
	readJsonSync, //
	getAllBlocksFromPages,
	delay,
	poolPromises,
};
