// @ts-check

/* eslint-disable indent */

const { traverseBlockRecursively } = require("./traverseBlockRecursively");
const { removeUnknownProperties, markBlockPublic } = require("./findPublicBlocks");
const { findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions } = require("./findLinkedReferencesOfABlock");
const { hideBlockStringsIfNotPublic } = require("./hideBlockStringsIfNotPublic");

const { parseRoamTraverseGraphSettingsFromRoamPage } = require("./util/parseSettingsFromRoamPage");
const { shallowMergeIncludingArrayValues } = require("./util/shallowMergeIncludingArrayValues");
const { createLinkedReferences } = require("./util");
const defaults = require("./defaults");

/**
 * @type { import("./types").FindPublicPages }
 */
const findPublicPages = (
	/**
	 * TODO consider single vs array
	 *
	 * single here woud seem we'd need to do all the passes
	 * before we can parse the children tho..
	 *
	 */
	somePages = [], //
	optionsOrig = { publicTags: [], publicOnlyTags: [] },
	settingsFromSettingsPage = parseRoamTraverseGraphSettingsFromRoamPage(somePages),
	/**
	 * @type { import("./types").FindPublicPagesOptions }
	 */
	settings = shallowMergeIncludingArrayValues({}, [
		defaults, //
		optionsOrig,
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
) => (
	(console.log({
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

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	((somePages || [])
		.map(keepOnlyKnownPropertiesOfPage)

		.map(
			(page) => (
				(page.children = (page.children || []).map(
					traverseBlockRecursively(() => (block) => ((block.metadata = block.metadata || {}), block), {})
				)),
				page
			)
		)
		.map(
			(page) => (
				(page.children = (page.children || []).map(
					traverseBlockRecursively(
						() => (block) => (
							(block.metadata.hasCodeBlock = !!block?.string?.includes?.("```")), //
							block
						),
						{}
					)
				)),
				page
			)
		)

		.map((page) => {
			const isThePublicTagPageAndShouldBePublic =
				makeThePublicTagPagePublic && publicTags.some((publicTag) => titleIsPublicTag(page, publicTag));

			return isThePublicTagPageAndShouldBePublic || //
				publicTags.some((publicTag) => isMarkedAsFullyPublic(page, publicTag))
				? toFullyPublicPage(page, hiddenStringValue)
				: toPotentiallyPartiallyPublicPage(page, hiddenStringValue);
		})

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
			pageMeta.isFullyPublic || pageMeta.hasAtLeastOnePublicLinkedReference
				? ((pageMeta.isTitleHidden = false), //
				  pageMeta)
				: ((pageMeta.isTitleHidden = true), //
				  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
				  pageMeta)
		)

		.map((p) => (!p.page.children?.length && delete p.page.children, p))

		.sort((A, B) =>
			/** public tag itself first, then public pages, then all other ones */
			publicTags.some((publicTag) => titleIsPublicTag(A.page, publicTag))
				? -1
				: publicTags.some((publicTag) => titleIsPublicTag(B.page, publicTag))
				? 1
				: A.linkedMentions && B.linkedMentions
				? B.linkedMentions.length - A.linkedMentions.length
				: A.linkedMentions
				? -1
				: B.linkedMentions
				? 1
				: A.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
				? -1
				: B.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
				? 1
				: 0
		)))
);

/**
 * security et al -- in case upstream adds something potentially private
 * and we don't immediately update to remove it (very plausible)
 *
 * @param { import("./types").Page | Record<any, any> } page
 * @return { import("./types").Page } page
 */
function keepOnlyKnownPropertiesOfPage(page) {
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

/**
 * @param { import("./types").Page } page
 * @param { string } publicTag
 * @returns { boolean }
 */
function titleIsPublicTag(page, publicTag) {
	if (!page.title) {
		return false;
	}

	const { title } = page;

	return !![
		title, //
		...createLinkedReferences(title).map((lr) => lr.fullStr),
	].includes(publicTag);
}

/**
 * @param { import("./types").Page } page
 * @param { string } publicTag
 * @returns { boolean }
 */
function isMarkedAsFullyPublic(page, publicTag) {
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

/**
 * @param { import("./types").Page } page
 * @param { string } hiddenStringValue
 * @returns { import("./types").PageWithMetadata }
 */
function toFullyPublicPage(page, hiddenStringValue) {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: true,
		isPublicTagInRootBlocks: true,
		isFullyPublic: true,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
		hasAtLeastOnePublicLinkedReference: false, // until found out otherwise
	};
}

/**
 * @param { import("./types").Page } page
 * @param { string } hiddenStringValue
 * @returns { import("./types").PageWithMetadata }
 */
function toPotentiallyPartiallyPublicPage(page, hiddenStringValue) {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: false,
		isPublicTagInRootBlocks: false,
		isFullyPublic: false,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: false, // CHANGEABLE LATER
		hasAtLeastOnePublicLinkedReference: false, // CHANGEABLE LATER
	};
}

module.exports = {
	findPublicPages,
};
