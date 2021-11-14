#!/usr/bin/env node

// @ts-check

/**
 * TODO error handling
 * TODO fail & exit if unknown settings detected (to avoid typos causing miss-configurations)
 * 	TODO think about backwards compatibility & deprecation strategies (use settingsVersion?)
 *
 * @param { string } rawStringOfSettingsBlock
 * @returns { Partial<import("../types").FindPublicPagesOptions> }
 */
const parseSettingsFromRawString = (
	rawStringOfSettingsBlock = '```javascript\nmodule.exports = () => {\n  return {\n    settingsVersion: "0"}\n}```', // TODO cleanup / remove
	parsedSettings = [rawStringOfSettingsBlock]
		.map((str) => str.replace(/^```[^\n]+/, ""))
		.map((str) => str.replace(/```$/, ""))
		.map((str) => (console.log({ str }), str))
		.map((str) => eval(str))
		.map((exported) => (console.log({ exported }), exported))
		.map((exported) => exported())
		.map((settings) => (console.log({ settings }), settings))
		.map((settings) => (console.log({ stringified: JSON.stringify(settings) }), settings))[0]
) => parsedSettings;

const defaultRoamSettingsPageTitle = "roam-traverse-graph-settings";

const parseRoamTraverseGraphSettingsFromRoamPage = (
	somePages = [], //
	roamSettingsPageTitle = defaultRoamSettingsPageTitle,
	settingsPage = somePages.find((page) => page.title === roamSettingsPageTitle),
	settingsFromSettingsPage = !settingsPage || //
	!settingsPage.children ||
	!settingsPage.children.length ||
	!settingsPage.children[0].string ||
	!settingsPage.children[0].string.includes("```")
		? {}
		: parseSettingsFromRawString(settingsPage.children[0].string)
) => settingsFromSettingsPage;

module.exports = {
	parseSettingsFromRawString,
	defaultRoamSettingsPageTitle,
	parseRoamTraverseGraphSettingsFromRoamPage,
};

// @ts-expect-error
if (!module.parent) {
	parseSettingsFromRawString();
}
