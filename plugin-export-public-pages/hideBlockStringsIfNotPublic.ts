import { MutatingActionToExecute } from "../traverseBlockRecursively";
import { LinkedRef } from "../types";

export const hideBlockStringsIfNotPublic: MutatingActionToExecute<
	{
		doNotHideTodoAndDone: boolean;
		hiddenStringValue: string;
	},
	{},
	{
		isPublic: boolean;
		isPublicOnly: boolean;
		hasCodeBlock: boolean;
		linkedReferences: LinkedRef[];
	}
> = ({
	hiddenStringValue, //
	doNotHideTodoAndDone,
}) => (block) => {
	if (block.metadata.isPublic || block.metadata.isPublicOnly) {
		return block;
	}

	const tmp: string = block.string;

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

	/**
	 * TODO FIXME
	 * TODO FIXME p2 - this gets only applied if block is not public, since we return early
	 */
	block.refs = linkedReferences.map((lr) => ({ uid: lr.metaPage.page.uid }));

	return block;
};
