import { RO, WithMetadata } from "./metadata.d";
import { Page, LinkedReferenceKind, Block } from "./roam.d";

import {
	// StackTreeBoundaryItem, //
	StackTreeTextItem,
} from "./plugin-export-public-pages/parseASTFromBlockString";

export * from "./metadata.d"; // TODO TS
export * from "./roam.d"; // TODO REMOVE

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

	isDailyNotesPage?: boolean;

	linkedMentions?: LinkedMention<M0, M1>[];
	linkedReferencesFromChildren?: LinkedReferenceFromChild<M0, M1>[];

	wordCount: number;
	wordCountOfLinkedMentions: number;
	wordCountTotal: number;
};

export type LinkedMention<M0 extends RO, M1 extends RO> = {
	blockUid: Block<M0, M1>["uid"];
	// isBlockPublic: boolean;
	uidOfPageContainingBlock: Page<M0, M1>["uid"];
	originalTitleOfPageContainingBlock: PageWithMetadata<M0, M1>["originalTitle"];

	/** expect to be removed when JSON.stringify'd since circular: */
	blockRef: Block<M0, M1>; // TODO add `parentBlock` to block's metadata
	/** expect to be removed when JSON.stringify'd since circular: */
	pageContainingBlock: PageWithMetadata<M0, M1>;
};

export type LinkedReferenceFromChild<M0 extends RO, M1 extends RO> = {
	blockUid: Block<M0 & { depth: number }, M1>["uid"];
	// isBlockPublic: boolean;
	/** expect to be removed when JSON.stringify'd since circular: */
	blockRef: Block<M0 & { depth: number }, M1>;

	// uidOfMentionedPage: Page<M0, M1>["uid"];
	uidOfReferencedPage: Page<M0, M1>["uid"];
	originalTitleOfReferencedPage: PageWithMetadata<M0, M1>["originalTitle"];
	/** expect to be removed when JSON.stringify'd since circular: */
	referencedPageRef: PageWithMetadata<M0, M1>;
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
	// candidateLR: LinkedReference;
	// node: StackTreeBoundaryItem;
	textNode: StackTreeTextItem;
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
	hiddenStringValue: string;
};
