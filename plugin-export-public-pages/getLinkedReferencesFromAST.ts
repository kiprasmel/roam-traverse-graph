#!/usr/bin/env ts-node-dev

import assert from "assert";

import {
	Boundary, //
	TreeBoundaryNode,
	LLBeginBoundaries,
	beginBoundaries,
	BeginBoundary,
	blockStringToAST,
	AST,
} from "./blockStringToAST";

export type InternalLL = [boundary: Boundary, mid: string, isDirectChild: boolean]

export const getLinkedReferences = (AST: AST): string[] =>
	getLinkedReferencesInternal(AST).map((ll: InternalLL) => ll[1]);

export const getLinkedReferencesInternal = (
	AST: AST //
): InternalLL[] =>
	AST.map((item) => {
		if (typeof item === "string") return [];

		const [boundary, ...children]: TreeBoundaryNode = item;

		const isBegin: boolean = boundary in LLBeginBoundaries;
		if (!isBegin) {
			return getLinkedReferencesInternal(children);
		}

		let curr: string = "";
		const allLowers: InternalLL[][] = [];

		for (const c of children) {
			if (typeof c === "string") {
				curr += c;
			} else {
				const lowers: InternalLL[] = getLinkedReferencesInternal([c]);

				const lowersButNoLongerDirectChildren: InternalLL[] = lowers.map((l) => [l[0], l[1], false]);
				allLowers.push(lowersButNoLongerDirectChildren);

				for (const [begin, mid, isDirectChild] of lowers) {
					if (!isDirectChild) {
						continue;
					}

					const end = beginBoundaries[begin as BeginBoundary];
					const decorated = begin + mid + end;

					curr += decorated;
				}
			}
		}

		const ret: InternalLL[] = [...allLowers.flat(), [boundary, curr, true]];
		return ret;
	}).flat();

if (!module.parent) {
	assert.deepStrictEqual(getLinkedReferences(blockStringToAST("a [[b c [[d e]] [[f g]] h]] i")), [
		"d e",
		"f g",
		"b c [[d e]] [[f g]] h",
	]);

	assert.deepStrictEqual(getLinkedReferences(blockStringToAST("a [[b c [[d e [[f g]] [[h i]] j]] k]] l")), [
		"f g",
		"h i",
		"d e [[f g]] [[h i]] j",
		"b c [[d e [[f g]] [[h i]] j]] k",
	]);
}
