import { Page, LinkedReferenceKind, Block } from "./roam";

export * from "./roam"; // TODO REMOVE

export type SettingsForPluginFindPublicPages = {
	publicTags: string[];
	publicOnlyTags: string[];
	privateTag?: string; // TODO ARRAY
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

export type PageWithMetadata<M extends RO> = {
	page: Page<M>;
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

export type ShouldContinueTraversal = boolean;

// export declare function MutatingActionToTake<
// 	ExistingBlock extends Block, //
// 	ExtraPropertiesForBlock extends Record<any, any>,
// 	Props extends Record<any, any>
// >(
// 	props: Props
// ): (
// 	block: ExistingBlock //
// ) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock; //

// // TODO RM
// export declare function MutatingActionToTake<
// 	ExistingBlock extends Block, //
// 	ExtraPropertiesForBlock extends Record<any, any>
// 	/** no props */
// >(): // props?: never // TODO remove totally?
// (
// 	block: ExistingBlock //
// ) => {} extends ExtraPropertiesForBlock ? ExistingBlock : ExistingBlock & ExtraPropertiesForBlock; //

// export type MutatingAction<
// 	ExistingBlock extends Block, //
// 	ExtraPropertiesForBlock extends Record<any, any>,
// 	Props extends Record<any, any>
// > = (
// 	// ...props: {} extends Props ? [] : [Props] // TODO - conditional optional parameter
// 	props: Props,
// 	parentBlock?: ExistingBlock
// ) => (
// 	block: ExistingBlock //
// ) =>  ExistingBlock & ExtraPropertiesForBlock |
// 	[ExistingBlock & ExtraPropertiesForBlock , ShouldContinueTraversal]

export type RemoveUnknownPropertiesProps = {
	//
};

// TODO RENAME `ReadonlyObject`
export type RO<
	K extends string | number | symbol = string | number | symbol, //
	V = unknown
> = {
	readonly [key in K]: V; // TODO K[key]
};

// TODO REMOVE

export type ToReadonlyObject<O extends {}> = {
	readonly [key in keyof O]: O[key]; //
};

export type WithMetadata<M extends RO = RO> = {
	metadata: M;
};
export type RemoveUnknownProperties = MutatingAction<
	Block, //
	WithMetadata,
	{}
>;

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
