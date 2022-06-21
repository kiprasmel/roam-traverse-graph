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

type TestRet = Array<() => any>

export function test(): TestRet {
	const assert = require("assert")
	
	return [
		() => {
			const str      = "#foo bar baz" as const

			const expS: ASS = [
				[B.begin, "#"],
				"foo",
				[B.end, "#"],
				" bar baz",
			]
			const outS: ASS = blockStringToASS(str)
			assert.deepStrictEqual(outS, expS)

			const expT: AST = [
				["#", "foo"],
				" bar baz"
			]
			const outT: AST = ASStoAST(outS)
			assert.deepStrictEqual(outT, expT)
		},
	]
}

if (!module.parent) {
	for (const t of test()) {
		t()
	}
}

