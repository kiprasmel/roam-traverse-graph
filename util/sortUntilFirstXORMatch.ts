/* eslint-disable indent */

/**
 * TODO extract into npm package
 */

import assert from "assert";

/**
 * who needs enums anyway?
 * see also `OrderKeys` & `OrderValues`.
 */
export const Order = {
	AHEAD: -1, //
	BEHIND: 1,
	EVEN: 0,
} as const;

export type OrderKeys = keyof typeof Order;
export type OrderValues = typeof Order[OrderKeys];
export type OrderValuesOrAnyNumber = OrderValues | number;

/**
 * function overloads, but you __can__ specify the type `T` yourself!!!
 *
 * (since it's __before__ the quotes,
 * not after, unlike w/ regular function overloads)
 *
 */
export declare type Checker<T> = {
	/**
	 * automatic checker. will check both items, will compare their outcomes,
	 * and if the result is XOR, then if the truthy item:
	 *  is A, then AHEAD will be returned,
	 *  is B, then BEHIND will be returned,
	 * otherwise the search will continue until we reach XOR, or until
	 * all checkers have been used (whichever first) --
	 * only then the result will be EVEN.
	 *
	 * DO NOT RETURN A __NUMBER__, ONLY A __BOOLEAN__ IS ALLOWED.
	 */
	(AB: T, never?: T): boolean | number;

	// TODO USE THIS WHEN TS ALLOWS:
	// (AB: T): boolean;
	// OR THIS (NOT SURE, POINT IS - DO NOT ALLOW NUMBER):
	// (AB: T, never?: T): boolean;

	/**
	 * DO NOT RETURN A __BOOLEAN__, ONLY A __NUMBER__ IS ALLOWED.
	 */
	(A: T, B: T): number | boolean;

	// TODO USE THIS WHEN TS ALLOWS:
	// (A: T, B: T): number;
};

/**
 * uses either the automatic (preferrer), or manual checker.
 *
 * combines multiple checkers/sorters into 1.
 *
 */
export const sortUntilFirstXORMatchUsing = <T = unknown>(
	checkersUntilFirstXorMatch: readonly Checker<T>[],
	{ log } = {
		log: false,
	}
) => (A: T, B: T): OrderValuesOrAnyNumber => {
	if (log) console.log("sort", checkersUntilFirstXorMatch.length);

	/**
	 * NB! do NOT mutate the `checkersUntilFirstXorMatch` value,
	 * since it'll be used multiple times
	 * for the whole array.
	 */
	const checker = checkersUntilFirstXorMatch[0];

	if (!checker) return Order.EVEN;

	/**
	 * NB! do NOT mutate
	 * use this for recursive calls.
	 */
	const remainingCheckers: Checker<T>[] = checkersUntilFirstXorMatch.slice(1);

	/**
	 * is A ahead
	 */
	let a: boolean;

	/**
	 * is B ahead
	 */
	let b: boolean;

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length
	 */
	if (checker.length === 1) {
		assert(checker.length === 1);
		const aTmp = checker(A);
		const bTmp = checker(B);

		if (typeof aTmp !== "boolean" || typeof bTmp !== "boolean") {
			throw new Error(
				`**automatic** sorter shall only return a **boolean** type, but instead received ${typeof aTmp}, ${typeof bTmp}.`
			);
		}

		a = aTmp;
		b = bTmp;
	} else if (checker.length === 2) {
		assert(checker.length === 2);

		const orderTmp: boolean | number = checker(A, B);

		if (typeof orderTmp !== "number") {
			throw new Error(
				`**manual** sorter shall only return a **number** type, but instead received ${typeof orderTmp}.`
			);
		}

		const order: number = orderTmp;

		if (order === Order.EVEN) {
			/**
			 * we'll continue the search w/ remaining sorters.
			 *
			 */

			return sortUntilFirstXORMatchUsing(remainingCheckers)(A, B);
		} else {
			/**
			 * comparison was done, XOR was reached
			 */
			return order;
		}
	} else {
		throw new Error(`sorter takes in exactly 1 or 2 arguments, got ${checker.length}.`);
	}

	if (a && b) {
		/**
		 * true true
		 */

		if (log) console.log("BOTH", a, b, (A as any).originalTitle, (B as any).originalTitle);

		// return Order.EVEN;
		return sortUntilFirstXORMatchUsing(remainingCheckers)(A, B);
	} else if (a) {
		/**
		 * true false
		 */

		if (log) console.log("AHEAD", a, b, (A as any).originalTitle, (B as any).originalTitle);

		return Order.AHEAD;
	} else if (b) {
		/**
		 * false true
		 */

		if (log) console.log("BEHIND", a, b, (A as any).originalTitle, (B as any).originalTitle);

		return Order.BEHIND;
	} else {
		/**
		 * false false
		 */

		if (log) console.log("NEITHER", a, b, (A as any).originalTitle, (B as any).originalTitle);

		// return Order.EVEN;
		return sortUntilFirstXORMatchUsing(remainingCheckers)(A, B);
	}
};
