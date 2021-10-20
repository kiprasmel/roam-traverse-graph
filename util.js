const fs = require("fs");
const path = require("path");

const readJsonSync = (pathToFile) => JSON.parse(fs.readFileSync(path.resolve(pathToFile), { encoding: "utf-8" }));

module.exports = {
	readJsonSync, //
};
