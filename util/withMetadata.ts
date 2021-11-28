/* eslint-disable indent */

import { Block, RO } from "../types";

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
	if (!("metadata" in block)) (block as Block<M0 & M2, {}>).metadata = {} as M0 & M2;

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

	/**
	 * instead of correct typescript types & spreading,
	 * we use this to avoid modifying the reference of the block object
	 * & it's metadata object.
	 */
	Object.entries(meta).forEach(([key, value]) => {
		/**
		 * TODO we could even verify here that the key is not already in block.metadata.
		 */
		(block.metadata as any)[key] = value;
	});

	// const newMetadata: ToReadonlyObject<M0 & M1 & M2> = {
	// 	// const newMetadata: ToReadonlyObject<M0> & ToReadonlyObject<M1> = {
	// 	...block.metadata,
	// 	...meta,
	// } as const;

	// const newBlock: Block<M0 & M1 & M2, M1> = {
	// 	...(block as Block<M0 & M2, any>), // TODO TS VERIFY
	// 	// ...block,
	// 	metadata: newMetadata,
	// 	// metadata: {
	// 	// 	...block.metadata,
	// 	// 	...meta,
	// 	// },
	// };

	return block as Block<M0 & M1 & M2, M0>;
};
