import { SettingsForPluginFindPublicPages } from "./types";

const defaultOptions: SettingsForPluginFindPublicPages = {
	publicTags: ["#public"],
	publicOnlyTags: [],
	privateTag: "#private", // TODO array
	hiddenStringValue: "hidden",
	makeThePublicTagPagePublic: false,
	doNotHideTodoAndDone: true,
	keepMetadata: false,
};

export default {
	...defaultOptions,
};
