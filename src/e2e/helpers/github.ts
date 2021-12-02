/* eslint-disable no-console */

import {
  Commit,
  CommitComment,
  IssueComment,
  Repository,
} from '@octokit/graphql-schema';
import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { stripMarkdownTag } from '../../util';
import { CommentResult } from './comment';

const templateOwner = 'infracost';
const templateRepo = 'compost-e2e-tests-template';
const branchPrefix = 'e2e-test-';

const OctokitWithRetries = Octokit.plugin(retry);

export function loadGitHubTestEnv(): { repo: string; token: string } {
  const repo = global.env.COMPOST_E2E_GITHUB_REPO;
  const token = global.env.COMPOST_E2E_GITHUB_TOKEN;

  if (!repo) {
    throw new Error(`Expected COMPOST_E2E_GITHUB_REPO to be set in .env.test`);
  }

  if (!token) {
    throw new Error(`Expected COMPOST_E2E_GITHUB_TOKEN to be set in .env.test`);
  }

  return { repo, token };
}

function generateRandomBranchName(): string {
  return `${branchPrefix}${Math.random().toString(36).substring(7)}`;
}

export default class GitHubHelper {
  private owner: string;

  private repo: string;

  private octokit: Octokit;

  constructor(fullRepo: string, token: string) {
    [this.owner, this.repo] = fullRepo.split('/');

    if (!this.owner || !this.repo) {
      throw new Error(`Invalid repo: ${fullRepo}`);
    }

    this.octokit = new OctokitWithRetries({
      auth: token,
    });
  }

  async getUsername(): Promise<string> {
    const resp = await this.octokit.rest.users.getAuthenticated();
    return resp.data.login;
  }

  async checkRepoExists(): Promise<boolean> {
    console.log(`Checking if repo ${this.owner}/${this.repo} exists`);

    try {
      const resp = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      if (resp.data) {
        if (resp.data.description !== 'Compost E2E test repo') {
          throw Error(
            `Repo ${this.owner}/${this.repo} exists but wasn't created by Compost E2E tests`
          );
        }

        console.log(`Repo ${this.owner}/${this.repo} exists`);
        return true;
      }
    } catch (err) {
      if (err.status === 404) {
        return false;
      }

      throw err;
    }

    return false;
  }

  async createRepoIfNotExists() {
    if (await this.checkRepoExists()) {
      return;
    }

    console.log(
      `Creating repo ${this.owner}/${this.repo} from ${templateOwner}/${templateRepo} template`
    );

    const username = await this.getUsername();

    if (this.owner === username) {
      await this.octokit.rest.repos.createForAuthenticatedUser({
        name: this.repo,
        description: 'Compost E2E test repo',
      });
    } else {
      await this.octokit.rest.repos.createInOrg({
        org: this.owner,
        name: this.repo,
        description: 'Compost E2E test repo',
      });
    }

    // Sleep for 2 seconds to give GitHub time to propogate the repo creation
    await new Promise((r) => {
      setTimeout(r, 2000);
    });
  }

