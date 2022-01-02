#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

import { traverseBlockRecursively } from "../traverseBlockRecursively";
import { removeUnknownProperties, markBlockPublic } from "./findPublicBlocks";
import { findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions } from "./findLinkedReferencesOfABlock";
import { hideBlockStringsIfNotPublic } from "./hideBlockStringsIfNotPublic";
import { parseRoamTraverseGraphSettingsFromRoamPage } from "./parseSettingsFromRoamPage"; // TODO FIXME
import { shallowMergeIncludingArrayValues } from "../util/shallowMergeIncludingArrayValues";
import { createLinkedReferences } from "../util";
import { blockStringHasCode } from "../util/blockContainsCode";
import { sortUntilFirstXORMatchUsing, Order } from "../util/sortUntilFirstXORMatch";

import {
	Page, //
	PageWithMetadata,
	RO,
	Block,
	LinkedRef,
} from "../types";

import { withMetadata } from "../util/withMetadata";

export type SettingsForPluginFindPublicPages = {
	/**
	 * marks itself (the page) & all it's children blocks public, up until a child block is marked as private.
	 */
	publicGlobalTags: string[];

	/**
	 * marks itself (the current block) & all it's children blocks public, up until a child is marked as private.
	 * DOES break through a previous (even explicit) private mark.
	 */
	publicTags: string[];

	/**
	 * marks only itself (the current block) public, unless itself is also marked as private.
	 * DOES NOT break through a previous (explicit) private mark.
	 */
	publicOnlyTags: string[];

	/**
	 * (explicitly) marks itself (the current block) and it's children private,
	 *
	 * up until a child is marked as public
	 * (as long as that public mark has power to break the previous private mark,
	 * see previous info about the different public tags).
	 *
	 * in general, both pages and blocks are private -- implicitly.
	 * this tag marks them as private explicitly,
	 * and has consequences as described above.
	 *
	 * to mark / "marks" / "marking" a page/block here means that:
	 * the plugin, when processing the graph,
	 * first adds metadata to each page/block that it is public/private & how much,
	 * and later uses this metadata:
	 * 1. to decide -- to hide, or not to hide, the page's title / block's string (i.e. replace it with "(hidden)" or similar),
	 * 2. based on 1., to decide -- to hide, or not to hide, the linked references,
	 *    even if the linked references themselves would be living inside a private page,
	 * 3. to decide the order of exporting - which pages will come first, and which ones last,
	 * 4. to decide if a page will be exported & uploaded at all or not.
	 * 5. etc etc.
	 *
	 * see the source code of the plugin itself to understand better.
	 *
	 */
	privateTag: string; // TODO ARRAY
	/**
	 * TODO DEPRECATE - use the .uid instead! (will work for pages too to avoid merging them lol)
	 * (or keep and concat w/ the .title / .string to make obvious it's hidden)
	 */
	hiddenStringValue: string;
	/**
	 * make the publicTag page itself public
	 */
	makeThePublicTagPagePublic: boolean;

	/**
	 * TODO and DONE are more like boolean toggles to indicate if something's done or not,
	 * and show a visual indicator, thus we have a special case for them
	 */
	doNotHideTodoAndDone: boolean;

	/**
	 * currently blocks', will later apply to pages as well once we implement it properly
	 */
	keepMetadata: boolean;
};

export const getDefaultSettingsForPluginFindPublicPages = (): SettingsForPluginFindPublicPages => ({
	publicGlobalTags: [],
	publicTags: ["#public"],
	publicOnlyTags: [],
	privateTag: "#private", // TODO array
	hiddenStringValue: "hidden",
	makeThePublicTagPagePublic: false,
	doNotHideTodoAndDone: true,
	keepMetadata: false,
});

export const defaultRoamSettingsPageTitle = "roam-traverse-graph-settings" as const;

// const blockBase = {
// 	"create-time": 69,
// 	"edit-email": "",
// 	"edit-time": 1,
// 	string: "1",
// 	uid: "69",
// 	//
// } as const;

// const bbbb = traverseBlockRecursively(
// 	() => (block) =>
// 		// eslint-disable-next-line no-param-reassign
// 		withMetadata(block, { hasCodeBlock: !!block?.string?.includes?.("```") }),
// 	{}
// )({ ...blockBase, metadata: {} });

// bbbb.metadata.hasCodeBlock;

/**
 * TODO RENAME `assignChildren` (tho doesn't assign, but changes children ~~ nvm, all good) or similar
 */
