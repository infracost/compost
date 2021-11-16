#!/usr/bin/env node

/* eslint-disable no-console */

import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';

async function cleanup() {
  const env = loadGitHubTestEnv();
  const { repo, token } = env;

  const gh = new GitHubHelper(repo, token);

  console.log(`Cleaning up repo ${repo}`);

  await gh.closeAllPullRequests();

  await gh.deleteAllBranches();

  await gh.deleteRepoIfPossible();

  console.log(`Done`);
}

cleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});
