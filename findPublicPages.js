// @ts-check

/* eslint-disable indent */
/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

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
	const pagesWithMetadata = somePages.map((page) => {
		const isThePublicTagPageAndShouldBePublic = (makeThePublicTagPagePublic && titleIsPublicTag(page, publicTag));

		if (isThePublicTagPageAndShouldBePublic || isMarkedAsFullyPublic(page, publicTag)) {
			return toFullyPublicPage(page);
		} else {
			return toPotentiallyPartiallyPublicPage(page);
		}
	});

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const pagesWithParsedChildrenAndMetadata = pagesWithMetadata.map((pageWithMeta) => ({
		...pageWithMeta,
		...("children" in pageWithMeta ? { children: findPublicBlocks(pageWithMeta, pagesWithMetadata) } : {}),
	}));

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const sorted = pagesWithParsedChildrenAndMetadata.sort((A, B) =>
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

	return sorted;
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
		"#" + title,
		"[[" + title + "]]",
		title + "::",
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

function findPublicBlocks(pageWithMeta, pagesWithMetadata) {
	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const partlyPublicPages = somePages
		.filter((p) => !pagesWithMetadata.map((fp) => fp.uid).includes(p.uid))
		// .filter((page) => page && page.children && page.children.length)
		.map((page) => {
			// /**
			//  * should never be true because of previous filter but typechecks
			//  */
			// if (!page.children) {
			// 	return {
			// 		page,
			// 		hasChildren: false,
			// 		hasPublicTag: false,
			// 		isPublicTagInRootBlocks: false,
			// 		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: false,
			// 	};
			// }

			if (!page.children) {
				page.children = [];
			}

			const findMatches = (str, regex) => {
				const matches = [];
				let tmp;

				while ((tmp = regex.exec(str))) {
					matches.push(tmp);
				}

				return matches;
			};

			const findMatchesForMultiple = (str = "", regexes = []) =>
				// TODO what if empty str?
				regexes
					.map((r) => findMatches(str, r))
					.flat()
					.filter((m) => !!m)
					.map((m) => m && m[0]);
			const linkedReferencesMatchers = [
				/#\w+/,
				/\[\[\w+\]\]/ /* /\w+\:\:/ */ /* disabling attributes intentionally, needs work-around to create proper one */,
			];

			const findLinkedReferencesForPage = (p) =>
				findMatchesForMultiple(
					"title" in p ? p.title : "string" in p ? p.string : "",
					linkedReferencesMatchers
				);

			// const matchedLinkedReferencesForPage = findLinkedReferencesForPage(page);

			/** @type { (testee: string) => boolean } */
			const matchAtLeastOne = (testee, matchers = linkedReferencesMatchers) =>
				matchers.some((matcher) => matcher.test(testee));

			/** @type { (page: import("./types").PageOrBlock) => boolean } */
			const doesPageHaveAtLeastOneLinkedReference = (p) =>
				"title" in p ? matchAtLeastOne(p.title) : "string" in p ? matchAtLeastOne(p.string) : false;
			const pageHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(page);
			/** @type { boolean } */
			// //const pageHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(page);
			// const pageHasAtLeastOneLinkedReference = !!matchedLinkedReferencesForPage.length;

			/**
			 * @type { import("./types").PageWithMetadata[] }
			 */
			const potentiallyPublicChildren = page.children.map((c) => {
				/**
				 * remove unknown properties from the `c` to avoid exposing them
				 * in case something changes upstream.
				 *
				 * @type { import("./types").Block }
				 */
				// eslint-disable-next-line no-param-reassign
				c = {
					string: c.string,
					heading: c.heading,
					uid: c.uid,
					children: c.children,
					"create-time": c["create-time"],
					"edit-time": c["edit-time"],
					"edit-email": c["edit-email"],
					"text-align": c["text-align"],
				};

				// const matchedLinkedReferencesForChild = findLinkedReferencesForPage(c);

				const childHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(c);
				/** @type { boolean } */
				// //const childHasAtLeastOneLinkedReference = doesPageHaveAtLeastOneLinkedReference(c);
				// const childHasAtLeastOneLinkedReference = !!matchedLinkedReferencesForChild.length;

				if (c.string.includes(publicTag)) {
					/** boom, do not hide the string or any strings of it's children */

					return {
						page: c,
						hasPublicTag: true,
						isFullyPublic: false,
						isPublicTagInRootBlocks: false,
						hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
						matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
						hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, //  childHasAtLeastOneLinkedReference, // TODO CHILDREN. EDIT NVM NO TODO, NO CHILDREN, ALL GOOD
					};
				} else {
					/**
					 *
					 *
					 * !!! hide the string !!!
					 *
					 *
					 *
					 * TODO find all hashtags, bi-directional references etc.
					 * and prepare them for either staying public,
					 * or replacement w/ hidden values
					 *
					 * (will need another round of parsing to figure out
					 * since we need to go through all pages 1st)
					 *
					 */

					if (c.string === "") {
						// do nothing
					} else if (doNotHideTodoAndDone) {
						if (c.string.includes("{{[[TODO]]}}")) {
							c.string = `{{[[TODO]]}} (${hiddenStringValue}) ${c.uid}`;
						} else if (c.string.includes("{{[[DONE]]}}")) {
							c.string = `{{[[DONE]]}} (${hiddenStringValue}) ${c.uid}`;
						} else {
							c.string = `(${hiddenStringValue}) ${c.uid}`;
						}
					} else {
						c.string = `(${hiddenStringValue}) ${c.uid}`;
					}

					/**
					 * search if any children are public and can be not hidden,
					 * and apply the same hiding mechanism for them too:
					 */
					const ret = findPublicBlocks(c.children, {
						...rest,
						publicTag,
						hiddenStringValue,
						makeThePublicTagPagePublic,
					});

					// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
					// @ts-ignore
					c.children = ret.map((r) => r.page);

					return {
						page: c,
						hasPublicTag: false,
						isFullyPublic: false,
						isPublicTagInRootBlocks: false,
						hasAtLeastOnePublicBlockAnywhereInTheHierarchy: !!ret.filter(
							(cc) => cc.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
						).length,
						matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForChild,
						hasAtLeastOneLinkedReference: childHasAtLeastOneLinkedReference, // childHasAtLeastOneLinkedReference
						// EXPLICITLY DISABLED - CHECK ONLY URSELF
						// || !!ret.find((cc) =>
						//		cc.hasAtLeastOneLinkedReference
						//		cc)
					};
				}
			});

			// @ts-ignore
			page.children = potentiallyPublicChildren.map((c) => c.page);

			const hasAtLeastOnePublicBlockAnywhereInTheHierarchy = !!potentiallyPublicChildren.filter(
				(p) => p.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
			).length;

			/**
			 *
			 * UPDATE: if page is not in `fullyPublicPages`,
			 * it should _always_ be hidden,
			 * just like the children.
			 *
			 */
			// if (!hasAtLeastOnePublicBlockAnywhereInTheHierarchy) {
			if (true) {
				/**
				 * hide the string, same as with the children.
				 */
				if ("title" in page) {
					page.title = `(${hiddenStringValue}) ${page.uid}`;
				}
				if ("string" in page) {
					page.string = `(${hiddenStringValue}) ${page.uid}`;
				}

				if ("title" in page && "string" in page) {
					console.warn("both title and string found in page", page.uid, page.title);
				}
			} else {
				/**
				 * YAY! page will be partly public.
				 *
				 * do __not__ hide the page title,
				 * and the children will be kept partly hidden partly visible,
				 * depending if they (or their parents) had the public attribute.
				 *
				 */
				// nothing extra needs to be done here
			}

			return {
				/**
				 * TODO VERIFY ALL CORRECT
				 */
				page, //
				isFullyPublic: false,
				hasPublicTag: false,
				isPublicTagInRootBlocks: false,
				hasAtLeastOnePublicBlockAnywhereInTheHierarchy,
				matchedLinkedReferences: "TODO RM", // matchedLinkedReferencesForPage,
				hasAtLeastOneLinkedReference: pageHasAtLeastOneLinkedReference,
			};

			// const hasPublicTagOnRootLevelParagraphs = !!page.children.filter((c) => c.string.includes(publicTag))
			// 	.length;

			// if (!recursive) {
			// 	return {
			// 		page, //
			// 		hasPublicTag: hasPublicTagOnRootLevelParagraphs,
			// 		isPublicTagInRootBlocks: isRoot,
			// 	};
			// }

			// if (hasPublicTagOnRootLevelParagraphs) {
			// 	return {
			// 		page, //
			// 		hasPublicTag: true,
			// 		isPublicTagInRootBlocks: isRoot,
			// 	};
			// }

			// /** @type boolean */
			// const doChildrenHavePublicTag = !!findPublicPages(page.children, {
			// 	...rest,
			// 	publicTag, //
			// 	recursive,
			// 	isRoot: false,
			// }).length;

			// return {
			// 	page,
			// 	hasPublicTag: doChildrenHavePublicTag,
			// 	isPublicTagInRootBlocks: false,
			// };
		});
	// .filter((x) => x.hasChildren !== false)
	// .filter((x) => x.hasPublicTag);
}

module.exports = {
	findPublicPages,
	findPublicBlocks,
};
