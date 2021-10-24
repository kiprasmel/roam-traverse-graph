/**
 * @type { import("./types").TraverseBlockRecursively }
 */
function traverseBlockRecursively(
	block, //
	mutatingActionToExecute
) {
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

	const newBlock = mutatingActionToExecute();

	if (newBlock.children && newBlock.children.length) {
		newBlock.children = newBlock.children.map((childBlock) =>
			traverseBlockRecursively(
				childBlock,
				// {
				// 	...props,
				// 	currentBlock: c, //
				// 	// parentBlock: block,
				// },
				mutatingActionToExecute
			)
		);
	}

	return newBlock;
}

module.exports = {
	traverseBlockRecursively,
};
