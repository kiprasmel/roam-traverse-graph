import assert from "assert"

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

const boundaries = {
	...beginBoundaries
} as const

type Boundary = keyof typeof boundaries

function is(b: Boundary, pos: number, str: string): boolean {
	//if (b.length === 1) {
	//	return str[pos] === b
	//}

	for (let i = 0; i < b.length; i++) {
		if (str[pos + i] !== b[i]) {
			return false
		}
	}
	return true
}

const boundaryKeys: Boundary[] = Object.keys(boundaries) as Boundary[] // TODO TS

function isToken(pos: number, str: string): false | Boundary {
	// TODO OPTIMIZE
	for (const key of boundaryKeys) {
		if (is(key, pos, str)) return key
	}
	return false

	// if (is("::", pos, str)) return [true, "::"]
	// if (is("#[[", pos, str)) return [true, "#[["]
	// if (is("[[", pos, str)) return [true, "[["]
	// if (is("#", pos, str)) return [true, "#"]
	// if (is("`", pos, str)) return [true, "`"]
	// if (is("```", pos, str)) return [true, "```"]
	// if (is("__", pos, str)) return [true, "__"]
	// if (is("**", pos, str)) return [true, "**"]
	// if (is("~~", pos, str)) return [true, "~~"]
	// if (is("^^", pos, str)) return [true, "^^"]
	// /**
	//  * TODO: verify that all tokens have been checked w/ types
	//  * (or just have tests?)
	// */
	// else {
	// 	return [false, null]
	// }
}

enum B {
	"text"  = 0,
	"begin" = 1,
	"end"   = 2,
}
noop(humanKind)
function humanKind(b: B): "text" | "begin" | "end" {
	return (["text", "begin", "end"] as const)[b]
}

// type TextNode = string
type TextNode = readonly [B.text, string]
type BoundaryNode = readonly [B.begin | B.end, Boundary]

type StackNode = TextNode | BoundaryNode
/** abstract syntax __stack__ */
type ASS = StackNode[]

type TreeTextNode = string
type TreeBoundaryNode = [Boundary, ...TreeNode[]]
type TreeNode = TreeTextNode | TreeBoundaryNode
/** abstract syntax __tree__ */
type AST = TreeNode[]

export function blockStringToASS(str: string): ASS {
	const tokens: ASS = []

	for (let pos = 0; pos < str.length; pos++) {
		let token = isToken(pos, str)
		log({ token, tokens })

		if (!token) {
			const origPos = pos

			do {
				log({ pos, str_pos: str[pos] })
				token = isToken(++pos, str)
			} while (!token && pos < str.length)

			tokens.push([B.text, str.slice(origPos, pos)])
		}

		/**
		 * decouple from previous to make faster,
		 * instead of having to decrement `pos`
		 * & re-run 1 additional loop cycle
		*/
		if (token) {
			log({ pos, str_pos: str[pos], token })

			tokens.push([B.begin, token])
			pos += token.length - 1;
		}
	}

	log("ret tokens", tokens)

	return tokens
	/*
	return [ // TODO
			[B.begin, "[["],
				[B.text, "foo"],
				[B.begin, "`"],
					[B.text, "kek"],
				[B.end, "`"],
				[B.text, "w"],
			[B.end, "[["],
			[B.text, " bar baz"],
		]
	*/
}

export function assertNever(x: never): never {
	throw new Error(`expected x to be never, but got ${x}`)
}

noop(log)
function log(...xs: any[]): void {
	if (!!process.env.DEBUG) {
		console.log(...xs)
	}
}

export function ASStoAST(ass: ASS): AST {
	return loop(0)[0]
	//const r = loop(0)
	//log(JSON.stringify(r, null, 2))
	//return r[0]

	function loop(initialPos: number): [ast: AST, processedCount: number] {
		let ast: AST = []
		let stack: Boundary[] = [] // when to return
	
		for (let pos = initialPos; pos < ass.length; pos++) {
			const node: StackNode = ass[pos]
			const [kind, value] = node

			//log({ initialPos, pos, kind: humanKind(kind), value })
	
			if (kind === B.text) {
				ast.push(value)
			} else if (kind === B.begin) {
				stack.push(value as Boundary) // TODO TS `is`
				const [childAST, processedCount] = loop(pos + 1)

				const tmp: TreeBoundaryNode = [value as Boundary, ...childAST] // TODO OPTIMIZE // TODO TS `is`
				ast.push(tmp)

				pos += processedCount - 1 // -1 because next loop cycle will increment
			} else if (kind === B.end) {
				if (stack.length) {
					const last = stack.pop()
					assert.deepStrictEqual(last, value)

					/** can continue parsing */
				} else {
					/** cannot continue parsing anymore - our current stack is done */

					const processedCount = pos - initialPos + 1 // + 1 because started at + 1
					//log({ pos, initialPos, processedCount })
					return [ast, processedCount]
				}
			} else {
				assertNever(kind)
			}
		}

		assert.deepStrictEqual(stack.length, 0)
	
		return [ast, ass.length - 1]
	}
}

export function blockStringToAST(str: string): AST {
	return ASStoAST(blockStringToASS(str))
}

type TestData = readonly [str: string, expTree: AST, expStack?: ASS]
type TestRet = TestData[]

function runTest([str, expTree, expStack]: TestData) {
	console.log("run test:", str)

	const outStack: ASS = blockStringToASS(str)
	const outTree: AST = ASStoAST(outStack)

	assert.deepStrictEqual(outTree, expTree)

	if (expStack) {
		assert.deepStrictEqual(outStack, expStack)
	}
}

function runTests() {
	for (const testData of tests) {
		runTest(testData)
	}
}

export const tests: TestRet = [
	[
		"[[foo `kek` w]] bar baz",
		[
			["[[",
				"foo ",
				["`",
					"kek"
				],
				" w",
			],
			" bar baz"
		],
		[
			[B.begin, "[["],
				[B.text, "foo "],
				[B.begin, "`"],
					[B.text, "kek"],
				[B.end, "`"],
				[B.text, " w"],
			[B.end, "[["],
			[B.text, " bar baz"],
		],
	],
]

export function noop(..._xs: any[]): void {
	// do nothing
}

if (!module.parent) {
	runTests()
}