const pageWithNewChildren = <
	M0 extends RO,
	M1 extends RO //
>(
	// pred: (block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>) => typeof block & WithMetadata<ToReadonlyObject<M1>>,
	pred: <M2>(block: Block<M0 & M2, {}>, index?: number, array?: Block<M0 & M2, {}>[]) => Block<M0 & M1 & M2, M1>
) => <M2>(page: Page<M0 & M2, {}>): Page<M0 & M1 & M2, M1> => {
	// ) => (page: Page<M0>): Page<M0> & Page<M1> => (
	// eslint-disable-next-line no-param-reassign
	const newChildren: Block<M0 & M1 & M2, M1>[] = (page.children || []).map((block, index, array) =>
		pred<M2>(block, index, array)
	); // TODO TS ?

	return {
		...page,
		children: newChildren,
	};
};

// TODO
// type MFinal = ToReadonlyObject<{ hasCodeBlock: boolean }>;

export type ContributesBlockMetadata = {
	depth: number;
	originalString: string;
	/**
	 * TODO document all
	 */
};

export const findPublicPages = <M0 extends RO>(
	/**
	 * TODO consider single vs array
	 *
	 * single here woud seem we'd need to do all the passes
	 * before we can parse the children tho..
	 *
	 */
	somePages: Page<M0, {}>[] = [], //
	optionsOrig: Partial<SettingsForPluginFindPublicPages> = { publicTags: [], publicOnlyTags: [] },
	settingsFromSettingsPage: Partial<SettingsForPluginFindPublicPages> = parseRoamTraverseGraphSettingsFromRoamPage(
		somePages
	),
	settings: SettingsForPluginFindPublicPages = shallowMergeIncludingArrayValues(
		getDefaultSettingsForPluginFindPublicPages(),
		[
			optionsOrig, //
			settingsFromSettingsPage,
		]
	),
	{
		doNotHideTodoAndDone,
		hiddenStringValue,
		keepMetadata,
		makeThePublicTagPagePublic,
		privateTag,
		publicGlobalTags,
		publicOnlyTags,
		publicTags,
	} = settings
	// ): PageWithMetadata<M0 & M1>[] => ( // TODO FIXME
	// ): PageWithMetadata<M0, MFinal>[] => ( // TODO FIXME // TODO FIXME
): PageWithMetadata<M0, ContributesBlockMetadata>[] => (
	console.log({
		defaultOptions: getDefaultSettingsForPluginFindPublicPages(),
		optionsOrig,
		settingsFromSettingsPage,
		merged: settings,
	}),
	/**
	 * TODO: move page.children into some temporary page._children or similar
	 * to make sure we delete it at the end,
	 * and only keep the manually added ones
	 * to avoid accidently forgetting to hide the necessary stuff lol
	 *
	 * and/or create tests, duh
	 *
	 * same w/ the `title` / `string` as well
	 *
	 */

	(somePages || [])
		.map((p) => keepOnlyKnownPropertiesOfPage<M0>(p))

		// .map(
		// 	mapChildren(
		// 		traverseBlockRecursively(() => (block) => ((block.metadata = block.metadata || ({} as M0)), block), {})
		// 	)
		// )
		.map(
			pageWithNewChildren<M0, { originalString: string }>(
				traverseBlockRecursively<{}, { originalString: string }>(
					() => (block) =>
						withMetadata({
							originalString: block.string,
						})(block),
					{}
				)(undefined)
			)
		)

		.map(
			pageWithNewChildren<M0, { parentBlockRef?: Block<M0, {}> }>(
				traverseBlockRecursively(
					// traverseBlockRecursively<{}>(
					() => (block, parentBlockRef) =>
						withMetadata({
							parentBlockRef: parentBlockRef,
						})(block),
					{}
				)(undefined)
			)
		)

		.map(
			pageWithNewChildren<M0, { depth: number }>(
				traverseBlockRecursively<{}, { depth: number }>(
					// traverseBlockRecursively<{}>(
					() => (block, _parentBlockRef, depth) =>
						withMetadata({
							depth,
						})(block),
					{}
				)(undefined)
			)
		)

		.map(
			pageWithNewChildren<M0, { hasCodeBlock: boolean }>(
				traverseBlockRecursively(
					// traverseBlockRecursively<{}>(
					() => (block) =>
						withMetadata({
							hasCodeBlock: blockStringHasCode(block),
						})(block),
					{}
				)(undefined)
			)
		)
		// .map(p => p.children[0].metadata.)
		// .map(p => p.children[0].metadata.)
		.map((page) => {
			const isThePublicTagPageAndShouldBePublic =
				makeThePublicTagPagePublic && publicTags.some((publicTag) => titleIsPublicTag(page, publicTag));

			return isThePublicTagPageAndShouldBePublic || //
				publicGlobalTags.some((tag) => isMarkedAsFullyPublic(page, tag))
				? toFullyPublicPage(page, hiddenStringValue)
				: toPotentiallyPartiallyPublicPage(page, hiddenStringValue);
		})
		// .map(pm => pm.page.children?.[0].metadata.)

		.map(
			(pageMeta) => (
				// TODO TS
				((pageMeta as any).isDailyNotesPage = [
					/^\d{2}-\d{2}-\d{4}$/, //
					/^\d{4}-\d{2}-\d{2}$/, // prolly won't happen ever, but...
				].some((
					reg //
				) => reg.test(pageMeta.page.uid))), //
				pageMeta
			)
		)
		// .map(pm => pm.page.children?.[0].metadata.)

		/** BEGIN word & char counts */
		.map(
			(pageMeta) => (
				(pageMeta.page.children = (pageMeta.page.children || [])
					.map(
						traverseBlockRecursively<
							{},
							{
								wordCountSelf: number; //
								wordCountChildrenRecursively: number;
							}
						>(
							() => (block) =>
								withMetadata({
									wordCountSelf: block.string.split(" ").filter((str) => !!str.trim()).length,
									wordCountChildrenRecursively: 0,
								})(block), // TODO
							{}
						)(undefined)
					)
					.map(
						traverseBlockRecursively(
							() => (block: any) => {
								const isLeafBlock = block.metadata.parentBlockRef && !block.children?.length;

								if (!isLeafBlock) {
									return block;
								}

								let tmpBlock = block;
								let parentBlock = tmpBlock.metadata.parentBlockRef;

								while (parentBlock) {
									parentBlock.metadata.wordCountChildrenRecursively +=
										tmpBlock.metadata.wordCountSelf +
										tmpBlock.metadata.wordCountChildrenRecursively;

									const lastChildOfParent = parentBlock.children[parentBlock.children.length - 1];
									const currentBlockIsLastChild = tmpBlock === lastChildOfParent;

									if (!currentBlockIsLastChild) {
										// break;
										return block;
									}

									tmpBlock = parentBlock;
									parentBlock = tmpBlock?.metadata.parentBlockRef;
								}

								// console.log({ isLeafBlock, string: block.string, tmpBlock: tmpBlock.metadata });

								return block;
							},
							{}
						)(undefined)
					)),
				pageMeta
			)
		)

		.map(
			(pageMeta) => (
				(pageMeta.wordCount = (pageMeta.page.children || [])
					.map(
						(child) =>
							(child.metadata as any).wordCountSelf + (child.metadata as any).wordCountChildrenRecursively
					) // TODO TS
					.reduce((accum, current) => accum + current, 0)),
				pageMeta
			)
		)
		/** END word & char counts */

		/**
		 * TODO think about how we want to implement the hiding of page title's
		 * if we allow an option to NOT hide them IF at least 1 child anywhere in hierarchy
		 * has the public tag
		 *
		 * will need 2 passes through the hieararchy prolly
		 *
		 */
		.map((pageMeta) =>
			pageMeta.isFullyPublic ||
			(pageMeta as any).isDailyNotesPage || // TODO TS
			(doNotHideTodoAndDone && ["TODO", "DONE"].includes(pageMeta.originalTitle))
				? ((pageMeta.isTitleHidden = false), //
				  pageMeta)
				: ((pageMeta.isTitleHidden = true), //
				  (pageMeta.page.title = `(${hiddenStringValue}) ${pageMeta.page.uid}`),
				  pageMeta)
		)

		.map(
			// mapChildren((currentPageWithMeta, _index, currentPagesWithMetadata) => (
			/**
			 * TODO - make pages non-moronic (dont wrap -- add metadata sideways),
			 * then use the `mapChildren` here,
			 * and use M2 also just like in traverseBlockRecursively to keep the metadata
			 */

			// mapChildren((currentPageWithMeta, _index, currentPagesWithMetadata) => (
			(currentPageWithMeta, _index, currentPagesWithMetadata) => (
				// ((currentPageWithMeta.page.children || [])
				// TODO FIXME TS:
				// @ts-expect-error
				(currentPageWithMeta.page.children = (currentPageWithMeta.page.children || [])
					// .map(p => p.children[0].metadata.)
					.map(traverseBlockRecursively(removeUnknownProperties, {})(undefined))
					// .map(p => p.children[0].metadata.)
					.filter((block) => !!block)
					// testing:
					// .map(
					// 	traverseBlockRecursively<{}>(
					// 		() => withMetadata({ foo: "bar" }), //
					// 		{}
					// 	)(undefined) //
					// )
					// .map((block) => block.metadata.)

					// .map(traverseBlockRecursively(() => (block) => withMetadata({})(block), {})(undefined))
					.map(
						traverseBlockRecursively(
							() => (block) => {
								//

								// function createParser() {
								// 	type ParsedType = "command" | "linked-reference";
								// 	type Parsed = {
								// 		type: ParsedType;
								// 	} & (
								// 		| {
								// 				pos: "begin";
								// 		  }
								// 		| {
								// 				pos: "end";
								// 				content: string;
								// 		  }
								// 	);

								// 	const createBegin = (rest: Omit<Parsed, "pos">): Parsed => ({
								// 		pos: "begin",
								// 		...rest,
								// 	});
								// 	const createEnd = (content: string, rest: Omit<Parsed, "pos">): Parsed => ({
								// 		pos: "end",
								// 		content,
								// 		...rest,
								// 	});

								// 	/**
								// 	 * not really a stack of how we're parsing it.
								// 	 *
								// 	 * it becomes flat, instead of having sub-categories
								// 	 * if they were to exist (children)
								// 	 */
								// 	const parsedStack: Parsed[] = [];

								// 	/** TODO DISALLOW TEXT */
								// 	const parsedTypesStack: ParsedType[] = [];

								// 	const begin = (type: ParsedType, rest: Omit<Parsed, "pos" | "type"> = {}) => {
								// 		parsedTypesStack.push(type);
								// 		parsedStack.push(createBegin({ type, ...rest }));
								// 		// const end = () => parsedStack.push(createEnd({ type, ...rest }));
								// 		// return end;
								// 	};

								// 	const end = (
								// 		type: ParsedType, //
								// 		content: string,
								// 		rest: Omit<Parsed, "pos" | "type"> = {}
								// 	) => {
								// 		const lastParsed = parsedTypesStack[parsedTypesStack.length - 1];

								// 		if (!lastParsed || lastParsed !== type) {
								// 			// TODO
								// 			throw new Error(
								// 				`invalid syntax - ending type does not have a proper beginning type (could be miss-placed etc). block.uid = "${block.uid}", block.string (raw) = "${block.string}".`
								// 			);
								// 		}

								// 		parsedStack.push(createEnd(content, { type, ...rest }));
								// 	};

								// 	return function parse(str: string): Parsed[] {
								// 		let lastLengthOfStartsWith = -1;

								// 		const startsWith = (s: string): boolean => (
								// 			(lastLengthOfStartsWith = s.length), s === str.slice(0, s.length)
								// 		);

								// 		const eat = (n: number = lastLengthOfStartsWith): string => str.slice(n);

								// 		/**
								// 		 * TODO get rid of this & parse properly w/o assuming it ends at first match lol
								// 		 */
								// 		// const eatUntilFirst = (s: string, ret: string = ""): string => (
								// 		// 	// eslint-disable-next-line no-param-reassign
								// 		// 	(ret = str.split(s)[0]), //
								// 		// 	// eslint-disable-next-line no-param-reassign
								// 		// 	(str = [...str].splice(ret.length).join("")),
								// 		// 	ret
								// 		// );

								// 		/**
								// 		 * TODO would likely want to improve parsing
								// 		 * & NOT assume that the thing goes up until
								// 		 * the very first counter-match of it
								// 		 *
								// 		 * TODO need a state machine to explicitly specify
								// 		 * what CAN and CANNOT be after what
								// 		 */
								// 		while (str.length) {
								// 			// else if (false) {
								// 			// 	//
								// 			// }

								// 			// eslint-disable-next-line no-constant-condition
								// 			if (false) {
								// 				//
								// 			} else if (startsWith("{{")) {
								// 				// eat(2);
								// 				// const end = begin("command");
								// 				// // parse(str);
								// 				// // end();
								// 				// const remaining = eatUntilFirst("}}");
								// 				// parse(remaining);
								// 				// end();

								// 				begin("command");
								// 				const rest = eat();
								// 				parse(rest);
								// 			} else if (startsWith("}}")) {
								// 				eat();
								// 				end("command");
								// 			} else if (startsWith("#[[")) {
								// 				begin("linked-reference");
								// 				const rest = eat();
								// 				parse(rest);
								// 			} else if (startsWith("]]")) {
								// 				eat();
								// 				end("linked-reference");
								// 			} else if (startsWith("[[")) {
								// 				begin("linked-reference");
								// 				const rest = eat();
								// 				parse(rest);
								// 			} else if (startsWith("]]")) {
								// 				eat();
								// 				end("linked-reference");
								// 			} else if (startsWith("#")) {
								// 				const rest = eat();
								// 				begin("linked-reference");

								// 				const breakers = [" ", ".", ":", "'"];

								// 				const untilFirstBreaker: string = breakers
								// 					.map((breaker) =>
								// 						!rest.includes(breaker) ? "" : rest.split(breaker)[0]
								// 					)
								// 					.filter((x) => !!x)
								// 					.sort((a, b) => a.length - b.length)[0];

								// 				if (!untilFirstBreaker) {
								// 					// TODO the actual contents of it
								// 					end("linked-reference", rest);
								// 				} else {
								// 				}
								// 			}

								// 			// else {
								// 			// 	throw new Error("unhandled syntax");
								// 			// }
								// 		}

								// 		return parsedStack;
								// 	};
								// }

								// return withMetadata({ ast })(block);

								/**
								 * ---
								 */

								/**
								 * order matters
								 */
								const boundaries = [
									{
										begin: "```",
										end: "```",
										type: "code-block",
										kind: "whole",
									},
									{
										begin: "`",
										end: "`",
										type: "code-block",
										kind: "inline",
									},
									//
									{
										// TODO "allow un-beginned" or whatever
										begin: null,
										end: "::",
										// type: "attribute",
										// // TODO - linked reference w/ kind: attribute?
										type: "linked-reference", // TODO attribute? or nah? probably not.
										kind: "::",
									},
									{
										begin: "#[[",
										end: "]]",
										type: "linked-reference",
										kind: "#[[]]",
										// parse: (s: string): boolean => {
										// 	//
										// },
									},
									{
										begin: "[[",
										end: "]]",
										type: "linked-reference",
										kind: "[[]]",
									},
									{
										begin: "#",
										// end: [" ", ".", ":", "'"],
										end: " ", // TODO FIXME - use above
										type: "linked-reference",
										kind: "#",
										// TODO "allow unfinished"
									},
									//
									{
										begin: "{{",
										end: "}}",
										type: "command",
									},
									//
								];

								let cursor = 0;
								const originalString: string = block.string;

								// TODO FIXME
								const stack: any[] = [];

								// function parseUntil(str: string, current: string | null, until: string | null) {
								function parseUntil(from: string | null, until: string | null): void {
									// let lastLengthOfStartsWith = -1;
									//
									// const eat = (n: number = lastLengthOfStartsWith): string => str.slice(n);
									// const advance = (n: number = lastLengthOfStartsWith): string => (
									const advance = (n: number): string => (
										(cursor += n), originalString.slice(cursor)
									);

									const str: string = advance(0);

									const startsWith = (s: string): boolean =>
										// (lastLengthOfStartsWith = s.length), s === str.slice(0, s.length)
										s === str.slice(0, s.length);

									//
									const foundNonText: boolean = boundaries.some((b): boolean => {
										// for (const b of boundaries) {
										if (b.begin === null && b.end === null) {
											throw new Error("begin & end cannot both be null");
										} else if (b.begin === null) {
											if (startsWith(b.end)) {
												/**
												 * need everything from very beginning up until now
												 */

												stack.unshift(["begin", b]);

												// stack.push(["text", "TODO"]);
												/**
												 * text (or other stuff) have already been parsed
												 */

												stack.push(["end", b]);

												advance(b.end.length);

												return true;

												// return {
												// 	...b,
												// 	child: parseUntil(),
												// };
											}
										} else if (b.end === null) {
											if (startsWith(b.begin)) {
												/**
												 * need everything from now up until the very end
												 */
												// TODO

												stack.push(["begin", b]);
												advance(b.begin.length);

												parseUntil(b.begin, null);

												// stack.push(["text", "TODO"]);

												stack.push(["end", b]);

												return true;
											}
										} else if (startsWith(b.begin)) {
											// advance(b.begin.length);

											if (b.begin === b.end && until === b.end) {
												/**
												 * do NOT advance NOR push here
												 * because once we return,
												 * the stuff right below us will activate
												 * & do the work there.
												 */

												stack.push(["end", b]);
												advance(b.end.length);

												return true;
											}

											stack.push(["begin", b]);
											advance(b.begin.length);

											parseUntil(b.begin, b.end);

											// stack.push(["end", b]);
											// advance(b.end.length);

											return true;

											// const scopedCursor = cursor + b.begin.length;
											// const scopedUntil = b.end;

											// const ret = parseUntil(scopedUntil);
											// const { cursorAdvancedBy, children } = ret;

											// // cursor += cursorAdvancedBy;

											// return {
											// 	...b,
											// 	cursorAdvancedBy: scopedCursor + cursorAdvancedBy,
											// 	children,
											// };
										} else if (startsWith(b.end)) {
											if (
												// (from !== b.begin && from !== null) ||
												// (until !== b.end && until !== null)
												(from !== b.begin || until !== b.end) &&
												(from !== null || until !== null)
												// TODO FIXME
											) {
												// stack.push(["MISMATCH", { from, until, b }]);
												// TODO INDICATE FAILURE IF NONE MATCH (or should we?)
												return false;
												// throw new Error(
												// 	`unmatched! block.uid = "${block.uid}", block.string (original!) = "${block.string}", cursor was at "${cursor}", until = "${until}", b.end = "${b.end}"`
												// );
											} else {
												/**
												 * matched!
												 */
												stack.push(["end", b]);
												advance(b.end.length);

												return true;
											}
										}

										return false;
									});

									const curr = advance(0);

									if (curr.length) {
										if (!foundNonText) {
											const char = curr[0];
											stack.push(["char", char]);
											advance(1);

											return parseUntil(from, until);
										}

										// return parseUntil(null);
										// return parseUntil(until);
									}
								}

								while (cursor < originalString.length) {
									parseUntil(null, null);
								}

								const [stackWithTextInsteadOfChars, leftoverText] = stack.reduce(
									([acc, tempString], [beginEndChar, item]) =>
										beginEndChar === "char"
											? [acc, tempString + item] //
											: (tempString && acc.push(["text", tempString]),
											  acc.push([beginEndChar, item]),
											  [acc, ""]), //
									[[], ""]
								);
								if (leftoverText) {
									stackWithTextInsteadOfChars.push(["text", leftoverText]);
								}

								let i = 0;

								const stackTree = {
									children: toTree(),
								};

								// TODO TS
								function toTree(): any[] {
									const childrenAtCurrentLevel = [];

									for (; i < stackWithTextInsteadOfChars.length; i++) {
										const [beginEndText, item] = stackWithTextInsteadOfChars[i];

										if (beginEndText === "text") {
											// childrenAtCurrentLevel.push({
											// 	type: "text",
											// 	content: item,
											// });
											childrenAtCurrentLevel.push({
												type: "text",
												content: item,
											});
											// return { item};
										} else if (beginEndText === "begin") {
											i++;
											childrenAtCurrentLevel.push({
												...item,
												children: toTree(),
											});
										} else if (beginEndText === "end") {
											return childrenAtCurrentLevel;
										}
									}

									return childrenAtCurrentLevel;
								}

								return withMetadata({
									stack: stackWithTextInsteadOfChars,
									stackTree,
								})(block);
							},
							{}
						)(undefined)
					)
					.map(
						traverseBlockRecursively(
							// <
							// 	{},
							// 	{
							// 		isPublicOnly: boolean;
							// 		isPublic: boolean;
							// 		hasPublicTag: boolean;
							// 		hasPrivateTag: boolean;
							// 	}
							// >
							markBlockPublic, //
							{
								rootParentPage: currentPageWithMeta,
								publicTags, // TODO CONFIRM
								publicOnlyTags,
								privateTag: privateTag as string, // TODO TS wtf
							}
						)(undefined)
					)
					// .map((block) => block)
					// .map((b) => withMetadata(b, { foo: "bar" }))
					// .map(b => b.metadata.)
					// .map(traverseBlockRecursively<{}>(() => (b) => b.metadata, {}))
					.map(
						traverseBlockRecursively(
							// <{}, { linkedReferences: LinkedRef[] }>
							findIfPagesHavePublicLinkedReferencesAndLinkThemAsMentions, //
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
							}
						)(undefined)
					)
					// .map(b => b.metadata.)
					.map(
						traverseBlockRecursively<
							{ linkedReferences: LinkedRef[] }, // TODO TS
							{},
							{
								rootParentPage: PageWithMetadata<{}, {}>; // TODO FIXME
								allPagesWithMetadata: PageWithMetadata<{}, {}>[];
							}
						>(
							({ rootParentPage, allPagesWithMetadata }) => (b) => {
								const { linkedReferences } = b.metadata;

								if (!linkedReferences.length) {
									return b;
								}

								const yay = !!linkedReferences.find(
									(lr) =>
										!!allPagesWithMetadata.find(
											(pageMeta) =>
												lr.metaPage.page.uid === pageMeta.page.uid &&
												pageMeta.hasAtLeastOnePublicLinkedReference
										)
								);

								if (yay) {
									rootParentPage.hasAtLeastOneMentionOfAPublicLinkedReference = true;

									return [b, false];
								}

								return b;
							},
							{
								rootParentPage: currentPageWithMeta,
								allPagesWithMetadata: currentPagesWithMetadata,
							}
						)(undefined)
					)
					.map(
						traverseBlockRecursively(hideBlockStringsIfNotPublic, {
							doNotHideTodoAndDone,
							hiddenStringValue,
						})(undefined)
					)
					// .map((block) => block.metadata.)

					/**
					 * TODO FIXME - remove this & `keepMetadata` true by default; users can remove it themselves via `JSON.stringify`
					 */
					.map((block) =>
						keepMetadata
							? block
							: traverseBlockRecursively(
									() => (b) => (
										"metadata" in b && ((b.metadata = {} as any), delete (b as any).metadata),
										(b as Omit<typeof b, "metadata">) as any
									), // TODO TS
									{}
							  )(undefined)(block)
					)),
				currentPageWithMeta
			)
		)
		// .map(pm => pm.page.children?.[0].metadata. )

		/** END extra wordCounts (for linkedMentions & total) */
		.map(
			(pageMeta) => (
				(pageMeta.wordCountOfLinkedMentions = (pageMeta.linkedMentions || [])
					.map(
						({ blockRef: child }) =>
							(child.metadata as any).wordCountSelf + (child.metadata as any).wordCountChildrenRecursively
					) // TODO TS
					.reduce((accum, current) => accum + current, 0)),
				(pageMeta.wordCountTotal = pageMeta.wordCount + pageMeta.wordCountOfLinkedMentions),
				pageMeta
			)
		)
		/** END extra wordCounts (for linkedMentions & total) */

		.map((p) => (!p.page.children?.length && delete p.page.children, p))

		/**
		 * TODO automatic forwarding of `_a, _b` in `sortUntilFirstXORMatchUsing`
		 */
		.sort((_a, _b) =>
			sortUntilFirstXORMatchUsing<PageWithMetadata<{}, {}>>(
				[
					(AB): boolean => publicTags.some((publicTag) => titleIsPublicTag(AB.page, publicTag)),
					(AB): boolean =>
						AB.isFullyPublic &&
						/**
						 * TODO isTerm logic
						 */
						[...new Set((AB.linkedMentions || []).map((ref) => ref.uidOfPageContainingBlock))].length > 2,
					(AB): boolean => doNotHideTodoAndDone && ["TODO", "DONE"].includes(AB.originalTitle),
					//
					(AB): boolean => !!AB.isDailyNotesPage && new Date(AB.page.uid) <= new Date(),
					(A, B): number =>
						A.isDailyNotesPage && B?.isDailyNotesPage
							? /**
							   * using the page's `create-time` is not reliable (for an expected outcome),
							   * because a daily notes page can get created earlier
							   * if you reference it (e.g. /tomorrow or /date etc.).
							   *
							   * thus the previous implementation is obsolete:
							   *
							   * ```js
							   * (B.page["create-time"] || -Infinity) - (A.page["create-time"] || -Infinity) || Order.EVEN
							   * ```
							   *
							   * and the new one uses the `uid` of the page,
							   * since it's a valid date and will work as expected.
							   *
							   */
							  new Date(B.page.uid).getTime() - new Date(A.page.uid).getTime()
							: /**
							   * TODO isTerm right next to the daily notes page
							   */
							  // : // sortUntilFirstXORMatchUsing([(AA, BB): number => 1] as const)(_a, _b),
							  // /**
							  //  * TODO function to do vice-versa as well
							  //  * (A, B) => O1 : O2
							  //  * (B, A) => O2 : O1
							  //  *   : O.EVEN
							  //  */
							  // A.isFullyPublic && B?.isDailyNotesPage
							  // ? new Date(A.page["create-time"] || -Infinity).getDay() === new Date(B.page.uid).getDay()
							  // 	? Order.AHEAD
							  // 	: Order.BEHIND
							  // : // : Order.EVEN,
							  // B?.isFullyPublic && A?.isDailyNotesPage
							  // ? new Date(A.page["create-time"] || -Infinity).getDay() === new Date(B.page.uid).getDay()
							  // 	? Order.BEHIND
							  // 	: Order.AHEAD
							  Order.EVEN,

					(AB): boolean => !!AB.linkedMentions?.length,
					(A, B): number => (B?.linkedMentions?.length || 0) - (A.linkedMentions?.length || 0),
					(AB): boolean => AB.hasAtLeastOnePublicBlockAnywhereInTheHierarchy,
					(A, B): number => (B?.wordCount || -Infinity) - A.wordCount,
				],
				{ log: false }
			)(_a, _b)
		)
);

