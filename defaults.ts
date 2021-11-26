// @ts-check

module.exports = {
	/** @type { Exclude<import("./types").FindPublicPagesOptions["publicTags"], undefined> } */
	publicTags: ["#public"],
	/** @type { string[] } */
	publicOnlyTags: [],
	/** @type { readonly string } */
	privateTag: "#private",
	/** @type { readonly string } */
	hiddenStringValue: "hidden",
	/** @type { boolean } */
	makeThePublicTagPagePublic: false,
	/** @type { boolean } */
	doNotHideTodoAndDone: true,
	/** @type { boolean } */
	keepMetadata: false,
};
