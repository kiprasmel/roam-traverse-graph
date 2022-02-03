import { testcase, input1, expected1 } from "./test-utils";

// runMany([["should yeet", testcase(input1), expected1]]);

describe("block string AST parser", () => {
	it("parses nested linked references", () => {
		const result = testcase(input1);
		expect(result).toStrictEqual(expected1);
	});
});
