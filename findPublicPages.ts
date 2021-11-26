#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { traverseBlockRecursively } from "./traverseBlockRecursively";
import { removeUnknownProperties, markBlockPublic } from "./findPublicBlocks";
import { findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions } from "./findLinkedReferencesOfABlock";
import { hideBlockStringsIfNotPublic } from "./hideBlockStringsIfNotPublic";
import { parseRoamTraverseGraphSettingsFromRoamPage } from "./util/parseSettingsFromRoamPage";
import { shallowMergeIncludingArrayValues } from "./util/shallowMergeIncludingArrayValues";
import { createLinkedReferences } from "./util";
import defaults from "./defaults";

import {
	SettingsForPluginFindPublicPages, //
	Page,
	PageWithMetadata,
	RO,
	Block,
	WithMetadata,
	ToReadonlyObject,
} from "./types";

import { withMetadata } from "./util/withMetadata";

// const blockBase = {
// 	"create-time": 69,
// 	"edit-email": "",
// 	"edit-time": 1,
// 	string: "1",
// 	uid: "69",
// 	//
// } as const;

// const bbbb = traverseBlockRecursively(
// 	() => (block) =>
// 		// eslint-disable-next-line no-param-reassign
// 		withMetadata(block, { hasCodeBlock: !!block?.string?.includes?.("```") }),
// 	{}
// )({ ...blockBase, metadata: {} });

// bbbb.metadata.hasCodeBlock;

const mapChildren = <
	/**
	 * NB!
	 * M1 comes first here, and M0 - second
	 * (opposite to everywhere else)
	 *
	 */
	M1 extends RO, //
	M0 extends RO = {}
>(
	// pred: (block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>) => typeof block & WithMetadata<ToReadonlyObject<M1>>,
	pred: (block: Block<M0, {}>) => Block<M0, M1>,
	newChildren: ReturnType<typeof pred>[] = []
) => (page: Page<M0, {}>): Page<M0, M1> => (
	// ) => (page: Page<M0>): Page<M0> & Page<M1> => (
	// eslint-disable-next-line no-param-reassign
	(newChildren = page.children.map(pred)), //
	{
		...page,
		children: newChildren,
	}
);

export const findPublicPages = <M0 extends RO, M1 extends RO>(
	/**
	 * TODO consider single vs array
	 *
	 * single here woud seem we'd need to do all the passes
	 * before we can parse the children tho..
	 *
	 */
	somePages: Page<M0>[] = [], //
	optionsOrig: SettingsForPluginFindPublicPages = { publicTags: [], publicOnlyTags: [] },
	settingsFromSettingsPage: Partial<SettingsForPluginFindPublicPages> = parseRoamTraverseGraphSettingsFromRoamPage(
		somePages
	),
	settings: SettingsForPluginFindPublicPages = shallowMergeIncludingArrayValues(defaults, [
		optionsOrig, //
		settingsFromSettingsPage,
	]),
	{
		doNotHideTodoAndDone,
		hiddenStringValue,
		keepMetadata,
		makeThePublicTagPagePublic,
		privateTag,
		publicOnlyTags,
		publicTags,
	} = settings
	// ): PageWithMetadata<M0 & M1>[] => ( // TODO FIXME
): PageWithMetadata<RO>[] => ( // TODO FIXME
	console.log({
		defaults,
		optionsOrig,
		settingsFromSettingsPage,
		merged: settings,
	}),
	/**
	 * TODO: move page.children into some temporary page._children or similar
	 * to make sure we delete it at the end,
	 * and only keep the manually added ones
	 * to avoid accidently forgetting to hide the necessary stuff lol
	 *
	 * and/or create tests, duh
	 *
	 * same w/ the `title` / `string` as well
	 *
	 */

	(somePages || [])
		.map((p) => keepOnlyKnownPropertiesOfPage<M0>(p))

		.map(
			(page) => (
				(page.children = (page.children || []).map(
					traverseBlockRecursively(() => (block) => ((block.metadata = block.metadata || {}), block), {})
				)),
				page
			)
		)
		.map(
			mapChildren<{ hasCodeBlock: boolean }>(
				traverseBlockRecursively(
					() => (block) =>
						// eslint-disable-next-line no-param-reassign
						withMetadata(block, { hasCodeBlock: !!block?.string?.includes?.("```") }),
					{}
				)
			)
		)

		// .map(
		// 	(page) => (
		// 		(page.children = (page.children || []).map(
		// 			traverseBlockRecursively<{ hasCodeBlock: boolean }>(
		// 				() => (block) =>
		// 					// eslint-disable-next-line no-param-reassign
		// 					withMetadata(block, { hasCodeBlock: !!block?.string?.includes?.("```") }),
		// 				{}
		// 			)
		// 		)),
		// 		page
		// 	)
		// )

		.map((page) => {
			const isThePublicTagPageAndShouldBePublic =
				makeThePublicTagPagePublic && publicTags.some((publicTag) => titleIsPublicTag(page, publicTag));

			return isThePublicTagPageAndShouldBePublic || //
				publicTags.some((publicTag) => isMarkedAsFullyPublic(page, publicTag))
				? toFullyPublicPage(page, hiddenStringValue)
				: toPotentiallyPartiallyPublicPage(page, hiddenStringValue);
		})

		.map(
			(pageMeta) => (
				(pageMeta.isDailyNotesPage = [
					/^\d{2}-\d{2}-\d{4}$/, //
					/^\d{4}-\d{2}-\d{2}$/, // prolly won't happen ever, but...
				].some((
					reg //
				) => reg.test(pageMeta.page.uid))), //
				pageMeta
			)
		)

		.map(
			(currentPageWithMeta, _index, currentPagesWithMetadata) => (
				(currentPageWithMeta.page.children = (currentPageWithMeta.page.children || [])
					.map(traverseBlockRecursively(removeUnknownProperties, {}))
					.filter((block) => !!block)
					.map(
						traverseBlockRecursively(
							markBlockPublic, //
							{
								rootParentPage: currentPageWithMeta,
								publicTags, // TODO CONFIRM
								publicOnlyTags,
								privateTag,
							}
						)
					)
					.map(
						traverseBlockRecursively(
							findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions, //
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
								// publicTag, // TODO CONFIRM
								privateTag,
								doNotHideTodoAndDone,
								hiddenStringValue,
							}
						)
					)
					.map(
						traverseBlockRecursively(
							({ rootParentPage, allPagesWithMetadata }) => (b) => {
								const { linkedReferences } = b.metadata;

								if (!linkedReferences.length) {
									return b;
								}

								const yay = !!linkedReferences.find(
									(lr) =>
										!!allPagesWithMetadata.find(
											(pageMeta) =>
												lr.metaPage.page.uid === pageMeta.page.uid &&
												pageMeta.hasAtLeastOnePublicLinkedReference
										)
								);

								if (yay) {
									rootParentPage.hasAtLeastOneMentionOfAPublicLinkedReference = true;

									return [b, false];
								}

								return b;
							},
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
							}
						)
					)
					.map(
						traverseBlockRecursively(hideBlockStringsIfNotPublic, {
							doNotHideTodoAndDone,
							hiddenStringValue,
						})
					)
					.map((b) =>
						keepMetadata
							? b
							: traverseBlockRecursively(() => (block) => (delete block.metadata, block), {})(b)
					)),
				currentPageWithMeta
			)
		)

		/**
		 * TODO think about how we want to implement the hiding of page title's
		 * if we allow an option to NOT hide them IF at least 1 child anywhere in hierarchy
		 * has the public tag
		 *
		 * will need 2 passes through the hieararchy prolly
		 *
		 */
		.map((pageMeta) =>
			pageMeta.isFullyPublic || pageMeta.hasAtLeastOnePublicLinkedReference || pageMeta.isDailyNotesPage
				? ((pageMeta.isTitleHidden = false), //
				  pageMeta)
				: ((pageMeta.isTitleHidden = true), //
				  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
				  pageMeta)
		)

		.map((p) => (!p.page.children?.length && delete p.page.children, p))

		.sort((A, B) =>
			((
				sort = {
					AHEAD: -1, //
					BEHIND: 1,
					EVEN: 0,
				}
			) =>
				publicTags.some((publicTag) => titleIsPublicTag(A.page, publicTag))
					? sort["AHEAD"]
					: publicTags.some((publicTag) => titleIsPublicTag(B.page, publicTag))
					? sort["BEHIND"]
					: A.linkedMentions && B.linkedMentions
					? B.linkedMentions.length - A.linkedMentions.length
					: A.linkedMentions
					? sort["AHEAD"]
					: B.linkedMentions
					? sort["BEHIND"]
					: A.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
					? sort["AHEAD"]
					: B.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
					? sort["BEHIND"]
					: sort["EVEN"])()
		)
);

