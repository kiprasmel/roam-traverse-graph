#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { traverseBlockRecursively } from "./traverseBlockRecursively";
import { removeUnknownProperties, markBlockPublic } from "./findPublicBlocks";
import { findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions } from "./findLinkedReferencesOfABlock";
import { hideBlockStringsIfNotPublic } from "./hideBlockStringsIfNotPublic";
import { parseRoamTraverseGraphSettingsFromRoamPage } from "./util/parseSettingsFromRoamPage"; // TODO FIXME
import { shallowMergeIncludingArrayValues } from "./util/shallowMergeIncludingArrayValues";
import { createLinkedReferences } from "./util";
import { blockStringHasCode } from "./util/blockContainsCode";
import { defaultSettingsForPluginFindPublicPages } from "./defaults";

import {
	SettingsForPluginFindPublicPages, //
	Page,
	PageWithMetadata,
	RO,
	Block,
	LinkedRef,
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

const pageWithNewChildren = <
	M0 extends RO,
	M1 extends RO //
>(
	// pred: (block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>) => typeof block & WithMetadata<ToReadonlyObject<M1>>,
	pred: <M2>(block: Block<M0 & M2, {}>, index?: number, array?: Block<M0 & M2, {}>[]) => Block<M0 & M1 & M2, M1>
) => <M2>(page: Page<M0 & M2, {}>): Page<M0 & M1 & M2, M1> => {
	// ) => (page: Page<M0>): Page<M0> & Page<M1> => (
	// eslint-disable-next-line no-param-reassign
	const newChildren: Block<M0 & M1 & M2, M1>[] = (page.children || []).map((block, index, array) =>
		pred<M2>(block, index, array)
	); // TODO TS ?

	return {
		...page,
		children: newChildren,
	};
};

// TODO
// type MFinal = ToReadonlyObject<{ hasCodeBlock: boolean }>;

export const findPublicPages = <M0 extends RO>(
	/**
	 * TODO consider single vs array
	 *
	 * single here woud seem we'd need to do all the passes
	 * before we can parse the children tho..
	 *
	 */
	somePages: Page<M0, {}>[] = [], //
	optionsOrig: Partial<SettingsForPluginFindPublicPages> = { publicTags: [], publicOnlyTags: [] },
	settingsFromSettingsPage: Partial<SettingsForPluginFindPublicPages> = parseRoamTraverseGraphSettingsFromRoamPage(
		somePages
	),
	settings: SettingsForPluginFindPublicPages = shallowMergeIncludingArrayValues(
		defaultSettingsForPluginFindPublicPages,
		[
			optionsOrig, //
			settingsFromSettingsPage,
		]
	),
	{
		doNotHideTodoAndDone,
		hiddenStringValue,
		keepMetadata,
		makeThePublicTagPagePublic,
		privateTag,
		publicGlobalTags,
		publicOnlyTags,
		publicTags,
	} = settings
	// ): PageWithMetadata<M0 & M1>[] => ( // TODO FIXME
	// ): PageWithMetadata<M0, MFinal>[] => ( // TODO FIXME // TODO FIXME
) => (
	console.log({
		defaultOptions: defaultSettingsForPluginFindPublicPages,
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

		// .map(
		// 	mapChildren(
		// 		traverseBlockRecursively(() => (block) => ((block.metadata = block.metadata || ({} as M0)), block), {})
		// 	)
		// )
		.map(
			pageWithNewChildren<M0, { hasCodeBlock: boolean }>(
				traverseBlockRecursively(
					// traverseBlockRecursively<{}>(
					() => (block) =>
						withMetadata({
							hasCodeBlock: blockStringHasCode(block),
						})(block),
					{}
				)(undefined)
			)
		)
		// .map(p => p.children[0].metadata.)
		// .map(p => p.children[0].metadata.)
		.map((page) => {
			const isThePublicTagPageAndShouldBePublic =
				makeThePublicTagPagePublic && publicTags.some((publicTag) => titleIsPublicTag(page, publicTag));

			return isThePublicTagPageAndShouldBePublic || //
				publicGlobalTags.some((tag) => isMarkedAsFullyPublic(page, tag))
				? toFullyPublicPage(page, hiddenStringValue)
				: toPotentiallyPartiallyPublicPage(page, hiddenStringValue);
		})
		// .map(pm => pm.page.children?.[0].metadata.)

		.map(
			(pageMeta) => (
				// TODO TS
				((pageMeta as any).isDailyNotesPage = [
					/^\d{2}-\d{2}-\d{4}$/, //
					/^\d{4}-\d{2}-\d{2}$/, // prolly won't happen ever, but...
				].some((
					reg //
				) => reg.test(pageMeta.page.uid))), //
				pageMeta
			)
		)
		// .map(pm => pm.page.children?.[0].metadata.)

		.map(
			// mapChildren((currentPageWithMeta, _index, currentPagesWithMetadata) => (
			/**
			 * TODO - make pages non-moronic (dont wrap -- add metadata sideways),
			 * then use the `mapChildren` here,
			 * and use M2 also just like in traverseBlockRecursively to keep the metadata
			 */

			// mapChildren((currentPageWithMeta, _index, currentPagesWithMetadata) => (
			(currentPageWithMeta, _index, currentPagesWithMetadata) => (
				// ((currentPageWithMeta.page.children || [])
				// TODO FIXME TS:
				// @ts-expect-error
				(currentPageWithMeta.page.children = (currentPageWithMeta.page.children || [])
					// .map(p => p.children[0].metadata.)
					.map(traverseBlockRecursively(removeUnknownProperties, {})(undefined))
					// .map(p => p.children[0].metadata.)
					.filter((block) => !!block)
					// testing:
					// .map(
					// 	traverseBlockRecursively<{}>(
					// 		() => withMetadata({ foo: "bar" }), //
					// 		{}
					// 	)(undefined) //
					// )
					// .map((block) => block.metadata.)
					.map(
						traverseBlockRecursively(
							// <
							// 	{},
							// 	{
							// 		isPublicOnly: boolean;
							// 		isPublic: boolean;
							// 		hasPublicTag: boolean;
							// 		hasPrivateTag: boolean;
							// 	}
							// >
							markBlockPublic, //
							{
								rootParentPage: currentPageWithMeta,
								publicTags, // TODO CONFIRM
								publicOnlyTags,
								privateTag: privateTag as string, // TODO TS wtf
							}
						)(undefined)
					)
					// .map((block) => block)
					// .map((b) => withMetadata(b, { foo: "bar" }))
					// .map(b => b.metadata.)
					// .map(traverseBlockRecursively<{}>(() => (b) => b.metadata, {}))
					.map(
						traverseBlockRecursively(
							// <{}, { linkedReferences: LinkedRef[] }>
							findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions, //
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
							}
						)(undefined)
					)
					// .map(b => b.metadata.)
					.map(
						traverseBlockRecursively<
							{ linkedReferences: LinkedRef[] }, // TODO TS
							{},
							{
								rootParentPage: PageWithMetadata<{}, {}>; // TODO FIXME
								allPagesWithMetadata: PageWithMetadata<{}, {}>[];
							}
						>(
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
						)(undefined)
					)
					.map(
						traverseBlockRecursively(hideBlockStringsIfNotPublic, {
							doNotHideTodoAndDone,
							hiddenStringValue,
						})(undefined)
					)
					// .map((block) => block.metadata.)

					/**
					 * TODO FIXME - remove this & `keepMetadata` true by default; users can remove it themselves via `JSON.stringify`
					 */
					.map((block) =>
						keepMetadata
							? block
							: traverseBlockRecursively(
									() => (b) => (
										"metadata" in b && ((b.metadata = {} as any), delete (b as any).metadata),
										(b as Omit<typeof b, "metadata">) as any
									), // TODO TS
									{}
							  )(undefined)(block)
					)),
				currentPageWithMeta
			)
		)
		// .map(pm => pm.page.children?.[0].metadata. )

		/**
		 * TODO think about how we want to implement the hiding of page title's
		 * if we allow an option to NOT hide them IF at least 1 child anywhere in hierarchy
		 * has the public tag
		 *
		 * will need 2 passes through the hieararchy prolly
		 *
		 */
		.map((pageMeta) =>
			pageMeta.isFullyPublic || pageMeta.hasAtLeastOnePublicLinkedReference || (pageMeta as any).isDailyNotesPage // TODO TS
				? ((pageMeta.isTitleHidden = false), //
				  pageMeta)
				: ((pageMeta.isTitleHidden = true), //
				  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
				  pageMeta)
		)

		.map((p) => (!p.page.children?.length && delete p.page.children, p))

		.sort((
			A: any, // TODO TS
			B: any // TODO TS
		) =>
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
function keepOnlyKnownPropertiesOfPage<M0 extends RO>(
	page: Page<M0, {}> & Record<any, any> //
): Page<M0, {}> {
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

function titleIsPublicTag<M0 extends RO, M1 extends RO>(page: Page<M0, M1>, publicTag: string): boolean {
	if (!page.title) {
		return false;
	}

	const { title } = page;

	return !![
		title, //
		...createLinkedReferences(title).map((lr) => lr.fullStr),
	].includes(publicTag);
}

function isMarkedAsFullyPublic<M0 extends RO & { hasCodeBlock: boolean }, M1 extends RO>(
	page: Page<M0, M1>,
	publicTag: string
): boolean {
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

function toFullyPublicPage<M0 extends RO, M1 extends RO>(
	page: Page<M0, M1>,
	hiddenStringValue: string
): PageWithMetadata<M0 & M1, M1> {
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

function toPotentiallyPartiallyPublicPage<M0 extends RO, M1 extends RO>(
	page: Page<M0, M1>, //
	hiddenStringValue: string
): PageWithMetadata<M0 & M1, M1> {
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
