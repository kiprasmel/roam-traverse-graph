import { Page, LinkedReferenceKind, Block } from "./roam";

export * from "./roam";

export type FindPublicPagesOptions = {
	publicTag?: string;
	privateTag?: string;
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
	hasAtLeastOnePublicLinkedReference: boolean;

	//
	isTitleHidden?: boolean;
	originalTitle: string;
	hiddenTitle: string;
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

// export type MutatingAction<
// 	ExistingBlock extends Block, //
// 	ExtraPropertiesForBlock extends Record<any, any>,
// 	Props extends Record<any, any> | never
// > = typeof MutatingActionToTake;

// export type MutatingAction<
// 	ExistingBlock extends Block, //
// 	ExtraPropertiesForBlock extends Record<any, any>,
// 	Props extends Record<any, any>
// > = Props extends {}
// 	? (
// 			props?: {} | never
// 	  ) => (
// 			block: ExistingBlock //
// 	  ) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock
// 	: (
// 			props: Props
// 	  ) => (
// 			block: ExistingBlock //
// 	  ) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock;

export type MutatingAction<
	ExistingBlock extends Block, //
	ExtraPropertiesForBlock extends Record<any, any>,
	Props extends Record<any, any>
> = (
	// ...props: {} extends Props ? [] : [Props] // TODO - conditional optional parameter
	props: Props,
	parentBlock?: ExistingBlock
) => (
	block: ExistingBlock //
) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock;

// export declare function TraverseBlockRecursively<
export type TraverseBlockRecursively =
	// 	Props,
	// 	ExtendedBlock,
	// 	ExtraPropertiesForBlock
	// > = MutatingActionToExecute<
	// 	Props,
	// 	ExtendedBlock, //
	// 	ExtraPropertiesForBlock
	// >
	<Props, ExistingBlock extends Block, ExtraPropertiesForBlock extends Record<any, any>>(
		mutatingActionToTake: MutatingAction<ExistingBlock, ExtraPropertiesForBlock, Props>,
		// mutatingActionToTake: typeof MutatingActionToTake,
		// mutatingActionToTake: MutatingAction<ExistingBlock, ExtraPropertiesForBlock, Props>,

		// mutatingActionToTake: (
		// 	props: Props //
		// ) => (
		// 	block: ExistingBlock //
		// ) => ExistingBlock & ExtraPropertiesForBlock, //
		initialAndNonChangingPropsForMutatingAction: Props,
		previousBlock?: ExistingBlock
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
export type WithMetadata<M extends {} = {}> = {
	metadata: M;
};
export type RemoveUnknownProperties = MutatingAction<
	Block, //
	WithMetadata,
	{}
>;

export type WithMeta = <M, B extends Block & WithMetadata<M>, K extends string | number | symbol = any, V = any>(
	block: B,
	key: K,
	value: V
) => { block: B } & WithMetadata<{ [key in K]: V }>;

// (
// 	props: RemoveUnknownPropertiesRecursivelyProps
// ) => (block: Block) => Block;

export type FindPublicBlocksProps = {
	publicTag: string;
	privateTag: string;

	// parentBlock: Block | null;
	rootParentPage: PageWithMetadata;
};
export type WithIsPublic = WithMetadata<{
	isPublic: boolean; //
	hasPublicTag: boolean;
	hasPrivateTag: boolean;
}>;
// export type FindPublicBlocks = (props: FindPublicBlocksProps) => (block: Block) => Block;
export type FindPublicBlocks = MutatingAction<
	Block & WithMetadata, //
	WithIsPublic,
	FindPublicBlocksProps
>;

export type LinkedRef = {
	metaPage: import("./types").PageWithMetadata;
	candidateLR: import("./types").LinkedReference;
};

export type FindLinkedReferencesProps = {
	allPagesWithMetadata: PageWithMetadata[];
};
export type WithLinkedReferences = WithIsPublic &
	WithMetadata<{
		linkedReferences: LinkedRef[];
	}>;
export type FindLinkedReferences = MutatingAction<
	Block & WithIsPublic,
	WithLinkedReferences,
	FindLinkedReferencesProps
>;

export type HideBlockStringsIfNotPublicProps = {
	doNotHideTodoAndDone: boolean;
	hiddenStringValue: string;
};
export type HideBlockStringsIfNotPublic = MutatingAction<
	Block & WithIsPublic & WithLinkedReferences,
	{},
	HideBlockStringsIfNotPublicProps
>;
