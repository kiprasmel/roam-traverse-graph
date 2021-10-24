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

export type MutatingActionsToTakeProps = {
	hasPublicTag: boolean;
	isPublic: boolean;
};

export type MutatingActionToExecute<ExtendedBlock> = () => ExtendedBlock;

export type TraverseBlockRecursively<ExtraPropertiesForBlock extends Record<any, any> = Record<any, any>> = (
	block: Block,
	mutatingActionsToTake: MutatingActionToExecute<Block & ExtraPropertiesForBlock>
) => /**
 * TODO CHANGE BACK TO `=> void`
 */
Block & ExtraPropertiesForBlock;

//

export type RemoveUnknownPropertiesRecursivelyProps = {
	block: Block;
};
export type RemoveUnknownPropertiesRecursively = (props: RemoveUnknownPropertiesRecursivelyProps) => Block;

export type FindPublicBlocksProps = {
	block: Block;
	publicTag: string;
	isParentPublic: boolean;

	// parentBlock: Block | null;
	rootParentPage: PageWithMetadata;
	allPagesWithMetadata: PageWithMetadata[];
	doNotHideTodoAndDone: boolean;
	hiddenStringValue: string;
};
export type FindPublicBlocks = (props: FindPublicBlocksProps) => Block;
