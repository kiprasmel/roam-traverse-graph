import { MutatingActionToExecute } from "../traverseBlockRecursively";

import { withMetadata } from "../util/withMetadata";

export const parseASTFromBlockString: MutatingActionToExecute<
	{},
	{
		stack: Stack;
		stackTree: StackTree;
	}
> = () => (block) => {
	let a;
	//

	return withMetadata({
		stack: stackWithTextInsteadOfChars,
		stackTree,
	})(block);
};
