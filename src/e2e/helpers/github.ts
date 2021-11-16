/* eslint-disable no-console */

import { IssueComment, Repository } from '@octokit/graphql-schema';
import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { stripMarkdownTag } from '../../util';

const readmeContents =
  'This repo is automatically created by the [compost](https://github.com/infracost/compost) E2E tests';

const OctokitWithRetries = Octokit.plugin(retry);
const octokit: Octokit = new OctokitWithRetries({
  auth: global.env.COMPOST_E2E_GITHUB_TOKEN,
});

function splitRepo(repo: string): [string, string] {
  const [owner, name] = repo.split('/');

  if (!owner || !name) {
    throw new Error(`Invalid repo: ${repo}`);
  }

  return [owner, name];
}

export async function createRepo(fullRepo: string) {
  const [owner, repo] = splitRepo(fullRepo);

  console.log(`Getting authenticated user`);
  const username = (await octokit.rest.users.getAuthenticated()).data.login;

  if (owner === username) {
    console.log(`Creating repo ${repo} for user ${owner}`);

    await octokit.rest.repos.createForAuthenticatedUser({
      name: repo,
    });
  } else {
    console.log(`Creating repo ${repo} for org`);

    await octokit.rest.repos.createInOrg({
      org: owner,
      name: repo,
    });
  }

  // Sleep for 2 seconds to give GitHub time to propogate the repo creation
  await new Promise((r) => {
    setTimeout(r, 2000);
  });

  console.log(`Adding initial commit`);

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'README.md',
    content: Buffer.from(readmeContents).toString('base64'),
    message: 'initialize repo',
    branch: 'main',
  });
}

export async function deleteRepoIfExists(fullRepo: string) {
  const [owner, repo] = splitRepo(fullRepo);

  console.log(
    `Check existing repo ${owner}/${repo} was created by Compost E2E tests`
  );

  let content: string;
  try {
    const resp = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'README.md',
    });

    // There seems to be a type bug here where it's expecting resp.data to be an array, but it's not
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content = Buffer.from(
      (resp.data as { content?: string }).content,
      'base64'
    ).toString('utf8');
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }

    console.log(`Not deleting repo ${owner}/${repo} since it doesn't exist`);
    return;
  }

  if (content !== readmeContents) {
    throw new Error(
      `Repo ${owner}/${repo} has unexpected contents. Please delete manually.`
    );
  }

  console.log(`Deleting repo ${owner}/${repo} if it exists`);

  try {
    await octokit.rest.repos.delete({
      owner,
      repo,
    });

    // Sleep for 2 seconds to give GitHub time to propogate the repo deletion
    await new Promise((r) => {
      setTimeout(r, 2000);
    });
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }
}

export async function createPullRequest(
  fullRepo: string,
  branch = 'test'
): Promise<number> {
  const [owner, repo] = splitRepo(fullRepo);

  console.log(`Getting latest commit SHA`);

  const commitSha = (
    await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: 'main',
      per_page: 1,
    })
  ).data[0].sha;

  console.log(`Creating branch ${branch}`);

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commitSha,
  });

  console.log(`Creating a new file on branch ${branch}`);

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'new_file.txt',
    content: Buffer.from(`Test file for branch ${branch}`).toString('base64'),
    message: `add test file to branch ${branch}`,
    branch,
  });

  console.log(`Creating a new PR for branch ${branch}`);

  const resp = await octokit.rest.pulls.create({
    owner,
    repo,
    title: `Test PR for branch ${branch}`,
    head: branch,
    base: 'main',
  });

  return resp.data.number;
}

export async function getPullRequestComments(
  fullRepo: string,
  prNumber: number,
  keepMarkdownHeader?: boolean
): Promise<IssueComment[]> {
  // Use the GraphQL api here so we can see if they're minimized

  const [owner, repo] = splitRepo(fullRepo);

  let after = null;
  let hasNextPage = true;
  let comments: IssueComment[] = [];

  console.log(`Fetching PR comments for ${owner}/${repo} PR ${prNumber}`);

  while (hasNextPage) {
    const data = await octokit.graphql<{ repository?: Repository }>(
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
        owner,
        repo,
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
