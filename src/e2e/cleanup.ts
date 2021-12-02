#!/usr/bin/env node

/* eslint-disable no-console */

import GitHelper from './helpers/git';
import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';
import GitLabHelper, { loadGitLabTestEnv } from './helpers/gitlab';

async function cleanup() {
  await cleanupGitHub();
  await cleanupGitLab();
}

async function cleanupGitHub() {
  console.log(`Cleaning up GitHub test repo`);

  const env = loadGitHubTestEnv();
  const { repo, token } = env;

  const gh = new GitHubHelper(repo, token);
  if (!(await gh.checkRepoExists())) {
    console.log(`Repo ${repo} does not exist`);
    return;
  }

  const git = new GitHelper(
    `https://github.com/${repo}`,
    await gh.getUsername(),
    token
  );

  await gh.closeAllPrs();
  await git.cloneTemplateRepo();
  await git.deleteAllBranches();
  await git.cleanupRepo();

  await gh.deleteRepoIfPossible();
}

async function cleanupGitLab() {
  console.log(`Cleaning up GitLab test repo`);

  const env = loadGitLabTestEnv();
  const { repo, token } = env;

  const gl = new GitLabHelper(repo, token);
  if (!(await gl.checkRepoExists())) {
    console.log(`Repo ${repo} does not exist`);
    return;
  }

  const git = new GitHelper(
    `https://gitlab.com/${repo}`,
    await gl.getUsername(),
    token
  );

  await gl.closeAllMrs();
  await git.cloneTemplateRepo();
  await git.deleteAllBranches();
  await git.cleanupRepo();

  await gl.deleteRepoIfPossible();
}

cleanup()
  .then(() => {
    console.log('DONE');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
