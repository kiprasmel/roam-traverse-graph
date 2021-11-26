import { Block, RO, ToReadonlyObject } from "../types";

/**
 * M0 - existing metadata;
 * M1 - new metadata.
 *
 */
export function withMetadata<
	M0 extends RO = RO, //
	M1 extends RO = RO
>(block: Block<M0, {}>, meta: M1): Block<M0, M1> {
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

	// const newMetadata: ToReadonlyObject<M0 & M1> = {
	const newMetadata: ToReadonlyObject<M0> & ToReadonlyObject<M1> = {
		...block.metadata,
		...meta,
	} as const;

	const newBlock: Block<M0, M1> = {
		...block,
		metadata: newMetadata,
	};

	return newBlock;
}