/**
 * security et al -- in case upstream adds something potentially private
 * and we don't immediately update to remove it (very plausible)
 */
function keepOnlyKnownPropertiesOfPage<M0 extends RO>(
	page: Page<M0, {}> & Record<any, any> //
): Page<M0, {}> {
	return {
		title: page.title,
		uid: page.uid,
		"create-time": page["create-time"],
		"edit-time": page["edit-time"],
		"edit-email": page["edit-email"],
		...("refs" in page ? { refs: page.refs } : {}),
		...("children" in page ? { children: page.children } : {}),
	};
}

function titleIsPublicTag<M0 extends RO, M1 extends RO>(page: Page<M0, M1>, publicTag: string): boolean {
	if (!page.title) {
		return false;
	}

	const { title } = page;

	return !![
		title, //
		...createLinkedReferences(title).map((lr) => lr.fullStr),
	].includes(publicTag);
}

function isMarkedAsFullyPublic<M0 extends RO & { hasCodeBlock: boolean }, M1 extends RO>(
	page: Page<M0, M1>,
	publicTag: string
): boolean {
	/**
	 * the page is fully public IF AND ONLY IF:
	 * 1. the publicTag is inside the top-most level block,
	 * 2. the block has no children blocks inside it,
	 * 3. the block's content (string) is equivalent to the publicTag string without any exceptions
	 *    (even additional spaces inside the block make the power of the publicTag void - all intentional).
	 */
	return !!(
		page.children && //
		page.children.length &&
		page.children.some((block) => !block.children && block.string === publicTag && !block.metadata.hasCodeBlock)
	);
}