  async createBranch(): Promise<[string, string]> {
    const branch = generateRandomBranchName();

    console.log(`Getting latest commit SHA`);

    const masterCommitSha = (
      await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: 'master',
        per_page: 1,
      })
    ).data[0].sha;

    console.log(`Creating branch ${branch}`);

    await this.octokit.rest.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branch}`,
      sha: masterCommitSha,
    });

    console.log(`Creating a new file on branch ${branch}`);

    const resp = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: 'new_file.txt',
      content: Buffer.from(`Test file for branch ${branch}`).toString('base64'),
      message: `Add test file to branch ${branch}`,
      branch,
    });

    const commitSha = resp.data.commit.sha;

    return [branch, commitSha];
  }

  async createPr(branch: string): Promise<number> {
    console.log(`Creating a new PR for branch ${branch}`);

    const resp = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: `Test PR for branch ${branch}`,
      head: branch,
      base: 'master',
    });

    return resp.data.number;
  }

  async getPrComments(
    prNumber: number,
    keepMarkdownHeader?: boolean
  ): Promise<CommentResult[]> {
    // Use the GraphQL api here so we can see if they're minimized
    const results: IssueComment[] = [];

    console.log(
      `Fetching PR comments for ${this.owner}/${this.repo} PR ${prNumber}`
    );

    let after = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const data = await this.octokit.graphql<{ repository?: Repository }>(
        `
        query($repo: String! $owner: String! $prNumber: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $prNumber) {
              comments(first: 100 after: $after) {
                nodes {
                  id
                  createdAt
                  body
                  isMinimized
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
        `,
        {
          owner: this.owner,
          repo: this.repo,
          prNumber,
          after,
        }
      );

      after = data.repository?.pullRequest?.comments.pageInfo.endCursor;
      hasNextPage = data.repository?.pullRequest?.comments.pageInfo.hasNextPage;

      results.push(...(data.repository?.pullRequest?.comments.nodes || []));
    }

    const comments = results
      .sort((a, b) =>
        `${a.createdAt} ${a.id}`.localeCompare(`${b.createdAt} ${b.id}`)
      )
      .map((r) => ({
        body: keepMarkdownHeader ? r.body : stripMarkdownTag(r.body),
        isHidden: r.isMinimized,
      }));

    return comments;
  }

  async getCommitComments(
    commitSha: string,
    keepMarkdownHeader?: boolean
  ): Promise<CommentResult[]> {
    // Use the GraphQL api here so we can see if they're minimized
    const results: CommitComment[] = [];

    console.log(
      `Fetching commit comments for ${this.owner}/${this.repo} commit ${commitSha}`
    );

    let after = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const data = await this.octokit.graphql<{ repository?: Repository }>(
        `
        query($repo: String! $owner: String! $commitSha: GitObjectID! $after: String) {
          repository(name: $repo owner: $owner) {
            object(oid: $commitSha) {
              ... on Commit {
                comments(first: 100 after: $after) {
                  nodes {
                    id
                    createdAt
                    body
                    isMinimized
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }
        `,
        {
          owner: this.owner,
          repo: this.repo,
          commitSha,
          after,
        }
      );

      const commit = data.repository?.object as Commit | undefined;
      after = commit?.comments.pageInfo.endCursor;
      hasNextPage = commit?.comments.pageInfo.hasNextPage;

      results.push(...(commit?.comments.nodes || []));
    }

    const comments = results
      .sort((a, b) =>
        `${a.createdAt} ${a.id}`.localeCompare(`${b.createdAt} ${b.id}`)
      )
      .map((r) => ({
        body: keepMarkdownHeader ? r.body : stripMarkdownTag(r.body),
        isHidden: r.isMinimized,
      }));

    return comments;
  }

  async closePr(prNumber: number): Promise<void> {
    console.log(`Closing PR ${prNumber}`);

    await this.octokit.rest.pulls.update({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      state: 'closed',
    });
  }

  async deleteBranch(branch: string): Promise<void> {
    console.log(`Deleting branch ${branch}`);

    await this.octokit.rest.git.deleteRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${branch}`,
    });
  }

  async closeAllPrs(): Promise<void> {
    console.log(`Closing all test PRs`);

    const data = await this.octokit.paginate(this.octokit.rest.pulls.list, {
      owner: this.owner,
      repo: this.repo,
      state: 'open',
    });

    for (const pr of data) {
      if (!pr.head.ref.startsWith(`${branchPrefix}`)) {
        console.log(
          `Skipping PR ${pr.number} since it's for branch ${pr.head.ref} which doesn't match the expected branch prefix of ${branchPrefix}`
        );
        continue;
      }
      await this.closePr(pr.number);
    }
  }

  async deleteAllBranches(): Promise<void> {
    console.log(`Deleting all test branches`);

    const data = await this.octokit.paginate(
      this.octokit.rest.git.listMatchingRefs,
      {
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchPrefix}`,
      }
    );

    for (const branch of data) {
      await this.deleteBranch(branch.ref.replace(`refs/heads/`, ''));
    }
  }

  async deleteRepoIfPossible(): Promise<void> {
    console.log(`Attempting to delete repo ${this.owner}/${this.repo}`);

    try {
      await this.octokit.rest.repos.delete({
        owner: this.owner,
        repo: this.repo,
      });
    } catch (err) {
      console.log(`Unable to delete test repo: ${err.message}`);
      console.log(`If you need to clean up the repo, please do so manually`);
      return;
    }

    console.log(`Deleted repo ${this.owner}/${this.repo}`);
  }
}
