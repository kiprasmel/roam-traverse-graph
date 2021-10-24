import { Page, LinkedReferenceKind, Block } from "./roam";

export * from "./roam";

export type FindPublicPagesOptions = {
	publicTag?: string;
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
	page: Page;
	hasPublicTag: boolean;
	isPublicTagInRootBlocks: boolean;
	isFullyPublic: boolean;
	hasAtLeastOnePublicBlockAnywhereInTheHierarchy: boolean;
	hasAtLeastOneLinkedReference: boolean;

	//
	isTitleHidden?: boolean;
	originalTitle?: string;
};

export type FindPublicPages = (
	pages: Page[], //
	options?: FindPublicPagesOptions
) => PageWithMetadata[];

export type LinkedReference = {
	origStr: string;
	fullStr: string; //
	kind: LinkedReferenceKind;
	create: (newStr: string) => string;
};

export type TraverseBlockProps = {
	currentBlock: Block /** uses */;

	publicTag: string /** uses */;

	isParentPublic: boolean /** uses */;
};

export type MutatingActionsToTakeProps = {
	hasPublicTag: boolean;
	isPublic: boolean;
};

export type MutatingActionToExecute = (props: MutatingActionsToTakeProps) => void;

export type TraverseBlockRecursively = (
	props: TraverseBlockProps,
	mutatingActionsToTake: MutatingActionToExecute
) => /**
 * TODO CHANGE BACK TO `=> void`
 */
Block;

export type FindPublicBlocksProps = TraverseBlockProps & {
	// parentBlock: Block | null;
	rootParentPage: PageWithMetadata;
	allPagesWithMetadata: PageWithMetadata[];
	doNotHideTodoAndDone: boolean;
	hiddenStringValue: string;
};

export type FindPublicBlocks = (props: FindPublicBlocksProps) => Block;
