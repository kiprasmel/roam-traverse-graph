import assert from "assert"

const codeblockBeginBoundaries = {
	"```": "```",
	"`": "`",
} as const
const commandBeginBoundaries = {
	"{{": "}}",
} as const
const LLBeginBoundaries = {
	"::": "::", // edge-case
	"#[[": "]]",
	"[[": "]]",
	"#": "#", // edge-case
} as const
const formattingBeginBoundaries = {
	"__": "__",
	"**": "**",
	"~~": "~~",
	"^^": "^^",
} as const
const beginBoundaries = {
	...codeblockBeginBoundaries,
	...commandBeginBoundaries,
	...LLBeginBoundaries,
	...formattingBeginBoundaries,
} as const

const codeblockEndBoundaries = {
	[codeblockBeginBoundaries["```"]]: "`",
	[codeblockBeginBoundaries["`"]]: "`",
} as const
const commandEndBoundaries = {
	[commandBeginBoundaries["{{"]]: "{{",
} as const
const LLEndBoundaries = {
	// // "::": {}, // edge-case
	[LLBeginBoundaries["[["]]: "[[", // "]]": {},
	// // "]]": {}, // duplicate
	// // "#": {}, // edge-case
} as const
const formattingEndBoundaries = {
	[formattingBeginBoundaries["__"]]: {},
	[formattingBeginBoundaries["**"]]: {},
	[formattingBeginBoundaries["~~"]]: {},
	[formattingBeginBoundaries["^^"]]: {},
} as const
const endBoundaries = {
	...codeblockEndBoundaries,
	...commandEndBoundaries,
	...LLEndBoundaries,
	...formattingEndBoundaries,
} as const

const boundaries = {
	...beginBoundaries,
	...endBoundaries,
} as const

type BeginBoundary = keyof typeof beginBoundaries
type EndBoundary = keyof typeof endBoundaries
type Boundary = BeginBoundary | EndBoundary

const boundaryKeys: Boundary[] = Object.keys(boundaries) as Boundary[] // TODO TS

const extras = {
	["#"]: {
		discontinueIfEncounter: [
			...boundaryKeys,
			" ",
		] as string[]
	},
} as const

// TODO rename to "isSubstr"
function is(substr: string, pos: number, str: string): substr is Boundary {
	//if (b.length === 1) {
	//	return str[pos] === b
	//}

	for (let i = 0; i < substr.length; i++) {
		if (str[pos + i] !== substr[i]) {
			return false
		}
	}
	return true
}

function isToken(pos: number, str: string): false | Boundary {
	// TODO OPTIMIZE
	for (const key of boundaryKeys) {
		if (is(key, pos, str)) {
			/** yes, it is, unless an edge-case says it's not */

			/** edge-cases */
			if (key === "#") {
				const isLastChar: boolean = pos + 1 === str.length
				const willInstantlyDiscontinue: boolean = extras["#"].discontinueIfEncounter.includes(str[pos + 1])

				const isNotAToken = isLastChar || willInstantlyDiscontinue

				return isNotAToken ? false : key
			}

			return key
		}

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

			/** everything before & up until, but not including, the current pos */
			tokens.push([B.text, str.slice(origPos, pos)])
		}

		/**
		 * decouple from previous to make faster,
		 * instead of having to decrement `pos`
		 * & re-run 1 additional loop cycle
		*/
		if (token) {
			/**
			 * edge-cases
			 */
			if (token === "```" || token === "`") {
				/**
				 * everything inside should be considered as regular text,
				 * instead of continuing to parse the contents.
				 *
				*/

				const wanted = token === "```"	
					? "```"
					: token === "`"
					? "`"
					: assertNever(token)

				tokens.push([B.begin, token])
				pos += token.length

				const origPos = pos
				
				while (!is(wanted, ++pos, str) && pos < str.length) {
					log({ pos, str_pos: str[pos] })
				}

				if (!is(wanted, pos, str)) {
					// EOF, incorrect syntax (no finish)
					throw new Error(`reached EOF and couldn't find ${wanted}. str = ${str}`)
				} else {
					tokens.push([B.text, str.slice(origPos, pos)])

					tokens.push([B.end, wanted])
					pos += wanted.length
				}

				--pos // next loop cycle
			} else if (token === "::") {
				// add to very beginning
				tokens.unshift([B.begin, token])
				// does not modify `pos`

				tokens.push([B.end, token])
				pos += token.length

				--pos // next loop cycle
			} else if (token === "#") {
				// probably the worst to parse

				tokens.push([B.begin, token])
				pos += token.length

				const origPos = pos

				while (++pos < str.length && !extras["#"].discontinueIfEncounter.some(x => is(x, pos, str))) {
					log({ pos, str_pos: str[pos] })
				}

				tokens.push([B.text, str.slice(origPos, pos)])
				tokens.push([B.end, token])

				--pos // next loop cycle
			} else {
				const isBegin = token in beginBoundaries
				const isEnd = token in endBoundaries
				const isBoth = isBegin && isEnd

				log({ isBegin, isEnd, isBoth })

				if (isBoth) {
					/**
					 * TODO currently assumes that no nesting
					 *
					 * tho this should be fine? i.e.:
					 * for formatting - you don't nest
					 * for code blocks - neither
					 * only other repeating option would be linked references [[]] or #[[]],
					 * but imo the nesting there would be broken by design,
					 * so then fine afaik
					 *
					*/
					
					let found = false
					for (let tmp = tokens.length - 1; tmp >= 0; tmp--) {
						const [kind, value] = tokens[tmp]

						if (value === token) { // TODO check for opposite
							if (kind === B.begin) {
								tokens.push([B.end, token])
								found = true
								break
							} else if (kind === B.end) {
								tokens.push([B.begin, token])
								found = true
								break
							} else if (kind === B.text) {
								// TODO should be impossible / never
								throw new Error("should be impossible to have a token w/ a `kind` of `text`")
							} else {
								assertNever(kind)
							}
						}
					}

					if (!found) {
						tokens.push([B.begin, token])
						pos += token.length
					}
				}
				else if (isBegin) {
					tokens.push([B.begin, token])
					pos += token.length
				}
				else if (isEnd) {
					tokens.push([B.end, token])
					pos += token.length
				} else {
					throw new Error("impossible")
				}

				--pos // next loop cycle

				log({ pos, str_pos: str[pos], token })
			}
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
		// allow lazy if heavy computation (so that won't affect if DEBUG disabled)
		const called = xs.map(x => x instanceof Function ? x() : x)

		console.log(...called)
	}
}

