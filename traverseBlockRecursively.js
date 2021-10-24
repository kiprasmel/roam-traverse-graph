/**
 * @type { import("./types").TraverseBlockRecursively }
 */
function traverseBlockRecursively(
	props, //
	mutatingActionToExecute
) {
	const isSelfEmpty = !props.currentBlock.string || !props.currentBlock.string.trim();
	const hasNoChildren = !props.currentBlock.children || !props.currentBlock.children.length;

	if (isSelfEmpty && hasNoChildren) {
		// nothing to do here.
		// TODO investigate what happens w/ linkedReferences when block is empty and not exited early here.
		return props.currentBlock;
	}

	/**
	 * @type { boolean }
	 *
	 * TODO we'll likely need separate variables for `isPageFullyPublic`
	 * and `isCurrenlBlockPublic` and `isCurrentBlockOrAnyParentsPublic`
	 *
	 * (and also minding the upwards tree, not necessarily straight from the root,
	 * because we might have a #private tag that would affect this)
	 *
	 */
	const hasPublicTag = props.currentBlock.string.includes(props.publicTag);
	const isPublic = hasPublicTag || props.isParentPublic;

	mutatingActionToExecute({
		hasPublicTag,
		isPublic,
	});

	if (props.currentBlock.children) {
		props.currentBlock.children = props.currentBlock.children.map((c) =>
			traverseBlockRecursively(
				{
					...props,
					currentBlock: c, //
					// parentBlock: props.currentBlock,
				},
				mutatingActionToExecute
			)
		);
	}

	return props.currentBlock;
}

module.exports = {
	traverseBlockRecursively,
};
