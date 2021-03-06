import escapeHtml from "escape-html";

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
	/**
	 * TODO put in the correct place uh oh
	 * TODO rename the plugin
	 */
	block.string = escapeHtml(block.string);

	if (block.metadata.isPublic || block.metadata.isPublicOnly) {
		block.metadata.linkedReferences.forEach((lr) => {
			/**
			 * poor man's replaceAll
			 */
			block.string = block.string
				.split(lr.candidateLR.fullStr)
				/**
				 * TODO PRIVACY - ensure that the page.title
				 * already had a chance to be hidden.
				 */
				.join(lr.candidateLR.create(lr.metaPage.page.title));
		});

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
				!lr.metaPage.isFullyPublic //
					? lr.metaPage.hiddenTitle
					: lr.metaPage.originalTitle
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
