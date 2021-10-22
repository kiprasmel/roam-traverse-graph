import { PageOrBlock } from "./roam";

export * from "./roam";

export type FindPublicPagesOptions = {
	publicTag?: string;
	isRoot?: boolean;
	/**
	 * TODO DEPRECATE - use the .uid instead! (will work for pages too to avoid merging them lol)
	 * (or keep and concat w/ the .title / .string to make obvious it's hidden)
	 */
	hiddenStringValue?: string;
	/**
	 * make the publicTag page itself public
	 */
	makeThePublicTagPagePublic?: boolean;

	/**
	 * TODO and DONE are more like boolean toggles to indicate if something's done or not,
	 * and show a visual indicator, thus we have a special case for them
	 */
	doNotHideTodoAndDone?: boolean;
};

export type PageWithMetadata = {
	page: PageOrBlock;
	hasPublicTag: boolean;
	isPublicTagInRootBlocks: boolean;
	isFullyPublic: boolean;
	hasAtLeastOnePublicBlockAnywhereInTheHierarchy: boolean;
	hasAtLeastOneLinkedReference: boolean;
};

export type FindPublicPages = (
	somePagesOrBlocks?: PageOrBlock[], //
	options?: FindPublicPagesOptions
) => PageWithMetadata[];
