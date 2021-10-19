import { Page, Block, PageOrBlock } from "./roam";

export * from "./roam";

export type FindPublicPagesOptions = {
	publicTag?: string;
	/**
	 * default=false
	 *
	 * if enabled, will search not only the root blocks (bulletpoints) of the page,
	 * but also their children blocks, recursively.
	 *
	 */
	recursive?: boolean;
	isRoot?: boolean;
	/**
	 * TODO DEPRECATE - use the .uid instead! (will work for pages too to avoid merging them lol)
	 * (or keep and concat w/ the .title / .string to make obvious it's hidden)
	 */
	hiddenStringValue?: string;
};

export type PageWithMetadata = {
	page: Page | Block;
	hasPublicTag: boolean;
	isPublicTagInRootBlocks: boolean;
	isFullyPublic: boolean;
};

export type FindPublicPages = (
	somePagesOrBlocks?: PageOrBlock[], //
	options?: FindPublicPagesOptions
) => PageWithMetadata[];
