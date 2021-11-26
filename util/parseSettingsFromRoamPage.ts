#!/usr/bin/env ts-node-dev

import { Page } from "../roam";
import { SettingsForPluginFindPublicPages, RO } from "../types";

/**
 * TODO error handling
 * TODO fail & exit if unknown settings detected (to avoid typos causing miss-configurations)
 * 	TODO think about backwards compatibility & deprecation strategies (use settingsVersion?)
 *
 * @param { string } rawStringOfSettingsBlock
 * @returns { Partial<import("../types").FindPublicPagesOptions> }
 */
export const parseSettingsFromRawString = (
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

export const defaultRoamSettingsPageTitle = "roam-traverse-graph-settings";

export const parseRoamTraverseGraphSettingsFromRoamPage = <M extends RO>(
	somePages: Page<M>[] = [], //
	roamSettingsPageTitle: string = defaultRoamSettingsPageTitle,
	settingsPage: Page<M> | undefined = somePages.find((page) => page.title === roamSettingsPageTitle),
	hasCodeBlock: boolean = settingsPage?.children?.[0]?.string?.includes?.("```"),
	settingsFromSettingsPage = hasCodeBlock
		? parseSettingsFromRawString(settingsPage.children[0].string) //
		: {}
): Partial<SettingsForPluginFindPublicPages> => settingsFromSettingsPage;

if (!module.parent) {
	parseSettingsFromRawString();
}
