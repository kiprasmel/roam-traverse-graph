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
	block.string = `(${hiddenStringValue}) ${block.uid}`;

	if (doNotHideTodoAndDone) {
		const TODOTag = "{{[[TODO]]}}";
		const DONETag = "{{[[DONE]]}}";
		if (block.string.includes(TODOTag)) {
			block.string = TODOTag + " " + block.string;
		} else if (block.string.includes(DONETag)) {
			block.string = DONETag + " " + block.string;
		}
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
		.map((lr) =>
			lr.candidateLR.create(
				(lr.metaPage.isFullyPublic || lr.metaPage.hasAtLeastOnePublicLinkedReference) // TODO YES/no? thinking about explicit #private tag...
					? lr.metaPage.originalTitle
					: lr.metaPage.hiddenTitle
			)
		)
		.join(" ");

	block.string += " " + linkedRefs;

	block.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));

	return block;
};

module.exports = {
	hideBlockStringsIfNotPublic,
};
