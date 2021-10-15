import { Page, Block } from "./roam";

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
};

export type PageWithMetadata = {
	page: Page | Block;
	hasPublicTag: boolean;
	isPublicTagInRootBlocks: boolean;
};

export type FindPublicPages = (
	somePagesOrBlocks: (Page | Block)[], //
	options?: FindPublicPagesOptions
) => PageWithMetadata[];
