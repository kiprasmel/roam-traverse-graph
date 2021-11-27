#!/usr/bin/env ts-node-dev

export * from "./findPublicPages";
export * from "./findPublicBlocks";

export * from "./parseSettingsFromRoamPage";
export * from "./findLinkedReferencesOfABlock";
export * from "./hideBlockStringsIfNotPublic";

if (!module.parent) {
	require("./find-public-pages");
}
