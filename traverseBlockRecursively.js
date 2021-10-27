// @ts-check

/* eslint-disable indent */

/**
 * @type { import("./types").TraverseBlockRecursively }
 */
const traverseBlockRecursively = (
	mutatingActionToExecute, //
	initialAndNonChangingPropsForMutatingAction,
	parentBlock = undefined
) => (block) => {
	if (!block) {
		return block;
	}

	const isSelfEmpty = !block.string || !block.string.trim();
	const hasNoChildren = !block.children || !block.children.length;

	if (isSelfEmpty && hasNoChildren) {
		// nothing to do here.
		// TODO investigate what happens w/ linkedReferences when block is empty and not exited early here.
		return block;
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
				block
			)
		);
	}

	const newBlock =
		mutatingActionToExecute(initialAndNonChangingPropsForMutatingAction, parentBlock)?.(block) ?? block;

	if (newChildren) {
		newBlock.children = newChildren;
	}

	return newBlock;
};

module.exports = {
	traverseBlockRecursively,
};
