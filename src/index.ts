import {
  getBranches,
  selectBranchesToDelete,
  deleteOldBranches,
  printSuccessMessage,
  handleError,
} from "./functions";

/**
 * Main: Compose everything together and run
 */
getBranches()
  .then(selectBranchesToDelete)
  .then(deleteOldBranches)
  .then(printSuccessMessage)
  .catch(handleError);
