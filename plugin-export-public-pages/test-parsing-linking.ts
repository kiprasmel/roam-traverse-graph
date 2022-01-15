#!/usr/bin/env ts-node-dev

import fs from "fs";

import { Depth } from "../traverseBlockRecursively";

import { getLinkedReferences } from "./findLinkedReferencesOfABlock";
import { parseASTFromBlockString } from "./parseASTFromBlockString";

// const getBlock = (): Block => ({});

const blockWithAST = parseASTFromBlockString({})(
	{
		"edit-email": "",
		"edit-time": new Date().getTime(),
		metadata: {},
		uid: "",
		string: "{{[[TODO]]}} [[roam-traverse-graph]] aayyyy lmao kek, #nice [[oh fuck [[what is this]]]] #nice",
	},
	undefined,
	Depth.ROOT_LEVEL_BLOCK
);

const linkedRefsDeep = getLinkedReferences((blockWithAST as any).metadata.stackTree);

console.log({ blockWithAST, metadata: (blockWithAST as any).metadata, linkedRefsDeep });

fs.writeFileSync("meta.json", JSON.stringify((blockWithAST as any).metadata, null, 2));
