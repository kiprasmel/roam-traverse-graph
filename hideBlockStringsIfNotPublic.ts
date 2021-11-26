/**
 * @type { import("./types").HideBlockStringsIfNotPublic }
 */
export const hideBlockStringsIfNotPublic = ({
	hiddenStringValue, //
	doNotHideTodoAndDone,
}) => (block) => {
	if (block.metadata.isPublic || block.metadata.isPublicOnly) {
		return block;
	}

	/** @type { string } */
	const tmp = block.string;

	block.string = `(${hiddenStringValue}) ${block.uid}`;

	if (doNotHideTodoAndDone && !block.metadata.hasCodeBlock) {
		const TODOTag = "{{[[TODO]]}}";
		const DONETag = "{{[[DONE]]}}";
		if (tmp.includes(TODOTag)) {
			block.string = TODOTag + " " + `(${hiddenStringValue}) ${block.uid}`;
		} else if (tmp.includes(DONETag)) {
			block.string = DONETag + " " + `(${hiddenStringValue}) ${block.uid}`;
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
				lr.metaPage.isFullyPublic || lr.metaPage.hasAtLeastOnePublicLinkedReference // TODO YES/no? thinking about explicit #private tag...
					? lr.metaPage.originalTitle
					: lr.metaPage.hiddenTitle
			)
		)
		.join(" ");

	block.string += " " + linkedRefs;

	block.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));

	return block;
};
