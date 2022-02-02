import fs from "fs";

import { MutatingActionToExecute } from "../traverseBlockRecursively";

import { ReadonlyTuple, Tuple } from "../util/tuple";
import { withMetadata } from "../util/withMetadata";

const boundaries = [
	{
		begin: "```",
		end: "```",
		type: "code-block",
		kind: "whole",
		utype: "code-block/whole",
	},
	{
		begin: "`",
		end: "`",
		type: "code-block",
		kind: "inline",
		utype: "code-block/inline",
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
		utype: "linked-reference/::",
	},
	{
		begin: "#[[",
		end: "]]",
		type: "linked-reference",
		kind: "#[[]]",
		utype: "linked-reference/#[[]]",
		// parse: (s: string): boolean => {
		// 	//
		// },
	},
	{
		begin: "[[",
		end: "]]",
		type: "linked-reference",
		kind: "[[]]",
		utype: "linked-reference/[[]]",
	},
	/**
	 * TODO FIXME:
	 */
	{
		// TODO FIXME links with #
		begin: "#",
		/**
		 * these seem like they should be separated out,
		 * but actually both of them will always be the same, no?
		 */
		// doesNotConsumeEnding: true,
		// allowUnfinished: true,
		/**
		 * furthermore, this should implicitly be assumed true
		 * if the `end` is an array, instead of a string,
		 * because what it comes down to is being able to
		 * deterministically select the ending token,
		 * and that's only possible if there's only 1 of them.
		 */
		doesNotConsumeEndingAndThusAlsoAllowsUnfinished: true,
		/**
		 * probably a shitton more -_-
		 */
		end: [
			" ", //
			",",
			"~",
			"!",
			"#",
			"$",
			"%",
			"^",
			"&",
			"(",
			")",
			"[",
			"]",
			"+",
			"=",
			'"',
			"?",
			";",
			">" /** TODO FIXME TEMP until Quote is parsed */,
			"<",
			// "'" /** TODO FIXME TEMP WORKAROUND */,
		],
		// end: " ", // TODO FIXME - use above
		type: "linked-reference",
		kind: "#",
		utype: "linked-reference/#",
		// allowUnfinished: true,
	},
	//
	{
		begin: "{{",
		end: "}}",
		type: "command",
		utype: "command",
		// allowUnfinished: false, // testing
	},
	//
] as const;

export type Boundary = typeof boundaries[number];

export type StackItemWIP =
	| Tuple<"char", string> //
	| Tuple<"begin" | "end", Boundary>;

export type StackWIP = StackItemWIP[];

export type StackItem =
	| ReadonlyTuple<"text", string> //
	| ReadonlyTuple<"begin" | "end", Boundary>;

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
	const stackOfBegins: Boundary[] = [];
	/**
	 * returns if end matched begin
	 */
	const popStackIfEndMatchesBegin = (b: Boundary): boolean => {
		const last = stackOfBegins[stackOfBegins.length - 1];

		if (!last || last.begin !== b.begin) {
			return false;
		}

		stackOfBegins.pop();

		return true;
	};

	function parseUntil(from: string | null, until: string | null | readonly string[]): void {
		const advance = (n: number): string => ((cursor += n), originalString.slice(cursor));

		const str: string = advance(0);
		const startsWith = (s: string | readonly string[]): boolean =>
			Array.isArray(s) ? s.some((ss) => ss === str.slice(0, ss.length)) : s === str.slice(0, s.length);

		const startsWithCurr = (s: string): boolean => s === originalString.slice(cursor, s.length);

		const foundNonText: boolean = boundaries.some((b): boolean => {
			if (b.begin === null && b.end === null) {
				throw new Error("begin & end cannot both be null");
			} else if (b.begin === null) {
				if (startsWith(b.end)) {
					/**
					 * need everything from very beginning up until now
					 */

					stack.unshift(["begin", b]);
					advance(0);

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
					stackOfBegins.push(b);

					// @ts-expect-error
					advance(b.begin.length);

					// @ts-expect-error
					parseUntil(b.begin, null);

					stack.push(["end", b]);

					return popStackIfEndMatchesBegin(b);
				}
			} else if (startsWith(b.begin)) {
				if (b.type === "linked-reference" && b.kind === "#") {
					/**
					 * cannot start a new tag w/o a space (unless first char)
					 */
					if (cursor > 0 && originalString[cursor - 1] !== " ") {
						return false;
					}
				}

				if (b.begin === b.end && b.end === until) {
					/**
					 * do NOT advance NOR push here
					 * because once we return,
					 * the stuff right below us will activate
					 * & do the work there.
					 */

					if (!popStackIfEndMatchesBegin(b)) {
						return false;
					}

					stack.push(["end", b]);
					advance(b.end.length);

					return true;
				}

				stack.push(["begin", b]);
				stackOfBegins.push(b);

				advance(b.begin.length);

				if (b.type === "code-block") {
					while (!startsWithCurr(b.end)) {
						const char = advance(0);
						if (!char || !char[0]) break;
						stack.push(["char", char[0]]);
						advance(1);
					}

					// TODO TEMP REMOVE
					if (!popStackIfEndMatchesBegin(b)) {
						return false;
					}

					stack.push(["end", b]);
					advance(b.end.length);

					return true;
				}

				parseUntil(b.begin, b.end);

				return true;
			} else if (startsWith(b.end)) {
				// /**
				//  * TODO apply this for all places where `end` is being pushed
				//  * TODO have proper stack of what's available & pop it
				//  */
				// let lastNonChar;
				// for (let s = stack.length - 1; s >= 0; s--) {
				// 	if (stack[s][0] !== "char") {
				// 		lastNonChar = stack[s];
				// 		break;
				// 	}
				// }
				// if (!lastNonChar || lastNonChar[0] !== "begin" || lastNonChar[1].type !== b.type) {
				// 	return false;
				// }

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
					if (!popStackIfEndMatchesBegin(b)) {
						return false;
					}
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

	while (stackOfBegins.length) {
		console.log({
			stackOfBegins: stackOfBegins.map((b) => b.type),
			blockStrOrig: (block.metadata as any).originalString,
			blockStr: block.string,
			block,
			stack: stack.map((y) => (y[0] === "char" ? y[1] : y[0] + "__" + y[1].type)),
		});

		const last = stackOfBegins.pop()!;

		if (
			"doesNotConsumeEndingAndThusAlsoAllowsUnfinished" in last &&
			last.doesNotConsumeEndingAndThusAlsoAllowsUnfinished
		) {
			stack.push(["end", last]);
		} else {
			fs.writeFileSync(`unmatch/${last.type}`, "");
			// throw new Error(
			// 	"leftover unmatched begin's (no matching end's)" + //
			// 		"\n" +
			// 		"last (current) unmatched begin: " +
			// 		last.type +
			// 		"\n" +
			// 		"remaining: " +
			// 		stackOfBegins.map((begin) => begin.type).join(", ")
			// );
		}
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
