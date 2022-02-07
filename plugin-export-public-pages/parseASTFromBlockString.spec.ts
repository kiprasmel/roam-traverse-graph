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
		[
			"parses block-level linked reference (())",
			"hey there block ((yWLdNLpH0)) good lookin", //
			[
				["text", "hey there block "], //
				["linked-reference/(())", ["text", "yWLdNLpH0"]],
				["text", " good lookin"], //
			],
		],
		//
		[
			"parses italics formatting",
			"free __icecream__ everybody!",
			[
				["text", "free "],
				["formatting/____", ["text", "icecream"]],
				["text", " everybody!"],
			],
		],
		[
			"parses bold formatting",
			"free **icecream** everybody!",
			[
				["text", "free "],
				["formatting/****", ["text", "icecream"]],
				["text", " everybody!"],
			],
		],
		[
			"parses strike-thru formatting",
			"free ~~icecream~~ everybody!",
			[
				["text", "free "],
				["formatting/~~~~", ["text", "icecream"]],
				["text", " everybody!"],
			],
		],
		[
			"parses highlight (mark) formatting",
			"free ^^icecream^^ everybody!",
			[
				["text", "free "],
				["formatting/^^^^", ["text", "icecream"]],
				["text", " everybody!"],
			],
		],
	];

	for (const [should, input, expectedOutput] of testcases) {
		it(should, () => {
			expect(testcase(input)).toStrictEqual(expectedOutput);
		});
	}
});
