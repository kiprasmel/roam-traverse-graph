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

// declare function MutatingActionToExecuteNoProps<
// 	Props extends {} | never = {} | never, //
// 	ExtendedBlock extends Block = Block,
// 	ExtraPropertiesForBlock extends Record<any, any> = Record<any, any>
// >(
// 	props: {} extends Props ? never : Props //
// ): (
// 	block: ExtendedBlock //
// ) => ExtendedBlock & ExtraPropertiesForBlock;

// > = {} extends Props
// 	? () => /*       */ (block: ExtendedBlock) => ExtendedBlock & ExtraPropertiesForBlock
// 	: (props: Props) => (block: ExtendedBlock) => ExtendedBlock & ExtraPropertiesForBlock;

export declare function MutatingActionToTake<
	ExistingBlock extends Block, //
	ExtraPropertiesForBlock extends Record<any, any>,
	Props extends Record<any, any>
>(
	props: Props
): (
	block: ExistingBlock //
) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock; //

export declare function MutatingActionToTake<
	ExistingBlock extends Block, //
	ExtraPropertiesForBlock extends Record<any, any>
	/** no props */
>(): // props?: never // TODO remove totally?
(
	block: ExistingBlock //
) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock; //

export type MutatingAction<
	ExistingBlock extends Block, //
	ExtraPropertiesForBlock extends Record<any, any>,
	Props extends Record<any, any> | never
> = typeof MutatingActionToTake;

// export declare function TraverseBlockRecursively<
export type TraverseBlockRecursively<
	ExistingBlock extends Block = Block, //
	ExtraPropertiesForBlock extends Record<any, any> = {}, //
	Props extends Record<any, any> | never = Record<any, any> | never
	// MutationActionsToTakeWithProps extends MutatingActionToExecute<
	// 	Props,
	// 	ExtendedBlock,
	// 	ExtraPropertiesForBlock
	// > = MutatingActionToExecute<
	// 	Props,
	// 	ExtendedBlock, //
	// 	ExtraPropertiesForBlock
	// >
> = (
	mutatingActionToTake: typeof MutatingActionToTake,
	// mutatingActionToTake: MutatingAction<ExistingBlock, ExtraPropertiesForBlock, Props>,

	// mutatingActionToTake: (
	// 	props: Props //
	// ) => (
	// 	block: ExistingBlock //
	// ) => ExistingBlock & ExtraPropertiesForBlock, //
	propsForMutatingAction: Props
) => (
	block: ExistingBlock //
) => ExistingBlock & ExtraPropertiesForBlock;

// export declare function TraverseBlockRecursively<
// 	ExistingBlock extends Block = Block, //
// 	ExtraPropertiesForBlock extends Record<any, any> = {} //
// 	// MutationActionsToTakeWithProps extends MutatingActionToExecute<
// 	// 	Props,
// 	// 	ExtendedBlock,
// 	// 	ExtraPropertiesForBlock
// 	// > = MutatingActionToExecute<
// 	// 	Props,
// 	// 	ExtendedBlock, //
// 	// 	ExtraPropertiesForBlock
// 	// >
// >(
// 	mutatingActionToTake: typeof MutatingActionToTake,
// 	// mutatingActionToTake: MutatingAction<ExistingBlock, ExtraPropertiesForBlock>,

// 	// mutatingActionToTake: (
// 	// 	props?: {} | never //
// 	// ) => (
// 	// 	block: ExistingBlock //
// 	// ) => ExistingBlock & ExtraPropertiesForBlock, //
// 	propsForMutatingAction?: never
// ): (
// 	block: ExistingBlock //
// ) => ExistingBlock & ExtraPropertiesForBlock;

// > = {} extends Props
// 	? (
// 			mutatingActionToTake: MutationActionsToTakeWithProps //
// 	  ) => (block: Block) => Block & ExtraPropertiesForBlock
// 	: (
// 			mutatingActionToTake: MutationActionsToTakeWithProps, //
// 			propsForMutatingAction: Props // extends Record<any, any> | {} = {},
// 	  ) => (block: Block) => Block & ExtraPropertiesForBlock;

//

export type RemoveUnknownPropertiesProps = {
	//
};
export type RemoveUnknownProperties = MutatingAction<
	Block, //
	{},
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
