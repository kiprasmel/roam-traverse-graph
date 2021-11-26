import { FindPublicPagesOptions } from "./types";

const defaultOptions: FindPublicPagesOptions = {
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
} as const;
