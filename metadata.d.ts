// TODO RENAME `ReadonlyObject`
export type RO<
	O = {}
	// Key extends string | number | symbol = string | number | symbol //
> = {
	readonly [key in keyof O]: O[key]; // TODO K[key]
};

// TODO REMOVE

export type ToReadonlyObject<O extends {}> = {
	readonly [key in keyof O]: O[key]; //
};

export type WithMetadata<M extends RO> = {
	metadata: M;
};
