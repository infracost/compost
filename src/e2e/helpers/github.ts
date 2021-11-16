/* eslint-disable no-console */

import { IssueComment, Repository } from '@octokit/graphql-schema';
import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { stripMarkdownTag } from '../../util';

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

  async createRepoIfNotExists() {
    console.log(`Checking if repo ${this.owner}/${this.repo} exists`);
    try {
      const resp = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      if (resp.data) {
        if (
          resp.data.template_repository?.full_name !==
          `${templateOwner}/${templateRepo}`
        ) {
          throw Error(
            `Repo ${this.owner}/${this.repo} exists and does not use the ${templateOwner}/${templateRepo} template`
          );
        }

        console.log(`Repo ${this.owner}/${this.repo} already exists`);
        return;
      }
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }

    console.log(
      `Creating repo ${this.owner}/${this.repo} from ${templateOwner}/${templateRepo} template`
    );
    await this.octokit.rest.repos.createUsingTemplate({
      owner: this.owner,
      name: this.repo,
      template_owner: templateOwner,
      template_repo: templateRepo,
      include_all_branches: true,
    });

    // Sleep for 2 seconds to give GitHub time to propogate the repo creation
    await new Promise((r) => {
      setTimeout(r, 2000);
    });
  }

  async createBranch(): Promise<string> {
    const branch = generateRandomBranchName();

    console.log(`Getting latest commit SHA`);

    const commitSha = (
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
      sha: commitSha,
    });

    console.log(`Creating a new file on branch ${branch}`);

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: 'new_file.txt',
      content: Buffer.from(`Test file for branch ${branch}`).toString('base64'),
      message: `Add test file to branch ${branch}`,
      branch,
    });

    return branch;
  }

  async createPullRequest(branch: string): Promise<number> {
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

  async getPullRequestComments(
    prNumber: number,
    keepMarkdownHeader?: boolean
  ): Promise<IssueComment[]> {
    // Use the GraphQL api here so we can see if they're minimized
    let after = null;
    let hasNextPage = true;
    let comments: IssueComment[] = [];

    console.log(
      `Fetching PR comments for ${this.owner}/${this.repo} PR ${prNumber}`
    );

    while (hasNextPage) {
      const data = await this.octokit.graphql<{ repository?: Repository }>(
        `
        query($repo: String! $owner: String! $prNumber: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $prNumber) {
              comments(first: 100 after: $after) {
                nodes {
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

      comments.push(...(data.repository?.pullRequest?.comments.nodes || []));
    }

    if (!keepMarkdownHeader) {
      comments = comments.map((c) => ({
        ...c,
        body: stripMarkdownTag(c.body),
      }));
    }

    return comments;
  }

  async closePullRequest(prNumber: number): Promise<void> {
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

    console.log(`refs/heads/${branch}`);

    await this.octokit.rest.git.deleteRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${branch}`,
    });
  }

  async closeAllPullRequests(): Promise<void> {
    console.log(`Closing all test pull requests`);

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
      await this.octokit.rest.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: pr.number,
        state: 'closed',
      });
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
      await this.octokit.rest.git.deleteRef({
        owner: this.owner,
        repo: this.repo,
        ref: branch.ref.replace('refs/', ''),
      });
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
