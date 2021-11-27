import { RO, WithMetadata } from "./metadata.d";
import { Page, LinkedReferenceKind } from "./roam.d";

export * from "./metadata.d"; // TODO TS
export * from "./roam.d"; // TODO REMOVE

export type SettingsForPluginFindPublicPages = {
	/**
	 * marks itself (the page) & all it's children blocks public, up until a child block is marked as private.
	 */
	publicGlobalTags: string[];

	/**
	 * marks itself (the current block) & all it's children blocks public, up until a child is marked as private.
	 * DOES break through a previous (even explicit) private mark.
	 */
	publicTags: string[];

	/**
	 * marks only itself (the current block) public, unless itself is also marked as private.
	 * DOES NOT break through a previous (explicit) private mark.
	 */
	publicOnlyTags: string[];

	/**
	 * (explicitly) marks itself (the current block) and it's children private,
	 *
	 * up until a child is marked as public
	 * (as long as that public mark has power to break the previous private mark,
	 * see previous info about the different public tags).
	 *
	 * in general, both pages and blocks are private -- implicitly.
	 * this tag marks them as private explicitly,
	 * and has consequences as described above.
	 *
	 * to mark / "marks" / "marking" a page/block here means that:
	 * the plugin, when processing the graph,
	 * first adds metadata to each page/block that it is public/private & how much,
	 * and later uses this metadata:
	 * 1. to decide -- to hide, or not to hide, the page's title / block's string (i.e. replace it with "(hidden)" or similar),
	 * 2. based on 1., to decide -- to hide, or not to hide, the linked references,
	 *    even if the linked references themselves would be living inside a private page,
	 * 3. to decide the order of exporting - which pages will come first, and which ones last,
	 * 4. to decide if a page will be exported & uploaded at all or not.
	 * 5. etc etc.
	 *
	 * see the source code of the plugin itself to understand better.
	 *
	 */
	privateTag: string; // TODO ARRAY
	/**
	 * TODO DEPRECATE - use the .uid instead! (will work for pages too to avoid merging them lol)
	 * (or keep and concat w/ the .title / .string to make obvious it's hidden)
	 */
	hiddenStringValue: string;
	/**
	 * make the publicTag page itself public
	 */
	makeThePublicTagPagePublic: boolean;

	/**
	 * TODO and DONE are more like boolean toggles to indicate if something's done or not,
	 * and show a visual indicator, thus we have a special case for them
	 */
	doNotHideTodoAndDone: boolean;

	/**
	 * currently blocks', will later apply to pages as well once we implement it properly
	 */
	keepMetadata: boolean;
};

export type PageWithMetadata<M0 extends RO, M1 extends RO> = {
	page: Page<M0, M1>;
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

// type A =

// (
// 	props: RemoveUnknownPropertiesRecursivelyProps
// ) => (block: Block) => Block;

export type WithIsPublic = WithMetadata<{
	isPublic: boolean; //
	isPublicOnly: boolean;
	hasPublicTag: boolean;
	hasPrivateTag: boolean;
}>;
// export type FindPublicBlocks = (props: FindPublicBlocksProps) => (block: Block) => Block;

// TODO TS FIXME
export type LinkedRef<M0 extends RO = RO, M1 extends RO = RO> = {
	metaPage: PageWithMetadata<M0, M1>;
	candidateLR: LinkedReference;
};

export type FindLinkedReferencesProps<M0, M1> = {
	allPagesWithMetadata: PageWithMetadata<M0, M1>[];
	rootParentPage: PageWithMetadata<M0, M1>;
};
export type WithLinkedReferences<M0, M1> = WithIsPublic &
	WithMetadata<{
		linkedReferences: LinkedRef<M0, M1>[];
	}>;

export type HideBlockStringsIfNotPublicProps = {
	doNotHideTodoAndDone: boolean;
	hiddenStringValue: string;
};
