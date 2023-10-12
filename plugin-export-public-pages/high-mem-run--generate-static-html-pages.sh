#!/usr/bin/env bash

run() {
	local LIMIT=38000000
	ulimit -s $LIMIT
	export PATH_TO_ROAM_GRAPH="${1:-$HOME/projects/notes-private/json/kipras-g1.json}"
	export NOTES_OF_NAME="${2:-kipras melnikovas}"
	node --trace-uncaught --use-osr --trace-osr --stack-size=$LIMIT ../dist/plugin-export-public-pages/generate-static-html-pages.js
}

run
