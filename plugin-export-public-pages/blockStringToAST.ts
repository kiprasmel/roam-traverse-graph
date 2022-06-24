import assert from "assert"

export const codeblockBeginBoundaries = {
	"```": "```",
	"`": "`",
} as const
export const commandBeginBoundaries = {
	"{{": "}}",
} as const
export const LLBeginBoundaries = {
	"::": "::", // edge-case
	"#[[": "]]",
	"[[": "]]",
	"#": "#", // edge-case
} as const
export const formattingBeginBoundaries = {
	"__": "__",
	"**": "**",
	"~~": "~~",
	"^^": "^^",
} as const
export const beginBoundaries = {
	...codeblockBeginBoundaries,
	...commandBeginBoundaries,
	...LLBeginBoundaries,
	...formattingBeginBoundaries,
} as const

export const codeblockEndBoundaries = {
	[codeblockBeginBoundaries["```"]]: "```",
	[codeblockBeginBoundaries["`"]]: "`",
} as const
export const commandEndBoundaries = {
	[commandBeginBoundaries["{{"]]: "{{",
} as const
export const LLEndBoundaries = {
	// // "::": {}, // edge-case
	[LLBeginBoundaries["[["]]: ["[[", "#[["], // "]]": {},
	// // "]]": {}, // duplicate
	// // "#": {}, // edge-case
} as const
export const formattingEndBoundaries = {
	[formattingBeginBoundaries["__"]]: "__",
	[formattingBeginBoundaries["**"]]: "**",
	[formattingBeginBoundaries["~~"]]: "~~",
	[formattingBeginBoundaries["^^"]]: "^^",
} as const
export const endBoundaries = {
	...codeblockEndBoundaries,
	...commandEndBoundaries,
	...LLEndBoundaries,
	...formattingEndBoundaries,
} as const

export const boundaries = {
	...beginBoundaries,
	...endBoundaries,
} as const

export type BeginBoundary = keyof typeof beginBoundaries
export type EndBoundary = keyof typeof endBoundaries
export type Boundary = BeginBoundary | EndBoundary

export const boundaryKeys: Boundary[] = Object.keys(boundaries) as Boundary[] // TODO TS

export const extras = {
	["#"]: {
		discontinueIfEncounter: [
			...boundaryKeys,
			" ",
		] as string[],
		doesNotHaveEnd: true,
	},
	["::"]: {
		doesNotHaveBegin: true,
	}
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
export type TextNode = readonly [B.text, string]
export type BoundaryNode = readonly [B.begin | B.end, Boundary]

export type StackNode = TextNode | BoundaryNode
/** abstract syntax __stack__ */
export type ASS = StackNode[]

export type TreeTextNode = string
export type TreeBoundaryNode = [Boundary, ...TreeNode[]]
export type TreeNode = TreeTextNode | TreeBoundaryNode
/** abstract syntax __tree__ */
export type AST = TreeNode[]

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
				pos += token.length - 1

				const origPos = pos + 1
				
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
								if (isWithoutText(tokens, token)) {
									tokens.push([B.text, ""])
								}

								tokens.push([B.end, token])
								pos += token.length
								found = true
								break
							} else if (kind === B.end) {
								tokens.push([B.begin, token])
								pos += token.length
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

					if (isWithoutText(tokens, token)) {
						tokens.push([B.text, ""])
					}

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

/**
 * [[]]  -> true
 * [[a]] -> false
 * 
 * {{[[]]}}  -> true
 * {{[[a]]}} -> false
 * 
 * __**^^~~{{[[]]}}~~^^**__  -> true
 * 
 * __a**^^~~{{[[]]}}~~^^**__ -> false
 * __**a^^~~{{[[]]}}~~^^**__ -> false
 * __**^^a~~{{[[]]}}~~^^**__ -> false
 * __**^^~~a{{[[]]}}~~^^**__ -> false
 * __**^^~~{{a[[]]}}~~^^**__ -> false
 * __**^^~~{{[[a]]}}~~^^**__ -> false
 * __**^^~~{{[[]]a}}~~^^**__ -> false
 * __**^^~~{{[[]]}}a~~^^**__ -> false
 * __**^^~~{{[[]]}}~~a^^**__ -> false
 * __**^^~~{{[[]]}}~~^^a**__ -> false
 * __**^^~~{{[[]]}}~~^^**a__ -> false
 * 
 * 
 * 
 * 
 *  TODO OPTIMIZE:
 * - take in the `latestIndexWithText` (track in caller)
 * - take in a `latestBeginningOfKind` (track in caller)
 * 
 */
function isWithoutText(tokens: ASS, token: Boundary): boolean {
	let latestIndexWithText = -1;
	for (let x = tokens.length - 1; x >= 0; x--) {
		const t = tokens[x]
		if (t && t[0] === B.text) {
			latestIndexWithText = x
			break
		}
	}

	let latestBeginIndex = -1
	for (let x = tokens.length - 1; x >= 0; x--) {
		const t = tokens[x]
		const beginBoundary = endBoundaries[token as keyof typeof endBoundaries]

		const isBegin = t[1] === beginBoundary
		const isOneOfBegin = Array.isArray(beginBoundary) && beginBoundary.some(x => x === t[1])
		const matchesBegin = isBegin || isOneOfBegin

		if (t && t[0] === B.begin && matchesBegin) {
			latestBeginIndex = x
			break
		}
	}

	// const previous = tokens[tokens.length - 1]
	// const isEmpty = previous[0] === B.begin && previous[1] === token
	// log({previous, token, isEmpty})

	const isEmpty = latestIndexWithText < latestBeginIndex
	log({ token, isEmpty, latestIndexWithText, latestBeginIndex, })

	return isEmpty
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
	],

	[
		"**hello** there, __how__ are ^^you^^ ~~feeling~~ doing?",
		[
			["**",
				"hello"
			],
			" there, ",
			["__",
				"how"
			],
			" are ",
			["^^",
				"you"
			],
			" ",
			["~~",
				"feeling"
			],
			" doing?"
		]
	],

	[
		"some empty thingies `` **** [[]] #[[]] {{}} {{[[]]}} ?",
		[
			"some empty thingies ",
			["`", ""],
			" ",
			["**", ""],
			" ",
			["[[", ""],
			" ",
			["#[[", ""],
			" ",
			["{{", ""],
			" ",
			["{{",
				["[[", ""]
			],
			" ?",
		]
	]
]

export function noop(..._xs: any[]): void {
	// do nothing
}

if (!module.parent) {
	runTests()
}
