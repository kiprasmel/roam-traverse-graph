#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { traverseBlockRecursively } from "../traverseBlockRecursively";
import { removeUnknownProperties, markBlockPublic } from "./findPublicBlocks";
import { findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions } from "./findLinkedReferencesOfABlock";
import { hideBlockStringsIfNotPublic } from "./hideBlockStringsIfNotPublic";
import { parseRoamTraverseGraphSettingsFromRoamPage } from "./parseSettingsFromRoamPage"; // TODO FIXME
import { shallowMergeIncludingArrayValues } from "../util/shallowMergeIncludingArrayValues";
import { blockStringHasCode } from "../util/blockContainsCode";
import { sortUntilFirstXORMatchUsing, Order } from "../util/sortUntilFirstXORMatch";

import {
	Page, //
	PageWithMetadata,
	RO,
	Block,
	LinkedRef,
} from "../types";

import { withMetadata } from "../util/withMetadata";
import { parseASTFromBlockString } from "./parseASTFromBlockString";

export type SettingsForPluginFindPublicPages = {
	/**
	 * marks itself (the page) & all it's children blocks public, up until a child block is marked as private.
	 */
	publicGlobalTags: string[];

	/**
	 * marks itself (the current block) & all it's children blocks public, up until a child is marked as private.
	 * DOES break through a previous (even explicit) private mark.
	 */
	publicTags: string[];

	/**
	 * marks only itself (the current block) public, unless itself is also marked as private.
	 * DOES NOT break through a previous (explicit) private mark.
	 */
	publicOnlyTags: string[];

	/**
	 * (explicitly) marks itself (the current block) and it's children private,
	 *
	 * up until a child is marked as public
	 * (as long as that public mark has power to break the previous private mark,
	 * see previous info about the different public tags).
	 *
	 * in general, both pages and blocks are private -- implicitly.
	 * this tag marks them as private explicitly,
	 * and has consequences as described above.
	 *
	 * to mark / "marks" / "marking" a page/block here means that:
	 * the plugin, when processing the graph,
	 * first adds metadata to each page/block that it is public/private & how much,
	 * and later uses this metadata:
	 * 1. to decide -- to hide, or not to hide, the page's title / block's string (i.e. replace it with "(hidden)" or similar),
	 * 2. based on 1., to decide -- to hide, or not to hide, the linked references,
	 *    even if the linked references themselves would be living inside a private page,
	 * 3. to decide the order of exporting - which pages will come first, and which ones last,
	 * 4. to decide if a page will be exported & uploaded at all or not.
	 * 5. etc etc.
	 *
	 * see the source code of the plugin itself to understand better.
	 *
	 */
	privateTag: string; // TODO ARRAY
	/**
	 * TODO DEPRECATE - use the .uid instead! (will work for pages too to avoid merging them lol)
	 * (or keep and concat w/ the .title / .string to make obvious it's hidden)
	 */
	hiddenStringValue: string;
	/**
	 * make the publicTag page itself public
	 */
	makeThePublicTagPagePublic: boolean;

	/**
	 * TODO and DONE are more like boolean toggles to indicate if something's done or not,
	 * and show a visual indicator, thus we have a special case for them
	 */
	doNotHideTodoAndDone: boolean;

	/**
	 * currently blocks', will later apply to pages as well once we implement it properly
	 */
	keepMetadata: boolean;
};

export const getDefaultSettingsForPluginFindPublicPages = (): SettingsForPluginFindPublicPages => ({
	publicGlobalTags: [],
	publicTags: ["#public"],
	publicOnlyTags: [],
	privateTag: "#private", // TODO array
	hiddenStringValue: "hidden",
	makeThePublicTagPagePublic: false,
	doNotHideTodoAndDone: true,
	keepMetadata: false,
});

export const defaultRoamSettingsPageTitle = "roam-traverse-graph-settings" as const;

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

/**
 * TODO RENAME `assignChildren` (tho doesn't assign, but changes children ~~ nvm, all good) or similar
 */
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

