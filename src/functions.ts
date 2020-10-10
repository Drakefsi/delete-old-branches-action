import * as github from "@actions/github";
import * as core from "@actions/core";
import { differenceInDays, isBefore } from "date-fns";

// TODO read these from env or config
const GH_OWNER = "jay-aye-see-kay";
const GH_REPO = "ATEST-sink";

export type Branch = {
  name: string;
  committedDate: Date;
};

type ListBranchesResponse = {
  repository: {
    defaultBranchRef: { name: string };
    refs: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: Array<{
        name: string;
        target: { committedDate: string };
      }>;
    };
  };
};

const listBranchesQuery = `
query listBranches($owner: String!, $name: String!, $after: String, $pageSize: Int!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name }
    refs(refPrefix: "refs/heads/", first: $pageSize, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        target {
          ... on Commit { committedDate }
        }
      }
    }
  }
}
`;

type Octokit = ReturnType<typeof github.getOctokit>;
let globalOctokit: Octokit | undefined;

/**
 * Get the authorized octokit object, creating one if none exists
 */
const getOctokit = () => {
  if (globalOctokit) {
    return globalOctokit;
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN token not set");
  }
  const octokit = github.getOctokit(token);
  globalOctokit = octokit;
  return octokit;
};

/**
 * Fetches all branches from GH
 */
export const getBranches = async (): Promise<Branch[]> => {
  const octokit = getOctokit();

  let defaultBranchName = "";
  let hasNextPage = true;
  let nextCursor: string | null = null;
  let branches: Branch[] = [];

  while (hasNextPage) {
    const result: ListBranchesResponse = await octokit.graphql(
      listBranchesQuery,
      { owner: GH_OWNER, name: GH_REPO, after: nextCursor, pageSize: 100 }
    );
    const fetchedBranches = result.repository.refs.nodes.map((ref) => ({
      name: ref.name,
      committedDate: new Date(ref.target.committedDate),
    }));
    branches.push(...fetchedBranches);
    defaultBranchName = result.repository.defaultBranchRef.name;
    const { pageInfo } = result.repository.refs;
    nextCursor = pageInfo.endCursor;
    hasNextPage = pageInfo.hasNextPage;
  }

  // We NEVER want to delete the default branch, or common branch names
  const safeBranchNames = [
    defaultBranchName,
    "master",
    "main",
    "default",
    "develop",
  ];
  return branches.filter((branch) => !safeBranchNames.includes(branch.name));
};

/**
 * Decides which branches to delete
 */
export const selectBranchesToDelete = async (
  unsortedBranches: Branch[]
): Promise<Branch[]> => {
  // TEMP, read these from somewhere
  const MIN_NUM_BRANCHES = 20;
  const DAYS_TO_KEEP_BRANCHES = 28;

  const newestFirstSort = (n0: Branch, n1: Branch) =>
    isBefore(n0.committedDate, n1.committedDate) ? 1 : -1;
  const branches = unsortedBranches.sort(newestFirstSort);

  const branchesToDelete = branches.filter((branch, idx) => {
    // The newest MIN_NUM_BRANCHES we keep regardless
    if (idx < MIN_NUM_BRANCHES) return false;
    // Branches less than DAYS_TO_KEEP_BRANCHES stay (both Date.now() and committedDate are UTC)
    const branchAgeDays = differenceInDays(Date.now(), branch.committedDate);
    if (branchAgeDays < DAYS_TO_KEEP_BRANCHES) return false;
    // remaining branches to be deleted
    return true;
  });

  return branchesToDelete;
};

/**
 * Deletes the list of branches it's passed
 */
export const deleteOldBranches = async (
  oldBranches: Branch[]
): Promise<number> => {
  const octokit = getOctokit();
  const deletionRequests = oldBranches.map((branch) =>
    octokit.git.deleteRef({
      owner: GH_OWNER,
      repo: GH_REPO,
      ref: `heads/${branch.name}`,
    })
  );
  await Promise.all(deletionRequests);
  return oldBranches.length;
};

/**
 * Output something on success
 */
export const printSuccessMessage = (numBranchesDeleted: number) => {
  if (numBranchesDeleted === 1) {
    console.log(`Successfully deleted ${numBranchesDeleted} old branch`);
  } else if (numBranchesDeleted > 1) {
    console.log(`Successfully deleted ${numBranchesDeleted} old branches`);
  } else {
    console.log("No branches to delete");
  }
};

/**
 * After an error, ensure we exit with a non 0 code
 */
export const handleError = (error: Error) => {
  console.log(error);
  process.exit(1);
};
