/**
 * pretty similar to Object.assign(), but also shallowly merges arrays
 *
 * lowest precedence = `dest`,
 * highest precedence = last item in the `srcs` array.
 *
 */
export const shallowMergeIncludingArrayValues = (dest, srcs = [], log = false, depth = 0) => {
	if (depth === 0) {
		console.log({ dest, srcs });
	}

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

	return shallowMergeIncludingArrayValues(dest, srcs, log, depth + 1);
};
