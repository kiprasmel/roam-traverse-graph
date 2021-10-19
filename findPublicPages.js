// @ts-check

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

			const doPublicTagParagraphsOnlyWithPublicTagAndWithoutAnyChildrenExist = rootLevelParagraphsWithPublicTag
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
				);

			if (doPublicTagParagraphsOnlyWithPublicTagAndWithoutAnyChildrenExist.length) {
				fullyPublicPages.push(page);
			}
		}
	}

	const partlyPublicPages = somePages
		.filter((p) => !fullyPublicPages.map((fp) => fp.uid).includes(p.uid))
		.filter((page) => page && page.children && page.children.length)
		.map((page) => {
			/**
			 * should never be true because of previous filter but typechecks
			 */
			if (!page.children) {
				return {
					page,
					hasChildren: false,
					hasPublicTag: false,
					isPublicTagInRootBlocks: false,
				};
			}

			page.children
				.map((c) => {
					if (c.string.includes(publicTag)) {
						/** boom, do not hide the string or any strings of it's children */
						return [c];
					} else {
						/** hide the string */
						// c.string = hiddenStringValue;
						c.string = c.uid;

						/** search if any children are public and can be not hidden: */
						return findPublicPages(c.children, {
							...rest,
							publicTag,
							recursive,
							hiddenStringValue,
							isRoot: false,
						});
					}
				})
				.flat();

			const hasPublicTagOnRootLevelParagraphs = !!page.children.filter((c) => c.string.includes(publicTag))
				.length;

			if (!recursive) {
				return {
					page, //
					hasPublicTag: hasPublicTagOnRootLevelParagraphs,
					isPublicTagInRootBlocks: isRoot,
				};
			}

			if (hasPublicTagOnRootLevelParagraphs) {
				return {
					page, //
					hasPublicTag: true,
					isPublicTagInRootBlocks: isRoot,
				};
			}

			/** @type boolean */
			const doChildrenHavePublicTag = !!findPublicPages(page.children, {
				...rest,
				publicTag, //
				recursive,
				isRoot: false,
			}).length;

			return {
				page,
				hasPublicTag: doChildrenHavePublicTag,
				isPublicTagInRootBlocks: false,
			};
		})
		.filter((x) => x.hasChildren !== false)
		.filter((x) => x.hasPublicTag);

	return [
		...fullyPublicPages.map((page) => ({
			page, //
			hasPublicTag: true,
			isPublicTagInRootBlocks: true,
			isFullyPublic: true,
		})),
		...partlyPublicPages.map((page) => ({
			...page, //
			isFullyPublic: false,
		})),
	];
};

module.exports = {
	findPublicPages,
};
