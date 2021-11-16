// import { Merge } from "type-fest";
import { Assign } from "utility-types";

import { Page, LinkedReferenceKind, Block } from "./roam";

export * from "./roam";

export type FindPublicPagesOptions = {
	publicTags: string[];
	publicOnlyTags: string[];
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

	/**
	 * currently blocks', will later apply to pages as well once we implement it properly
	 */
	keepMetadata?: boolean;
};

export type PageWithMetadata = {
	page: Page;
	hasPublicTag: boolean;
	isPublicTagInRootBlocks: boolean;
	isFullyPublic: boolean;
	hasAtLeastOnePublicBlockAnywhereInTheHierarchy: boolean;
	hasAtLeastOnePublicLinkedReference: boolean;
	/**
	 * when a block links to a public linked reference
	 */
	hasAtLeastOneMentionOfAPublicLinkedReference: boolean;

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

export type ShouldContinueTraversal = boolean;

export declare function MutatingActionToTake<
	ExistingBlock extends Block, //
	ExtraPropertiesForBlock extends Record<any, any>,
	Props extends Record<any, any>
>(
	props: Props
): (
	block: ExistingBlock //
) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock; //

// TODO RM
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
) =>  ExistingBlock & ExtraPropertiesForBlock |
	[ExistingBlock & ExtraPropertiesForBlock , ShouldContinueTraversal]

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

type KV = { [key: string]: unknown }

// // export type WithMeta <X = any, B extends Block & WithMetadata<X> = Block & WithMetadata<X>, Y = any, M extends WithMetadata<Y> = WithMetadata<Y>> = (
// export type WithMeta <X extends KV = {}, B extends Block | Block & WithMetadata<X> = Block | Block & WithMetadata<X>, K extends string  = string, V = any> = (
// 	block: B,
// 	key: K,
// 	value: V,
// // ) => Merge<B, { metadata: M }>;
// // ) => B & { metadata: {[Key in K]: V} }
// ) => Merge<B, { metadata: {[Key in K]: V} }>

// export type WithMeta <X extends KV = {}, B extends Block | Block & WithMetadata<X> = Block | Block & WithMetadata<X>, K extends string  = string, V = any> = (
// export type WithMeta <X extends KV = {}, B extends Block | Block & WithMetadata<X> = Block | Block & WithMetadata<X>, _M = readonly {}> = <M extends _M>(
export type WithMeta 
<
	X extends Record<any, any> = {}, //
	// B extends Block | (Block & WithMetadata<X>) = Block | (Block & WithMetadata<X>),
	B extends (Block & WithMetadata<X>) = (Block & WithMetadata<X>),
	M extends {} = {},
>

	=

// <
// 	M = any,
// > 
// <	
// >
(
	block: B,
	// meta: {[Key in K]: V}
	// meta: Record<any, any>
	// meta: _M extends KV ? KV extends M ? _M : never : never,
	// meta: Record<any, any>
	meta: M
	// meta: any,

// ) => typeof meta extends KV ? Merge<B, { metadata: typeof meta }> : never
// ) => B & { metadata: M }
// ) => Merge<B , { metadata: M }>
// ) => Assign<B, { metadata: typeof meta }>
// ) => B & { metadata: typeof meta }

// ) => typeof meta extends { [key in infer K]: infer V } ? B & { metadata: { [key in K]: V } }:  never;
// ) => typeof meta extends { } ? B & { metadata: typeof meta  }:  never;
) => B & { metadata: Assign<B["metadata"], M> }


// type A = 

// (
// 	props: RemoveUnknownPropertiesRecursivelyProps
// ) => (block: Block) => Block;

export type FindPublicBlocksProps = {
	publicTags: string[];
	publicOnlyTags: string[];
	privateTag: string;

	// parentBlock: Block | null;
	rootParentPage: PageWithMetadata;
};
export type WithIsPublic = WithMetadata<{
	isPublic: boolean; //
	isPublicOnly: boolean;
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
	rootParentPage: PageWithMetadata;
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
