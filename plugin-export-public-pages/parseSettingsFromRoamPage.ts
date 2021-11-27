#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { defaultRoamSettingsPageTitle, SettingsForPluginFindPublicPages } from "./findPublicPages";
import { Page } from "../roam";
import { RO } from "../types";

import { blockStringHasCode } from "../util/blockContainsCode";

/**
 * TODO error handling
 * TODO fail & exit if unknown settings detected (to avoid typos causing miss-configurations)
 * 	TODO think about backwards compatibility & deprecation strategies (use settingsVersion?)
 */
export const parseSettingsFromRawString = (
	rawStringOfSettingsBlock: string = '```javascript\nmodule.exports = () => {\n  return {\n    settingsVersion: "0"}\n}```', // TODO cleanup / remove
	parsedSettings: Partial<SettingsForPluginFindPublicPages> = !rawStringOfSettingsBlock
		? {}
		: [rawStringOfSettingsBlock]
				.map((str) => str.replace(/^```[^\n]+/, ""))
				.map((str) => str.replace(/```$/, ""))
				.map((str) => (console.log({ str }), str))
				.map((str) => eval(str))
				.map((exported) => (console.log({ exported }), exported))
				.map((exported) => exported())
				.map((settings) => (console.log({ settings }), settings))
				.map((settings) => (console.log({ stringified: JSON.stringify(settings) }), settings))[0]
): Partial<SettingsForPluginFindPublicPages> => parsedSettings;

export const parseRoamTraverseGraphSettingsFromRoamPage = <M0 extends RO, M1 extends RO>(
	somePages: Page<M0, M1>[] = [], //
	roamSettingsPageTitle: string = defaultRoamSettingsPageTitle,
	settingsPage: Page<M0, M1> | undefined = somePages.find((page) => page.title === roamSettingsPageTitle),
	hasCodeBlock: boolean = blockStringHasCode(settingsPage?.children?.[0]),
	settingsFromSettingsPage = hasCodeBlock
		? parseSettingsFromRawString(settingsPage?.children?.[0].string) //
		: {}
): Partial<SettingsForPluginFindPublicPages> => settingsFromSettingsPage;

if (!module.parent) {
	parseSettingsFromRawString();
}
