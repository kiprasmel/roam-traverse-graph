// @ts-check

/**
 * @type { import("./types").HideBlockStringsIfNotPublic }
 */
const hideBlockStringsIfNotPublic = ({
	hiddenStringValue, //
	doNotHideTodoAndDone,
}) => (block) => {
	if (block.metadata.isPublic) {
		return block;
	}

	/** @type { string } */
	let newString = `(${hiddenStringValue}) ${block.uid}`;

	if (doNotHideTodoAndDone) {
		if (block.string.includes("{{[[TODO]]}}")) {
			// currentBlock.string = `{{[[TODO]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
			newString = "{{[[TODO]]}}" + " " + newString;
		} else if (block.string.includes("{{[[DONE]]}}")) {
			// currentBlock.string = `{{[[DONE]]}} (${hiddenStringValue}) ${currentBlock.uid}`;
			newString = "{{[[DONE]]}}" + " " + newString;
		} else {
			// currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
		}
	} else {
		// currentBlock.string = `(${hiddenStringValue}) ${currentBlock.uid}`;
	}

	const { linkedReferences } = block.metadata;

	if (!linkedReferences.length) {
		return block;
	}

	/** @type { string } */
	const linkedRefs = linkedReferences
		.filter((lr) => {
			if (doNotHideTodoAndDone) {
				return !["TODO", "DONE"].includes(lr.candidateLR.origStr);
			}
			return true;
		})
		// .map((lr) => lr.candidateLR.create(lr.metaPage.page.title))
		.map((lr) =>
			lr.candidateLR.create(
				(lr.metaPage.isFullyPublic || lr.metaPage.hasAtLeastOnePublicLinkedReference) // TODO YES/no? thinking about explicit #private tag...
					? lr.metaPage.originalTitle
					: lr.metaPage.hiddenTitle
			)
		) // TODO meta.hasAtleast1lr ? a : b
		.join(" ");

	newString += " " + linkedRefs;

	block.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));

	// console.log({
	// 	block: currentBlock.string,
	// 	newBlock: newString,
	// 	// linkedReferences: linkedReferences.flatMap((lr) => [lr.originalTitle, lr.page.title]),
	// });

	block.string = newString;

	return block;
};

module.exports = {
	hideBlockStringsIfNotPublic,
};