export type ContributesBlockMetadata = {
	depth: number;
	originalString: string;
	/**
	 * TODO document all
	 */
};

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
		getDefaultSettingsForPluginFindPublicPages(),
		[
			optionsOrig, //
			settingsFromSettingsPage,
		]
	),
	{
		doNotHideTodoAndDone,
		hiddenStringValue,
		keepMetadata,
		privateTag,
		publicGlobalTags,
		publicOnlyTags,
		publicTags,
	} = settings
	// ): PageWithMetadata<M0 & M1>[] => ( // TODO FIXME
	// ): PageWithMetadata<M0, MFinal>[] => ( // TODO FIXME // TODO FIXME
): PageWithMetadata<M0, ContributesBlockMetadata>[] => (
	console.log({
		defaultOptions: getDefaultSettingsForPluginFindPublicPages(),
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
			pageWithNewChildren<M0, { originalString: string }>(
				traverseBlockRecursively<{}, { originalString: string }>(
					() => (block) =>
						withMetadata({
							originalString: block.string,
						})(block),
					{}
				)(undefined)
			)
		)

		.map(
			pageWithNewChildren<M0, { parentBlockRef?: Block<M0, {}> }>(
				traverseBlockRecursively(
					// traverseBlockRecursively<{}>(
					() => (block, parentBlockRef) =>
						withMetadata({
							parentBlockRef: parentBlockRef,
						})(block),
					{}
				)(undefined)
			)
		)

		.map(
			pageWithNewChildren<M0, { depth: number }>(
				traverseBlockRecursively<{}, { depth: number }>(
					// traverseBlockRecursively<{}>(
					() => (block, _parentBlockRef, depth) =>
						withMetadata({
							depth,
						})(block),
					{}
				)(undefined)
			)
		)

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
		.map((page) =>
			publicGlobalTags.some((tag) => isMarkedAsFullyPublic(page, tag))
				? toFullyPublicPage(page, hiddenStringValue)
				: toPotentiallyPartiallyPublicPage(page, hiddenStringValue)
		)
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

		/** BEGIN word & char counts */
		.map(
			(pageMeta) => (
				(pageMeta.page.children = (pageMeta.page.children || [])
					.map(
						traverseBlockRecursively<
							{},
							{
								wordCountSelf: number; //
								wordCountChildrenRecursively: number;
							}
						>(
							() => (block) =>
								withMetadata({
									wordCountSelf: block.string.split(" ").filter((str) => !!str.trim()).length,
									wordCountChildrenRecursively: 0,
								})(block), // TODO
							{}
						)(undefined)
					)
					.map(
						traverseBlockRecursively(
							() => (block: any) => {
								const isLeafBlock = block.metadata.parentBlockRef && !block.children?.length;

								if (!isLeafBlock) {
									return block;
								}

								let tmpBlock = block;
								let parentBlock = tmpBlock.metadata.parentBlockRef;

								while (parentBlock) {
									parentBlock.metadata.wordCountChildrenRecursively +=
										tmpBlock.metadata.wordCountSelf +
										tmpBlock.metadata.wordCountChildrenRecursively;

									const lastChildOfParent = parentBlock.children[parentBlock.children.length - 1];
									const currentBlockIsLastChild = tmpBlock === lastChildOfParent;

									if (!currentBlockIsLastChild) {
										// break;
										return block;
									}

									tmpBlock = parentBlock;
									parentBlock = tmpBlock?.metadata.parentBlockRef;
								}

								// console.log({ isLeafBlock, string: block.string, tmpBlock: tmpBlock.metadata });

								return block;
							},
							{}
						)(undefined)
					)),
				pageMeta
			)
		)

		.map(
			(pageMeta) => (
				(pageMeta.wordCount = (pageMeta.page.children || [])
					.map(
						(child) =>
							(child.metadata as any).wordCountSelf + (child.metadata as any).wordCountChildrenRecursively
					) // TODO TS
					.reduce((accum, current) => accum + current, 0)),
				pageMeta
			)
		)
		/** END word & char counts */

		/**
		 * TODO think about how we want to implement the hiding of page title's
		 * if we allow an option to NOT hide them IF at least 1 child anywhere in hierarchy
		 * has the public tag
		 *
		 * will need 2 passes through the hieararchy prolly
		 *
		 */
		.map((pageMeta) =>
			pageMeta.isFullyPublic ||
			(pageMeta as any).isDailyNotesPage || // TODO TS
			(doNotHideTodoAndDone && ["TODO", "DONE"].includes(pageMeta.originalTitle))
				? ((pageMeta.isTitleHidden = false), //
				  pageMeta)
				: ((pageMeta.isTitleHidden = true), //
				  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
				  pageMeta)
		)

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

					// .map(traverseBlockRecursively(() => (block) => withMetadata({})(block), {})(undefined))
					.map(traverseBlockRecursively(parseASTFromBlockString, {})(undefined))
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

		/** END extra wordCounts (for linkedMentions & total) */
		.map(
			(pageMeta) => (
				(pageMeta.wordCountOfLinkedMentions = (pageMeta.linkedMentions || [])
					.map(
						({ blockRef: child }) =>
							(child.metadata as any).wordCountSelf + (child.metadata as any).wordCountChildrenRecursively
					) // TODO TS
					.reduce((accum, current) => accum + current, 0)),
				(pageMeta.wordCountTotal = pageMeta.wordCount + pageMeta.wordCountOfLinkedMentions),
				pageMeta
			)
		)
		/** END extra wordCounts (for linkedMentions & total) */

		.map((p) => (!p.page.children?.length && delete p.page.children, p))

		/**
		 * TODO automatic forwarding of `_a, _b` in `sortUntilFirstXORMatchUsing`
		 */
		.sort((_a, _b) =>
			sortUntilFirstXORMatchUsing<PageWithMetadata<{}, {}>>(
				[
					(AB): boolean =>
						AB.isFullyPublic &&
						/**
						 * TODO isTerm logic
						 */
						[...new Set((AB.linkedMentions || []).map((ref) => ref.uidOfPageContainingBlock))].length > 2,
					(AB): boolean => doNotHideTodoAndDone && ["TODO", "DONE"].includes(AB.originalTitle),
					//
					(AB): boolean => !!AB.isDailyNotesPage && new Date(AB.page.uid) <= new Date(),
					(A, B): number =>
						A.isDailyNotesPage && B?.isDailyNotesPage
							? /**
							   * using the page's `create-time` is not reliable (for an expected outcome),
							   * because a daily notes page can get created earlier
							   * if you reference it (e.g. /tomorrow or /date etc.).
							   *
							   * thus the previous implementation is obsolete:
							   *
							   * ```js
							   * (B.page["create-time"] || -Infinity) - (A.page["create-time"] || -Infinity) || Order.EVEN
							   * ```
							   *
							   * and the new one uses the `uid` of the page,
							   * since it's a valid date and will work as expected.
							   *
							   */
							  new Date(B.page.uid).getTime() - new Date(A.page.uid).getTime()
							: /**
							   * TODO isTerm right next to the daily notes page
							   */
							  // : // sortUntilFirstXORMatchUsing([(AA, BB): number => 1] as const)(_a, _b),
							  // /**
							  //  * TODO function to do vice-versa as well
							  //  * (A, B) => O1 : O2
							  //  * (B, A) => O2 : O1
							  //  *   : O.EVEN
							  //  */
							  // A.isFullyPublic && B?.isDailyNotesPage
							  // ? new Date(A.page["create-time"] || -Infinity).getDay() === new Date(B.page.uid).getDay()
							  // 	? Order.AHEAD
							  // 	: Order.BEHIND
							  // : // : Order.EVEN,
							  // B?.isFullyPublic && A?.isDailyNotesPage
							  // ? new Date(A.page["create-time"] || -Infinity).getDay() === new Date(B.page.uid).getDay()
							  // 	? Order.BEHIND
							  // 	: Order.AHEAD
							  Order.EVEN,

					(AB): boolean => !!AB.linkedMentions?.length,
					(A, B): number => (B?.linkedMentions?.length || 0) - (A.linkedMentions?.length || 0),
					(AB): boolean => AB.hasAtLeastOnePublicBlockAnywhereInTheHierarchy,
					(A, B): number => (B?.wordCount || -Infinity) - A.wordCount,
				],
				{ log: false }
			)(_a, _b)
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
		wordCount: 0,
		wordCountOfLinkedMentions: 0,
		wordCountTotal: 0,
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
		wordCount: 0,
		wordCountOfLinkedMentions: 0,
		wordCountTotal: 0,
	};
}
