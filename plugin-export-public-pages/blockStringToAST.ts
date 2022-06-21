const LLBeginBoundaries = {
	"::": {},
	"#[[": {},
	"[[": {},
	"#": {},
}
const codeblockBeginBoundaries = {
	"`": {},
	"```": {},
}
const formattingBeginBoundaries = {
	"__": {},
	"**": {},
	"~~": {},
	"^^": {},
}
const beginBoundaries = {
	...LLBeginBoundaries,
	...codeblockBeginBoundaries,
	...formattingBeginBoundaries,
} as const

type Boundary = keyof typeof beginBoundaries

enum B {
	// "text"  = 0,
	"begin" = 1,
	"end"   = 2,
}

type TextNode = string
// type TextNode = readonly [B.text, string]
type BoundaryNode = readonly [B.begin | B.end, Boundary]

type StackNode = TextNode | BoundaryNode
/** abstract syntax __stack__ */
type ASS = StackNode[]

type TreeNode = TextNode | [Boundary, TreeNode]
/** abstract syntax __tree__ */
type AST = TreeNode[]

export function blockStringToASS(_str: string): ASS {
	return [] // TODO
}

export function ASStoAST(_ass: ASS): AST {
	return [] // TODO
}

export function blockStringToAST(str: string): AST {
	return ASStoAST(blockStringToASS(str))
}

type TestData = readonly [str: string, expTree: AST, expStack?: ASS]
type TestRet = TestData[]

function runTest([str, expTree, expStack]: TestData) {
	const assert = require("assert")

	const outStack: ASS = blockStringToASS(str)
	const outTree: AST = ASStoAST(outStack)

	assert.deepStrictEqual(outTree, expTree)

	if (expStack) {
		assert.deepStrictEqual(outStack, expStack)
	}
}

function runTests() {
	for (const testData of test()) {
		runTest(testData)
	}
}

export function test(): TestRet {
	return [
		[
			"#foo bar baz",
			[
				["#", "foo"],
				" bar baz"
			],
			[
				[B.begin, "#"],
				"foo",
				[B.end, "#"],
				" bar baz",
			],
		],
	]
}

if (!module.parent) {
	runTests()
}

