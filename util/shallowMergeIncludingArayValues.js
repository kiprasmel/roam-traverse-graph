/**
 * pretty similar to Object.assign(), but also shallowly merges arrays
 *
 * lowest precedence = `dest`,
 * highest precedence = last item in the `srcs` array.
 *
 */
const shallowMergeIncludingArrayValues = (dest, srcs = [], log = false) => {
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

	Object.keys({ ...dest, ...src }).forEach((k) => {
		if (!(k in src) || src[k] === undefined) {
			return;
		}

		if (Array.isArray(dest[k])) {
			if (!Array.isArray(src[k])) {
				throw new Error("dest[k] was an array; src[k] was not: " + dest[k] + " " + src[k] + ".");
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

	return shallowMergeIncludingArrayValues(dest, srcs);
};

module.exports = {
	shallowMergeIncludingArrayValues,
};
