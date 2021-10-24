// @ts-check

/* eslint-disable indent */
/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

const { findPublicBlocks } = require("./findPublicBlocks");
const { createLinkedReferences } = require("./util");
const {
	defaultPublicTag, //
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
	let latestPages;

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const pagesWithMetadata = somePages.map((page) => {
		const isThePublicTagPageAndShouldBePublic = (makeThePublicTagPagePublic && titleIsPublicTag(page, publicTag));

		if (isThePublicTagPageAndShouldBePublic || isMarkedAsFullyPublic(page, publicTag)) {
			return toFullyPublicPage(page);
		} else {
			return toPotentiallyPartiallyPublicPage(page);
		}
	});
	latestPages = pagesWithMetadata;

	/**
	 * TODO think about how we want to implement the hiding of page title's
	 * if we allow an option to NOT hide them IF at least 1 child anywhere in hierarchy
	 * has the public tag
	 *
	 * will need 2 passes through the hieararchy prolly
	 *
	 */

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const pagesWithHiddenTitlesIfNotFullyPublic = latestPages.map((pageMeta) =>
		pageMeta.isFullyPublic
			? ((pageMeta.isTitleHidden = false), //
			  (pageMeta.originalTitle = pageMeta.page.title),
			  pageMeta)
			: ((pageMeta.isTitleHidden = true), //
			  (pageMeta.originalTitle = pageMeta.page.title),
			  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
			  pageMeta)
	);
	latestPages = pagesWithHiddenTitlesIfNotFullyPublic;

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const pagesWithParsedChildrenAndMetadata = latestPages.map(
		(currentPageWithMeta) => (
			("children" in currentPageWithMeta.page &&
				(currentPageWithMeta.page.children = (currentPageWithMeta.page.children || []).map((block) =>
					findPublicBlocks({
						currentBlock: block, //
						// parentBlock: null,
						rootParentPage: currentPageWithMeta,
						allPagesWithMetadata: latestPages,
						publicTag,
						isParentPublic: currentPageWithMeta.isFullyPublic,
						doNotHideTodoAndDone,
						hiddenStringValue,
					})
				)),
			currentPageWithMeta)
		)
	);
	latestPages = pagesWithParsedChildrenAndMetadata;

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const sorted = latestPages.sort((A, B) =>
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
	latestPages = sorted;

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
 * @returns { import("./types").PageWithMetadata }
 */
function toFullyPublicPage(page) {
	return {
		page, //
		hasPublicTag: true,
		isPublicTagInRootBlocks: true,
		isFullyPublic: true,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
		hasAtLeastOneLinkedReference: true, // TODO, fine for now
	};
}

/**
 * @param { import("./types").Page } page
 * @returns { import("./types").PageWithMetadata }
 */
function toPotentiallyPartiallyPublicPage(page) {
	return {
		page, //
		hasPublicTag: false,
		isPublicTagInRootBlocks: false,
		isFullyPublic: false,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: false, // CHANGEABLE LATER
		hasAtLeastOneLinkedReference: false, // CHANGEABLE LATER
	};
}

module.exports = {
	findPublicPages,
};
