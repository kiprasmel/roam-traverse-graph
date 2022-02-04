import { Triple } from "../util/tuple";

import { AST, testcase /* input1, expected1 */ } from "./test-utils";

// runMany([["should yeet", testcase(input1), expected1]]);

describe("block string AST parser", () => {
	const testcases: Triple<string, string, AST>[] = [
		["parses basic text", "hello world", [["text", "hello world"]]], //
		[
			"parses command {{}}",
			"oh {{very}} nice",
			[
				["text", "oh "],
				["command", ["text", "very"]],
				["text", " nice"],
			],
		],
		[
			"parses linked reference [[]]",
			"look [[TODO]] done",
			[
				["text", "look "],
				["linked-reference/[[]]", ["text", "TODO"]],
				["text", " done"],
			],
		],
		[
			"parses linked reference :: (attribute)",
			"parent but with spaces:: done haha leggo",
			[
				["linked-reference/::", ["text", "parent but with spaces"]],
				["text", " done haha leggo"],
			],
		],
		[
			"parses linked reference #[[]]",
			"look #[[oh-boy]] done",
			[
				["text", "look "],
				["linked-reference/#[[]]", ["text", "oh-boy"]],
				["text", " done"],
			],
		],
		[
			"parses linked reference # when does end with it",
			"look #oh-boy",
			[
				["text", "look "],
				["linked-reference/#", ["text", "oh-boy"]],
			],
		],
		// TODO
		/*
		["parses linked reference # when does NOT end with it", "look #oh-boy done", [
			["text", "look "],
			["linked-reference/#", ["text", "oh-boy"]],
			["text", " done"]
		]],
		*/
		[
			"parses inline code block",
			"hello inline `code block` haha",
			[
				["text", "hello inline "],
				["code-block/inline", ["text", "code block"]],
				["text", " haha"],
			],
		],
		[
			"parses whole code block",
			"hello whole ```code block hehe\nnice``` mhm",
			[
				["text", "hello whole "],
				["code-block/whole", ["text", "code block hehe\nnice"]],
				["text", " mhm"],
			],
		],
	];

	for (const [should, input, expectedOutput] of testcases) {
		it(should, () => {
			expect(testcase(input)).toStrictEqual(expectedOutput);
		});
	}
});
