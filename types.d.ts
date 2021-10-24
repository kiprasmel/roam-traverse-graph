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

export type MutatingActionToExecute<Block, ExtraPropertiesForBlock> = (block: Block) => Block | ExtraPropertiesForBlock;

export type MutatingActionToExecuteWithProps<Props, Block, ExtraPropertiesForBlock = never> = {} extends Props
	? () => /** no props */
	  /** TODO: OR or AND (note how changes `never`) */
	  MutatingActionToExecute<Block, ExtraPropertiesForBlock>
	: (
			props: Props /** yes props */
	  ) => /** TODO: OR or AND (note how changes `never`) */
	  MutatingActionToExecute<Block, ExtraPropertiesForBlock>;

export type TraverseBlockRecursively<
	ExtraPropertiesForBlock extends Record<any, any> = Record<any, any>, //
	Props = {}, // Record<any, any>,
	MutationActionsToTakeWithProps extends MutatingActionToExecuteWithProps<
		Props,
		Block,
		ExtraPropertiesForBlock
	> = MutatingActionToExecuteWithProps<
		Props,
		Block, //
		ExtraPropertiesForBlock
	>
> = {} extends Props
	? (
			mutatingActionsToTake: MutationActionsToTakeWithProps //
	  ) => (block: Block) => Block & ExtraPropertiesForBlock
	: (
			mutatingActionsToTake: MutationActionsToTakeWithProps, //
			props: Props // extends Record<any, any> | {} = {},
	  ) => (block: Block) => Block & ExtraPropertiesForBlock;

//

export type RemoveUnknownPropertiesProps = {
	//
};
export type RemoveUnknownProperties = MutatingActionToExecute<
	Block, //
	{}
>;

// (
// 	props: RemoveUnknownPropertiesRecursivelyProps
// ) => (block: Block) => Block;

export type FindPublicBlocksProps = {
	publicTag: string;
	isParentPublic: boolean;

	// parentBlock: Block | null;
	rootParentPage: PageWithMetadata;
	allPagesWithMetadata: PageWithMetadata[];
	doNotHideTodoAndDone: boolean;
	hiddenStringValue: string;
};
export type FindPublicBlocks = (props: FindPublicBlocksProps) => (block: Block) => Block;
