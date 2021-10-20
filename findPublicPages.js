// @ts-check

/* eslint-disable indent */

const { defaultPublicTag, defaultRecursive, defaultHiddenStringValue } = require("./defaults");

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
		recursive = defaultRecursive,
		hiddenStringValue = defaultHiddenStringValue,
		isRoot = true,
		...rest
	} = {}
) => {
	if (!somePages || !somePages.length) {
		return [];
	}

	somePages = somePages.map((page) =>
		/**
		 * remove unknown properties from the page (same as w/ a block):
		 */
		({
			uid: page.uid,
			string: page.string,
			title: page.title,
			heading: page.heading,
			"create-time": page["create-time"],
			"edit-time": page["edit-time"],
			"edit-email": page["edit-email"],
			"text-align": page["text-align"],
			children: page.children,
		})
	);

	/** TODO maybe only Page and ensure inside `isRoot` (tho not always so unsure) */
	/** @type { import("./types").PageOrBlock[] } */
	const fullyPublicPages = [];

	if (isRoot) {
		console.log({
			publicTag, //
			recursive,
			isRoot,
			...rest,
		});

		for (const page of somePages) {
			const rootLevelParagraphsWithPublicTag =
				page.children && page.children.filter((c) => c.string.includes(publicTag));

			if (!rootLevelParagraphsWithPublicTag || !rootLevelParagraphsWithPublicTag.length) {
				continue;
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
				fullyPublicPages.push(page);
			}
		}
	}

	/**
	 * @type { import("./types").PageWithMetadata[] }
	 */
	const partlyPublicPages = somePages
		.filter((p) => !fullyPublicPages.map((fp) => fp.uid).includes(p.uid))
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

				if (c.string.includes(publicTag)) {
					/** boom, do not hide the string or any strings of it's children */

					return {
						page: c,
						hasPublicTag: true,
						isFullyPublic: false,
						isPublicTagInRootBlocks: false,
						hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
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

					c.string = `(${hiddenStringValue}) ${c.uid}`;

					/**
					 * search if any children are public and can be not hidden,
					 * and apply the same hiding mechanism for them too:
					 */
					const ret = findPublicPages(c.children, {
						...rest,
						publicTag,
						recursive,
						hiddenStringValue,
						isRoot: false,
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
							(pp) => pp.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
						).length,
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

	return [
		...fullyPublicPages.map((page) => ({
			page, //
			hasPublicTag: true,
			isPublicTagInRootBlocks: true,
			isFullyPublic: true,
			hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
		})),
		...partlyPublicPages,
	].sort((A, B) =>
		/** public tag itself first, then public pages, then all other ones */
		"title" in A.page && A.page.title === publicTag
			? -1
			: "title" in B.page && B.page.title === publicTag
			? 1
			: A.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
			? -1
			: B.hasAtLeastOnePublicBlockAnywhereInTheHierarchy
			? 1
			: 0
	);
};

module.exports = {
	findPublicPages,
};
