/* eslint-disable indent */

import { Block, RO, ToReadonlyObject } from "../types";

/**
 * M0 - existing metadata;
 * M1 - new metadata.
 *
 */
export const withMetadata = <
	M1 extends RO = RO, // TODO FIXME TEST
	M0 extends RO = RO //
>(
	meta: M1
) => <M2>(block: Block<M0 & M2, {}>): Block<M0 & M1 & M2, M1> => {
	if (!block.metadata) block.metadata = {} as M0 & M2;

	/**
	 * runtime check.
	 *
	 * should be unnecessary because typescript will not allow
	 * to have duplicate keys with different values.
	 *
	 */
	if (Object.keys(meta).some((key) => key in block.metadata)) {
		throw new Error(
			"overriding metadata (changing the value of a key that's already been assigned) is not allowed. pick a different name for the variable / object parameter."
		);
	}

	const newMetadata: ToReadonlyObject<M0 & M1 & M2> = {
		// const newMetadata: ToReadonlyObject<M0> & ToReadonlyObject<M1> = {
		...block.metadata,
		...meta,
	} as const;

	const newBlock: Block<M0 & M1 & M2, M1> = {
		...(block as Block<M0 & M2, any>), // TODO TS VERIFY
		// ...block,
		metadata: newMetadata,
		// metadata: {
		// 	...block.metadata,
		// 	...meta,
		// },
	};

	return newBlock;
};
