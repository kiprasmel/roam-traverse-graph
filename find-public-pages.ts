#!/usr/bin/env ts-node-dev

/**
 * testing/convenience only!
 * do not rely on this, use the actual plugin files.
 */

if (!module.parent) {
	require("./plugin-export-public-pages/find-public-pages");
}
