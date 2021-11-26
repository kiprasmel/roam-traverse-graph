/* eslint-disable indent */

/* eslint-disable flowtype/space-after-type-colon */

import { Block, RO } from "./types";

export const traverseBlockRecursively = <
	// ExistingBlock extends Block,
	// ExtraPropertiesForBlock extends Record<any, any>,
	M1 extends RO = RO, // TODO VERIFY
	M0 extends RO = RO, // TODO VERIFY
	InitialSettings = unknown //
>(
	mutatingActionToExecute: (
		settings: InitialSettings, //
		parentBlockInside: typeof parentBlock
	) => (
		currentBlock: Block<M0, {}> //
	) => // ) => Omit<typeof parentBlock, undefined>,
	// typeof parentBlock,
(typeof parentBlock | [typeof parentBlock, boolean]),
	initialAndNonChangingPropsForMutatingAction: InitialSettings,
		parentBlock: // | undefined // TODO undefined
	Block<M0, M1> = undefined,
) => (
	block: Parameters<ReturnType<typeof mutatingActionToExecute>>[0]
	// block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>
	// ): Block<M0> & WithMetadata<ToReadonlyObject<M0>> & WithMetadata<ToReadonlyObject<M1>> => {

	// ): Omit<typeof parentBlock, undefined> => { // TODO undefined
): typeof parentBlock => {
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

	// const _newBlock: Omit<typeof parentBlock, undefined> = // TODO undefined
	const _newBlock: typeof parentBlock | [typeof parentBlock, boolean] = mutatingActionToExecute(
		initialAndNonChangingPropsForMutatingAction, //
		parentBlock
	)(block);

	let newBlock: typeof parentBlock;

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
			traverseBlockRecursively(
				mutatingActionToExecute, //
				initialAndNonChangingPropsForMutatingAction,
				// block,
				newBlock, // TODO VERIFY  // TODO TEST PERFORMANCE
			)
		);
	}

	if (newChildren) {
		newBlock.children = newChildren;
	}

	return newBlock;
};
