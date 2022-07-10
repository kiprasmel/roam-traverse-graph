#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { defaultRoamSettingsPageTitle, SettingsForPluginFindPublicPages } from "./findPublicPages";
import { Page } from "../roam";
import { RO } from "../types";

import { blockStringHasCode } from "../util/blockContainsCode";

export type SomeSettings = Partial<SettingsForPluginFindPublicPages>;
export type SomeSettingsWithVersion = SomeSettings & {
	version: number;
};

/**
 * TODO error handling
 */
export const parseSettingsFromRawString = (
	rawStringOfSettingsBlock: string = '```javascript\nmodule.exports = () => {\n  return {\n    version: "0"}\n}```', // TODO cleanup / remove
	parsedSettings: SomeSettingsWithVersion = !rawStringOfSettingsBlock
		? {}
		: [rawStringOfSettingsBlock]
				.map((str) => str.replace(/^```[^\n]+/, ""))
				.map((str) => str.replace(/```$/, ""))
				.map((str) => eval(str))
				.map((exported) => exported())[0]
): SomeSettingsWithVersion => parsedSettings;

/**
 * TODO fail & exit if unknown settings detected (to avoid typos causing miss-configurations)
 *	TODO think about backwards compatibility & deprecation strategies (use version?)
 */
export const parseRoamTraverseGraphSettingsFromRoamPage = <M0 extends RO, M1 extends RO>(
	somePages: Page<M0, M1>[] = [], //
	latestSupportedSettingsVersion = 0,
	roamSettingsPageTitle: string = defaultRoamSettingsPageTitle,
	settingsPage: Page<M0, M1> | undefined = somePages.find((page) => page.title === roamSettingsPageTitle),
	allSettingsFromSettingsPage: SomeSettingsWithVersion[] = (settingsPage?.children || [])
		.filter(blockStringHasCode)
		.map((block) => parseSettingsFromRawString(block.string))
): SomeSettings => {
	const hasNewer = (s: SomeSettingsWithVersion) => s.version > latestSupportedSettingsVersion;
	const hasLatest = (s: SomeSettingsWithVersion) => s.version === latestSupportedSettingsVersion;
	const hasEarlier = (s: SomeSettingsWithVersion) => s.version < latestSupportedSettingsVersion;

	const bigToSmall = (A: SomeSettingsWithVersion, B: SomeSettingsWithVersion) => B.version - A.version;

	const newerVersions: SomeSettingsWithVersion[] = allSettingsFromSettingsPage.filter(hasNewer).sort(bigToSmall);
	const latestVersions: SomeSettingsWithVersion[] = allSettingsFromSettingsPage.filter(hasLatest).sort(bigToSmall);
	const earlierVersions: SomeSettingsWithVersion[] = allSettingsFromSettingsPage.filter(hasEarlier).sort(bigToSmall);

	// console.log({ allSettingsFromSettingsPage, newerVersions, latestVersions, earlierVersions });

	const willProceedWith = latestVersions.length
		? latestVersions //
		: earlierVersions.length
		? earlierVersions
		: ("never" as const);

	if (newerVersions.length) {
		const msg =
			"found settings with never versions that we do not support yet." +
			"\nconsider upgrading roam-traverse-graph." +
			"\nlatest supported version is " +
			latestSupportedSettingsVersion +
			", but found settings for versions: " +
			newerVersions.map((s) => s.version).join("\n");

		console.warn(msg);

		return {};
	}

	if (willProceedWith === "never") {
		const msg =
			"did not find any settings from the settings page (" +
			roamSettingsPageTitle +
			"), will proceed with defaults.";
		console.warn(msg);

		return {};
	}

	/**
	 * assumes sorted from biggest to smallest
	 */
	const settings = willProceedWith[0];

	// console.log({ settings });

	return settings;
};

if (!module.parent) {
	parseSettingsFromRawString();
}
