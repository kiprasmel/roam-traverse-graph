import { MutatingActionToExecute } from "../traverseBlockRecursively";

import { Tuple } from "../util/tuple";
import { withMetadata } from "../util/withMetadata";

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
	/**
	 * TODO FIXME:
	 */
	// {
	// 	begin: "#",
	// 	// end: [" ", ".", ":", "'"],
	// 	end: " ", // TODO FIXME - use above
	// 	type: "linked-reference",
	// 	kind: "#",
	// 	// TODO "allow unfinished"
	// },
	//
	{
		begin: "{{",
		end: "}}",
		type: "command",
	},
	//
] as const;

export type Boundary = typeof boundaries[number];

export type StackItemWIP =
	| Tuple<"char", string> //
	| Tuple<"begin" | "end", Boundary>;

export type StackWIP = StackItemWIP[];

export type StackItem =
	| Tuple<"text", string> //
	| Tuple<"begin" | "end", Boundary>;

export type Stack = StackItem[];

//

export type StackTreeTextItem = {
	type: "text";
	text: string;
};

export type StackTreeBoundaryItem = Boundary & {
	children: StackTreeItem[];
};

export type StackTreeItem = StackTreeTextItem | StackTreeBoundaryItem;

export type StackTree = StackTreeItem[];

export const parseASTFromBlockString: MutatingActionToExecute<
	{},
	{
		stack: Stack;
		stackTree: StackTree;
	}
> = () => (block) => {
	/**
	 * order matters
	 */
	let cursor = 0;
	const originalString: string = block.string;

	// TODO FIXME
	const stack: StackWIP = [];

	function parseUntil(from: string | null, until: string | null): void {
		const advance = (n: number): string => ((cursor += n), originalString.slice(cursor));

		const str: string = advance(0);

		const startsWith = (s: string): boolean => s === str.slice(0, s.length);

		const foundNonText: boolean = boundaries.some((b): boolean => {
			if (b.begin === null && b.end === null) {
				throw new Error("begin & end cannot both be null");
			} else if (b.begin === null) {
				if (startsWith(b.end)) {
					/**
					 * need everything from very beginning up until now
					 */

					stack.unshift(["begin", b]);

					/**
					 * text (or other stuff) have already been parsed
					 */

					stack.push(["end", b]);

					advance(b.end.length);

					return true;
				}
			} else if (b.end === null) {
				/**
				 * until we have an actual use case
				 */
				// @ts-expect-error
				if (startsWith(b.begin)) {
					/**
					 * need everything from now up until the very end
					 */

					stack.push(["begin", b]);
					// @ts-expect-error
					advance(b.begin.length);

					// @ts-expect-error
					parseUntil(b.begin, null);

					stack.push(["end", b]);

					return true;
				}
			} else if (startsWith(b.begin)) {
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

				return true;
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
				/**
				 * TODO optimize, but only after it actually works
				 *
				 * instead of advancing by 1, we could safely go as long as there's no special character,
				 * as specified above.
				 *
				 * though parsing links might be hard then.
				 *
				 * maybe going with a second step, where you only try to parse the link
				 * after you've decided that this is "text", would be more efficient
				 * yet still correct?
				 *
				 * i need to read more CS literature on this topic
				 * because there should be a ton of good resources.
				 */
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

	const [stackWithTextInsteadOfChars, leftoverText] = stack.reduce<Tuple<StackItem[], string>>(
		([acc, tempString], [beginEndChar, item]) =>
			beginEndChar === "char"
				? [acc, tempString + item] //
				: (tempString && acc.push(["text", tempString]), //
				  acc.push([beginEndChar, item as Exclude<typeof item, string>]),
				  [acc, ""]),
		[[], ""]
	);
	if (leftoverText) {
		stackWithTextInsteadOfChars.push(["text", leftoverText]);
	}

	let i = 0;

	const stackTree: StackTreeItem[] = toTree();

	function toTree(): StackTreeItem[] {
		const childrenAtCurrentLevel: StackTreeItem[] = [];

		for (; i < stackWithTextInsteadOfChars.length; i++) {
			const [beginEndText, item] = stackWithTextInsteadOfChars[i];

			if (beginEndText === "text") {
				childrenAtCurrentLevel.push({
					type: "text",
					text: item as Exclude<typeof item, Boundary>,
				});
			} else if (beginEndText === "begin") {
				i++;
				childrenAtCurrentLevel.push({
					...(item as Exclude<typeof item, string>),
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
};
