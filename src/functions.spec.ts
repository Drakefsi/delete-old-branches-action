import { deepStrictEqual } from "assert";
import { shuffle, times } from "lodash";
import { subDays } from "date-fns";

import { Branch, selectBranchesToDelete } from "./functions";

/**
 * So I need to setup a MIN_NUM_BRANCHES and DAYS_TO_KEEP_BRANCHES, for now I'll just hard code them in
 * MIN_NUM_BRANCHES = 20
 * DAYS_TO_KEEP_BRANCHES = 28
 *
 * Eventually I'll need to figure out how to pass these sorts of things into
 * github actions, theres probably a convetion more than just env variables.
 * Maybe that `with:` key in the yaml file??
 */
describe("selectBranchesToDelete", () => {
  it("should return an empty array when passed an empty array", async () => {
    const actual = await selectBranchesToDelete([]);
    deepStrictEqual(actual, []);
  });

  it("should not delete any when all are younger DAYS_TO_KEEP_BRANCHES", async () => {
    const branches: Branch[] = times(20).map((i) => ({
      name: `branch that's ${i} day(s) old`,
      committedDate: subDays(new Date(), i),
    }));
    const actual = await selectBranchesToDelete(shuffle(branches));
    deepStrictEqual(actual, []);
  });

  it("should not delete any when less than or equal to MIN_NUM_BRANCHES", async () => {
    const branches: Branch[] = times(20).map((i) => ({
      name: `branch that's ${i + 19} day(s) old`,
      committedDate: subDays(new Date(), i + 19),
    }));
    const actual = await selectBranchesToDelete(shuffle(branches));
    deepStrictEqual(actual, []);
  });

  it("should delete a branch when it's older than 28 days", async () => {
    const branches: Branch[] = times(29).map((i) => ({
      name: `branch that's ${i} day(s) old`,
      committedDate: subDays(new Date(), i),
    }));
    const oldestBranch = branches[branches.length - 1];
    const actual = await selectBranchesToDelete(shuffle(branches));
    deepStrictEqual(actual, [oldestBranch]);
  });

  it("should delete branches when they're older than 28 days, but only down to MIN_NUM_BRANCHES", async () => {
    const branches: Branch[] = times(25).map((i) => ({
      name: `branch that's ${i + 13} day(s) old`,
      committedDate: subDays(new Date(), i + 13),
    }));
    const actual = await selectBranchesToDelete(shuffle(branches));
    deepStrictEqual(actual.length, 5);
  });
});
