import { Block, RO, ToReadonlyObject, WithMetadata } from "../types";

/**
 * M0 - existing metadata;
 * M1 - new metadata.
 *
 */
export function withMetadata<
	M0 extends RO = RO, //
	M1 extends RO = RO
>(
	block: Block<M0> & WithMetadata<ToReadonlyObject<M0>>,
	meta: M1
): Block<M0> & //
	WithMetadata<ToReadonlyObject<M0>> &
	WithMetadata<ToReadonlyObject<M1>> {
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

	return {
		...block,
		metadata: Object.assign({}, block.metadata, meta),
	};
}
