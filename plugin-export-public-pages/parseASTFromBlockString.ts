import { MutatingActionToExecute } from "../traverseBlockRecursively";

import { withMetadata } from "../util/withMetadata";
import { ASS, ASStoAST, AST, blockStringToASS } from "./blockStringToAST";

export const parseASTFromBlockString: MutatingActionToExecute<
	{},
	{
		ASS: ASS;
		AST: AST;
	}
> = () => (block) => {
	// TODO REMOVE ME
	const tmpBlacklist = [
		"it gets called multiple times. i might as well stick to my", //
		"ooh nvm, the sub-branches are still f'ed up,",
		"://", // TODO HANDLE URLS
		// "that's been out there in the last few days -- code blocks / ticks", // TODO SUPPORT EMPTY
		"hook of [[git]] provides the name of the operation (rebase, amend)",
		"hehe, classic mistake of `git pull` after rebase,",
	];
	const str: string = tmpBlacklist.some((x) => block.string.includes(x)) ? "" : block.string;

	const ass: ASS = blockStringToASS(str);
	const ast: AST = ASStoAST(ass);

	return withMetadata({
		ASS: ass,
		AST: ast,
	})(block);
};
