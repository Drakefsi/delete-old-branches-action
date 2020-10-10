# Delete old branches action

This repo is public for technical reasons, it's unlikely to be helpful to anyone.

This repo contains a github action that will delete branches that haven't had a commit in over `DAYS_TO_KEEP_BRANCHES`, unless there is or will be less than `MIN_NUM_BRANCHES` of branches in the repo. This is useful for one uncommon quirk in one particular deployment, but is probably a bad idea to add this anywhere else.