/**
 * security et al -- in case upstream adds something potentially private
 * and we don't immediately update to remove it (very plausible)
 */
function keepOnlyKnownPropertiesOfPage<M extends RO>(page: Page<M> & Record<any, any>): Page {
	return {
		title: page.title,
		uid: page.uid,
		"create-time": page["create-time"],
		"edit-time": page["edit-time"],
		"edit-email": page["edit-email"],
		...("refs" in page ? { refs: page.refs } : {}),
		...("children" in page ? { children: page.children } : {}),
	};
}

function titleIsPublicTag<M extends RO>(page: Page<M>, publicTag: string): boolean {
	if (!page.title) {
		return false;
	}

	const { title } = page;

	return !![
		title, //
		...createLinkedReferences(title).map((lr) => lr.fullStr),
	].includes(publicTag);
}

function isMarkedAsFullyPublic<M extends RO>(page: Page<M & { hasCodeBlock: boolean }>, publicTag: string): boolean {
	/**
	 * the page is fully public IF AND ONLY IF:
	 * 1. the publicTag is inside the top-most level block,
	 * 2. the block has no children blocks inside it,
	 * 3. the block's content (string) is equivalent to the publicTag string without any exceptions
	 *    (even additional spaces inside the block make the power of the publicTag void - all intentional).
	 */
	return !!(
		page.children && //
		page.children.length &&
		page.children.some((block) => !block.children && block.string === publicTag && !block.metadata.hasCodeBlock)
	);
}

function toFullyPublicPage<M extends RO = RO>(page: Page<M>, hiddenStringValue: string): PageWithMetadata<M> {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: true,
		isPublicTagInRootBlocks: true,
		isFullyPublic: true,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
		hasAtLeastOnePublicLinkedReference: false, // until found out otherwise
		hasAtLeastOneMentionOfAPublicLinkedReference: false, // CHANGEABLE LATER
		isTitleHidden: false, // CHANGEABLE LATER
	};
}

function toPotentiallyPartiallyPublicPage<M extends RO = RO>(
	page: Page<M>, //
	hiddenStringValue: string
): PageWithMetadata<M> {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: false,
		isPublicTagInRootBlocks: false,
		isFullyPublic: false,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: false, // CHANGEABLE LATER
		hasAtLeastOnePublicLinkedReference: false, // CHANGEABLE LATER
		hasAtLeastOneMentionOfAPublicLinkedReference: false, // CHANGEABLE LATER // TODO VERIFY
		isTitleHidden: false, // CHANGEABLE LATER // TODO VERIFY
	};
}

module.exports = {
	findPublicPages,
};
