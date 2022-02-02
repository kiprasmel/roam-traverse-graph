#!/usr/bin/env ts-node-dev

import fs from "fs";
// import assert from "assert";

import { Depth } from "../traverseBlockRecursively";
import { Block } from "../types";

import { getLinkedReferences } from "./findLinkedReferencesOfABlock";
import { Boundary, parseASTFromBlockString, StackTree } from "./parseASTFromBlockString";

// type ASTNodeKey = Boundary["type"] | "text"
// type ASTNodeValue = string | ASTNode
// // type ASTNode = [ASTNodeKey, ASTNodeValue, ASTNode[]?]
// // type ASTNode = [ASTNodeKey, ASTNodeValue]
// type ASTNode = [Boundary["type"], string | ASTNode] | ["text", string] | ["text", string, ASTNode]
type ASTNode = [Boundary["utype"], string | ASTNode] | ["text", string] | ["text", string, ASTNode /* for nested linked references (TODO) */]
type AST = ASTNode[]

const createBlock = <M0 = {}, M1 = {}>(string: string, extra = {}): Block<M0, M1> => ({
	"edit-email": "",
	"edit-time": new Date().getTime(),
	uid: "",
	string,
	metadata: {} as any,
	...extra,
});

const input1 = "{{[[TODO]]}} [[roam-traverse-graph]] aayyyy lmao kek, #nice wait [[oh fuck [[what is this]]]] #sweet";

const expected: AST = [
	["command", ["linked-reference/[[]]", ["text", "TODO"]]], //
	["text", " "],
	["linked-reference/[[]]", ["text", "roam-traverse-graph"]],
	["text", " aayyyy lmao kek, "],
	["linked-reference/#", "nice"],
	["text", " wait "],
	["linked-reference/[[]]", ["text", "oh fuck ", ["linked-reference/[[]]", ["text", "what is this"]]]],
	["text", " "],
	["linked-reference/#", ["text", "sweet"]],
];
console.log(expected);

const createBlockWithAST = (input: string) => parseASTFromBlockString({})(createBlock(input), undefined, Depth.ROOT_LEVEL_BLOCK);
const blockWithAST = createBlockWithAST(input1)
const stackTree: StackTree = (blockWithAST as any).metadata.stackTree;
console.log({blockWithAST, stackTree});

// TODO TS "AST"
// const mapStack = (currStack: Stack): any => currStack.map(([beginEndText, boundaryOrText])=> {
// 	if (beginEndText === "text") {
// 		return ["text", boundaryOrText]
// 	} else {
// 		const boundary = boundaryOrText as Exclude<typeof boundaryOrText, string>

// 		console.log({boundary});
		
// 		return [boundary.utype, mapStack([boundary as any])[0]] // TODO FIXME TS
// 	}
// })

const mapStackTreeToCleanAST = (currStackTree: StackTree): AST => currStackTree.map((node) => {
	if (node.type === "text") {
		return ["text", node.text]
	} else {
		// const boundary = boundaryOrText as Exclude<typeof boundaryOrText, string>

		// console.log({boundary});
		
		// return [boundary.utype, mapStack([boundary as any])[0]] // TODO FIXME TS
		const mapped =  mapStackTreeToCleanAST(node.children)
		// return mapped?.length ?  [node.utype, mapped[0]] : [node.utype]
		/**
		 * TODO VERIFY that works w/ deep nesting, e.g. linked references
		 */
		return mapped.length === 2 ? ["text" /* mapped[0][0] */, mapped[0][1] as string /* node.text */, mapped[1] as ASTNode]  : [node.utype, mapped[0]]
	}
})

const stackMapped = mapStackTreeToCleanAST(stackTree)
fs.writeFileSync("stackMapped.json", JSON.stringify(stackMapped, null, 2))

const linkedRefsDeep = getLinkedReferences((blockWithAST as any).metadata.stackTree);

console.log({ blockWithAST, metadata: (blockWithAST as any).metadata, linkedRefsDeep });

fs.writeFileSync("meta.json", JSON.stringify((blockWithAST as any).metadata, null, 2));

// assert.deepStrictEqual(stackMapped, expected)

export const testcase = input => {
	const blockWithAST = createBlockWithAST(input1)
	const stackTree: StackTree = (blockWithAST as any).metadata.stackTree;
	const stackMapped = mapStackTreeToCleanAST(stackTree)
}
