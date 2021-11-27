/* eslint-disable indent */

/* eslint-disable flowtype/space-after-type-colon */

import { Block, RO } from "./types";

export type MutatingActionToExecute  	< InitialSettings extends RO, M1 extends RO = RO, M0 extends RO = RO> = <M2>(
		settings: InitialSettings, //
	) => (
		//
		currentBlock: Block<M0, {}>,
		parentBlockInside: Block<M0 & M1 & M2, M1> | undefined // TODO FIXME
	) => (Block<M0 & M1 & M2, M1> | [Block<M0 & M1 & M2, M1>, boolean]); // TODO ESLINT



export const traverseBlockRecursively = <
	// ExistingBlock extends Block,
	// ExtraPropertiesForBlock extends Record<any, any>,
	M0 extends RO = RO, // TODO VERIFY
	M1 extends RO = RO, // TODO VERIFY
	InitialSettings extends RO = {},//
	M2 extends RO = RO, // TODO TS VERIFY (maybe parentBlock needs to go 1 lower instead?)
>(
	// mutatingActionToExecute: MutatingActionToExecute<InitialSettings, M0, M1>,
	mutatingActionToExecute: MutatingActionToExecute<InitialSettings, M1, M0>,
	initialAndNonChangingPropsForMutatingAction: InitialSettings,
		parentBlock: Block<M0 & M1 & M2, M1> | undefined = undefined
) =>
// <M2 extends RO>(
(
	block: Block<M0 & M2, {}>
	// block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>
	// ): Block<M0> & WithMetadata<ToReadonlyObject<M0>> & WithMetadata<ToReadonlyObject<M1>> => {

	// ): Omit<typeof parentBlock, undefined> => { // TODO undefined
): Block<M0 & M1 & M2, M1> => {
	/**
	 * BEGIN TODO VERIFY
	 */

	// if (!block) {
	// 	return block;
	// }

	// const isSelfEmpty = !block.string || !block.string.trim();
	// const hasNoChildren = !block.children || !block.children.length;

	// if (isSelfEmpty && hasNoChildren) {
	// 	// nothing to do here.
	// 	// TODO investigate what happens w/ linkedReferences when block is empty and not exited early here.
	// 	return block;
	// }

	/**
	 * BEGIN TODO VERIFY
	 */

	// const _newBlock: Block<M0> & WithMetadata<ToReadonlyObject<M0>> & WithMetadata<ToReadonlyObject<M1>> =

	type B =Block<M0 & M1 & M2, M1>

	// const _newBlock: Omit<typeof parentBlock, undefined> = // TODO undefined
	const _newBlock: B | [B, boolean] = mutatingActionToExecute<M2>(
		initialAndNonChangingPropsForMutatingAction, //
	// )(block, 		parentBlock as undefined | B); // TODO TS VERIFY
	)(block, 		  parentBlock); // TODO TS VERIFY

	let newBlock: B

	let shouldContinueTraversal = true;
	if (Array.isArray(_newBlock)) {
		newBlock = _newBlock[0];
		shouldContinueTraversal = _newBlock[1];
	} else {
		newBlock = _newBlock;
	}

	if (!shouldContinueTraversal) {
		return newBlock;
	}

	/**
	 * here, this is a big optimization:
	 *
	 * 2 scenarios, when iterating thru block.children with .map:
	 * a) assign the new value to block.children directly, or
	 * b) assign the new value to a temporary variable, and only later assign this temporary variable to block.children.
	 *
	 * we obviously use B.
	 *
	 * previously, we used A, but then you couldn't get past
	 * "RangeError: Maximum call stack size exceeded"
	 * errors.
	 *
	 * TODO - explain why B is unbelievably better than A and how it works.
	 *
	 */
	let newChildren;

	if (block.children && block.children.length) {
		newChildren = block.children.map(
			traverseBlockRecursively<M0, M1, InitialSettings>(
				mutatingActionToExecute, //
				initialAndNonChangingPropsForMutatingAction,
				// block,
				newBlock, // TODO VERIFY  // TODO TEST PERFORMANCE // TODO PARENT
			)
		);
	}

	if (newChildren) {
		newBlock.children = newChildren;
	}

	return newBlock;
};
