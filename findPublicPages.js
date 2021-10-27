// @ts-check

/* eslint-disable indent */

const { traverseBlockRecursively } = require("./traverseBlockRecursively");
const { removeUnknownProperties, markBlockPublic } = require("./findPublicBlocks");
const { findIfPagesHavePublicLinkedReferences } = require("./findLinkedReferencesOfABlock");
const { hideBlockStringsIfNotPublic } = require("./hideBlockStringsIfNotPublic");

const { createLinkedReferences } = require("./util");
const {
	defaultPublicTag, //
	defaultPrivateTag,
	defaultHiddenStringValue,
	defaultMakeThePublicTagPagePublic,
	defaultDoNotHideTodoAndDone,
} = require("./defaults");

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
	{
		/**
		 * TODO: allow providing `oldPublicTagsForDeletion` array to remove the pages
		 */
		publicTag = defaultPublicTag, //
		privateTag = defaultPrivateTag,
		hiddenStringValue = defaultHiddenStringValue,
		makeThePublicTagPagePublic = defaultMakeThePublicTagPagePublic,
		doNotHideTodoAndDone = defaultDoNotHideTodoAndDone,
		...rest
	} = {}
) => {
	if (!somePages || !somePages.length) {
		return [];
	}

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
	// eslint-disable-next-line no-param-reassign
	somePages = somePages.map(keepOnlyKnownPropertiesOfPage);

	console.log({
		publicTag, //
		hiddenStringValue,
		makeThePublicTagPagePublic,
		doNotHideTodoAndDone,
		...rest,
	});

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const latestPages = somePages
		.map((page) => {
			const isThePublicTagPageAndShouldBePublic =
				(makeThePublicTagPagePublic && titleIsPublicTag(page, publicTag));

			if (isThePublicTagPageAndShouldBePublic || isMarkedAsFullyPublic(page, publicTag)) {
				return toFullyPublicPage(page, hiddenStringValue);
			} else {
				return toPotentiallyPartiallyPublicPage(page, hiddenStringValue);
			}
		})

		.map(
			(currentPageWithMeta, _index, currentPagesWithMetadata) => (
				((currentPageWithMeta.page.children = (currentPageWithMeta.page.children || [])
					.map(traverseBlockRecursively(removeUnknownProperties, {}))
					.filter((block) => !!block)
					.map(
						traverseBlockRecursively(
							markBlockPublic, //
							{
								rootParentPage: currentPageWithMeta,
								publicTag,
								privateTag,
							}
						)
					)
					.map(
						traverseBlockRecursively(
							findIfPagesHavePublicLinkedReferences, //
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
								publicTag,
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
					.map(traverseBlockRecursively(() => ({ metadata: _metadata, ...block }) => block, {}))),
				currentPageWithMeta)
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

		.map((p) => ((!p.page.children?.length && delete p.page.children, p)))

		.sort((A, B) =>
			/** public tag itself first, then public pages, then all other ones */
			titleIsPublicTag(A.page, publicTag)
				? -1
				: titleIsPublicTag(B.page, publicTag)
				? 1
				: A.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
				? -1
				: B.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
				? 1
				: 0
		);

	return latestPages;
};

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
	const rootLevelParagraphsWithPublicTag = page.children && page.children.filter((c) => c.string.includes(publicTag));

	if (!rootLevelParagraphsWithPublicTag || !rootLevelParagraphsWithPublicTag.length) {
		return false;
	}

	/** @type { boolean } */
	const doPublicTagParagraphsOnlyWithPublicTagAndWithoutAnyChildrenExist = !!rootLevelParagraphsWithPublicTag
		.filter((c) => !c.children || !c.children.length)

		/**
		 * whole page should be public.
		 *
		 * TODO consider if the block itself should be empty except the publicTag itself
		 * -> probably yes, just for security concerns.
		 *
		 */
		.filter(
			(c) => ("string" in c && c.string.trim() === publicTag)
			// disabled because c is children === Block and block don't have title,
			// it probably doesn't make sense to check Page's title anyway
			/* || ("title" in c && c.title === publicTag) */
		).length;

	if (doPublicTagParagraphsOnlyWithPublicTagAndWithoutAnyChildrenExist) {
		return true;
	}

	return false;
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
