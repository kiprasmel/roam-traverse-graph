import { runMany } from "jest-sucks";

import { testcase, input1, expected1 } from "./parseASTFromBlockString.utils.spec";

runMany([["should yeet", testcase(input1), expected1]]);
