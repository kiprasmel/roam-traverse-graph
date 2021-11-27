import { SettingsForPluginFindPublicPages } from "./types";

export const defaultSettingsForPluginFindPublicPages: SettingsForPluginFindPublicPages = {
	publicTags: ["#public"],
	publicOnlyTags: [],
	privateTag: "#private", // TODO array
	hiddenStringValue: "hidden",
	makeThePublicTagPagePublic: false,
	doNotHideTodoAndDone: true,
	keepMetadata: false,
};

export const defaultRoamSettingsPageTitle = "roam-traverse-graph-settings" as const;
