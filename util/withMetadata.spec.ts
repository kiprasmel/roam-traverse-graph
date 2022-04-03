#!/usr/bin/env ts-node-dev

/* eslint-disable import/no-extraneous-dependencies */

import { withMetadata } from "./withMetadata";

export const noop = (..._args: any[]): void => {
	//
};

const blockBase = {
	"create-time": 69,
	"edit-email": "",
	"edit-time": 1,
	string: "1",
	uid: "69",
	//
} as const;

describe("withMetadata", () => {
	it("errors when the metadata gets overwritten (assigned a new reference)", () => {
		const fn = () => {
			const duplicateKey = "key" as const;

			const ret1 = withMetadata({ [duplicateKey]: "value" })({
				...blockBase,
				metadata: { [duplicateKey]: "different" }, //
			});

			// @ts-expect-error
			noop(ret1.metadata.kek);
		};

		expect(fn).toThrowError();
	});

	it("ts types work fine", () => {
		const ret2 = withMetadata({
			baz: "ooka",
		})({
			...blockBase,
			metadata: {
				foo: "bar",
			},
		});

		// ret2.metadata.baz = "XD";

		// @ts-expect-error
		ret2.metadata.foo = "nope";
		// @ts-expect-error
		ret2.metadata.baz = "nope";

		noop(ret2.metadata.foo, ret2.metadata.baz);

		const ret3 = withMetadata({ kurwa: "mac" })({
			...blockBase,
			...ret2,
		});

		// @ts-expect-error
		ret3.metadata.baz = "ke";
		noop(ret3.metadata.baz);
	});
});
