#!/usr/bin/env node

const fs = require("fs")
const util = require("util")

const decoder = new util.TextDecoder()

const file = "res.edn"
const content = fs.readFileSync(file)
const decoded = decoder.decode(content)

fs.writeFileSync("decoded.edn", decoded)