function toFullyPublicPage<M0 extends RO, M1 extends RO>(
	page: Page<M0, M1>,
	hiddenStringValue: string
): PageWithMetadata<M0 & M1, M1> {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: true,
		isPublicTagInRootBlocks: true,
		isFullyPublic: true,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: true,
		hasAtLeastOnePublicLinkedReference: false, // until found out otherwise
		hasAtLeastOneMentionOfAPublicLinkedReference: false, // CHANGEABLE LATER
		isTitleHidden: false, // CHANGEABLE LATER
		wordCount: 0,
		wordCountOfLinkedMentions: 0,
		wordCountTotal: 0,
	};
}

function toPotentiallyPartiallyPublicPage<M0 extends RO, M1 extends RO>(
	page: Page<M0, M1>, //
	hiddenStringValue: string
): PageWithMetadata<M0 & M1, M1> {
	return {
		page, //
		originalTitle: page.title,
		hiddenTitle: `(${hiddenStringValue}) ${page.uid}`,
		hasPublicTag: false,
		isPublicTagInRootBlocks: false,
		isFullyPublic: false,
		hasAtLeastOnePublicBlockAnywhereInTheHierarchy: false, // CHANGEABLE LATER
		hasAtLeastOnePublicLinkedReference: false, // CHANGEABLE LATER
		hasAtLeastOneMentionOfAPublicLinkedReference: false, // CHANGEABLE LATER // TODO VERIFY
		isTitleHidden: false, // CHANGEABLE LATER // TODO VERIFY
		wordCount: 0,
		wordCountOfLinkedMentions: 0,
		wordCountTotal: 0,
	};
}