export function ASStoAST(ass: ASS): AST {
	const r = loop(0)
	log(() => JSON.stringify(r, null, 4))
	return r[0]

	function loop(initialPos: number): [ast: AST, processedCount: number] {
		let ast: AST = []
		let stack: BeginBoundary[] = [] // when to return
	
		for (let pos = initialPos; pos < ass.length; pos++) {
			const node: StackNode = ass[pos]
			const [kind, value] = node

			//log({ initialPos, pos, kind: humanKind(kind), value })
	
			if (kind === B.text) {
				ast.push(value)
			} else if (kind === B.begin) {
				stack.push(value as BeginBoundary) // TODO TS `is`
				const [childAST, processedCount] = loop(pos + 1)

				const tmp: TreeBoundaryNode = [value as Boundary, ...childAST] // TODO OPTIMIZE // TODO TS `is`
				ast.push(tmp)

				pos += processedCount - 1 // -1 because next loop cycle will increment
			} else if (kind === B.end) {
				if (stack.length) {
					const last: BeginBoundary = stack.pop()! // TODO TS
					const lastTarget: EndBoundary = beginBoundaries[last] as EndBoundary // TODO TS
					assert.deepStrictEqual(lastTarget, value)

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

		assert.deepStrictEqual(stack.length, 0, `stack not empty, but should be. ${stack}`)
	
		return [ast, ass.length - 1]
	}
}

export function blockStringToAST(str: string): AST {
	return ASStoAST(blockStringToASS(str))
}

type TestData = readonly [str: string, expTree: AST, expStack?: ASS]
type TestRet = TestData[]

function runTest([str, expTree, expStack]: TestData) {
	console.log("\nrun test:", str)

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
		"[[foo `kek` w]] bar baz ```javascript\nconsole.log('#hajeet')```yes",
		[
			["[[",
				"foo ",
				["`",
					"kek"
				],
				" w",
			],
			" bar baz ",
			["```",
				"javascript\nconsole.log('#hajeet')"
			],
			"yes",
		],
	],

	[
		"ayyy `lmao` xdd:: waddup?",
		[
			["::",
				"ayyy ",
				["`",
					"lmao",
				],
				" xdd",
			],
			" waddup?",
		]
	],

	[
		"this is working pretty well! #roam-traverse-graph lfg",
		[
			"this is working pretty well! ",
			["#",
				"roam-traverse-graph",
			],
			" lfg",
		]
	],
	[
		"#lets#do #some[[weird]] #stuff#[[yo]] #[[ho]] #yes hehe #  x# # ###",
		[
			["#",
				"lets",
			],
			["#",
				"do",
			],
			" ",
			["#",
				"some",
			],
			["[[",
				"weird",
			],
			" ",
			["#",
				"stuff",
			],
			["#[[",
				"yo",
			],
			" ",
			["#[[",
				"ho",
			],
			" ",
			["#",
				"yes",
			],
			" hehe #  x# # ###",
		]
	],
	[
		"{{[[TODO]]}} #read about the good stuff [[high signal]]",
		[
			["{{",
				["[[",
					"TODO"
				]
			],
			" ",
			["#",
				"read"
			],
			" about the good stuff ",
			["[[",
				"high signal"
			]
		]
	]
]

export function noop(..._xs: any[]): void {
	// do nothing
}

if (!module.parent) {
	runTests()
}
