const fs = require("fs");
const jsedn = require("jsedn");

const ret = jsedn.encode(require("../kiprasmel.json"));

fs.writeFileSync("../kiprasmel.edn", ret, { encoding: "utf-8" });

