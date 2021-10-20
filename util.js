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

module.exports = {
	readJsonSync, //
	getAllBlocksFromPages,
};
