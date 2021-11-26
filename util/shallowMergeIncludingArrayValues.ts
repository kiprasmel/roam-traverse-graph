/* eslint-disable indent */

/**
 * pretty similar to Object.assign(), but also shallowly merges arrays
 *
 * lowest precedence = `dest`,
 * highest precedence = last item in the `srcs` array.
 *
 */
// export const shallowMergeIncludingArrayValues = <
// 	Dest, //
// 	OrigDest extends Partial<Dest>,
// 	S extends Partial<Dest>[] = Partial<Dest>[]
// >(
// 	dest: OrigDest,
// 	srcs: S,
// 	log = false,
// 	depth = 0
// ): [] extends S ? OrigDest : Dest => {
export const shallowMergeIncludingArrayValues = <
	//
	Dest = unknown,
	S extends Partial<Dest>[] = Partial<Dest>[]
>(
	dest: Dest,
	srcs: S,
	log = false,
	depth = 0
): Dest => {
	if (!srcs.length) {
		if (log) {
			console.log({ dest });
		}

		return dest;
	}

	const src = srcs.shift();

	if (log) {
		console.log({ dest, src });
	}

	Object.keys(src).forEach((k) => {
		if (Array.isArray(dest[k])) {
			if (!Array.isArray(src[k])) {
				throw new Error(
					`dest[k] was an array; src[k] was not. k = ${k}, dest[k] = ${dest[k]}, src[k] = ${src[k]}.`
				);
			}

			let tmp;
			dest[k] =
				((tmp = [...dest[k], ...src[k]]), //
				(tmp = new Set(tmp)),
				(tmp = [...tmp]),
				tmp);
		} else {
			dest[k] = src[k];
		}
	});

	return shallowMergeIncludingArrayValues<Dest, S>(dest, srcs, log, depth + 1);
};
