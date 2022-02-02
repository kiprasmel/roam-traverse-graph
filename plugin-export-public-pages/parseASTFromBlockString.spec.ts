#!/usr/bin/env ts-node-dev

import fs from "fs";

import { Depth } from "../traverseBlockRecursively";
import { Block } from "../types";

import { getLinkedReferences } from "./findLinkedReferencesOfABlock";
import { Boundary, parseASTFromBlockString } from "./parseASTFromBlockString";

// type ASTNodeKey = Boundary["type"] | "text"
// type ASTNodeValue = string | ASTNode
// // type ASTNode = [ASTNodeKey, ASTNodeValue, ASTNode[]?]
// // type ASTNode = [ASTNodeKey, ASTNodeValue]
type ASTNode = [Boundary["type"], string | ASTNode] | ["text", string] | ["text", string, ASTNode]
type AST = ASTNode[]

const createBlock = <M0 = {}, M1 = {}>(string: string, extra = {}): Block<M0, M1> => ({
	"edit-email": "",
	"edit-time": new Date().getTime(),
	uid: "",
	string,
	metadata: {} as any,
	...extra,
});

const input = "{{[[TODO]]}} [[roam-traverse-graph]] aayyyy lmao kek, #nice wait [[oh fuck [[what is this]]]] #nice";

const expected: AST = [
	["command", ["linked-reference", ["text", "TODO"]]], //
	["text", " "],
	["linked-reference", ["text", "roam-traverse-graph"]],
	["text", " aayyyy lmao kek, "],
	["linked-reference", "nice"],
	["text", " wait "],
	["linked-reference", ["text", "oh fuck ", ["linked-reference", ["text", "what is this"]]]],
	["text", " "],
	["linked-reference", ["text", "nice"]],
];

const blockWithAST = parseASTFromBlockString({})(createBlock(input), undefined, Depth.ROOT_LEVEL_BLOCK);

const linkedRefsDeep = getLinkedReferences((blockWithAST as any).metadata.stackTree);

console.log({ blockWithAST, metadata: (blockWithAST as any).metadata, linkedRefsDeep });

fs.writeFileSync("meta.json", JSON.stringify((blockWithAST as any).metadata, null, 2));
