#!/usr/bin/env ts-node-dev

/* eslint-disable import/no-extraneous-dependencies */

import { expectToError, noop } from "jest-sucks";

import { withMetadata } from "./withMetadata";

const misc = {
	"create-time": 69,
	"edit-email": "",
	"edit-time": 1,
	string: "1",
	uid: "69",
	//
} as const;

expectToError(() => {
	const duplicateKey = "key" as const;

	const ret1 = withMetadata(
		{
			...misc,
			metadata: { [duplicateKey]: "different" }, //
		},
		{ [duplicateKey]: "value" }
	);

	// @ts-expect-error
	noop(ret1.metadata.kek);
});

const ret2 = withMetadata(
	{
		...misc,
		metadata: {
			foo: "bar",
		},
	},
	{
		baz: "ooka",
	}
);

// @ts-expect-error
ret2.metadata.foo = "nope";
// @ts-expect-error
ret2.metadata.baz = "nope";

noop(ret2.metadata.foo, ret2.metadata.baz);
