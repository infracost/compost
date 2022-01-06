/* eslint-disable no-console */

import axios from 'axios';
import { stripMarkdownTag } from '../../util';
import { CommentResult } from './comment';
import { branchPrefix } from './git';

import { AzureDevOpsPrHandler } from '../../platforms/azureDevOps';

const expectedReadmeContent =
  'This repo is used by the [compost](https://github.com/infracost/compost) E2E tests.\n';

export function loadAzureDevOpsTestEnv(): { repoUrl: string; token: string } {
  const repoUrl = global.env.COMPOST_E2E_AZURE_DEVOPS_REPO_URL;
  const token = global.env.COMPOST_E2E_AZURE_DEVOPS_TOKEN;

  if (!repoUrl) {
    throw new Error(
      `Expected COMPOST_E2E_AZURE_DEVOPS_REPO_URL to be set in .env.test`
    );
  }

  if (!token) {
    throw new Error(
      `Expected COMPOST_E2E_AZURE_DEVOPS_TOKEN to be set in .env.test`
    );
  }

  return { repoUrl, token };
}

export default class AzureDevOpsHelper {
  private repoApiUrl: string;

  constructor(private repoUrl: string, private token: string) {
    this.repoApiUrl = AzureDevOpsPrHandler.parseRepoApiUrl(repoUrl);
  }

  private authHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`:${this.token}`).toString(
        'base64'
      )}`,
    };
  }

  async checkRepoExists(): Promise<boolean> {
    console.log(`Checking if repo ${this.repoUrl} exists`);

    let resp: { data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      resp = await axios.get(`${this.repoApiUrl}?api-version=6.0`, {
        headers: this.authHeaders(),
      });
    } catch (err) {
      if (err.response?.status === 404) {
        return false;
      }

      throw err;
    }

    if (resp.data) {
      let readmeContent = '';

      try {
        readmeContent = await this.getReadmeContents();
      } catch (err) {
        console.log(`Error fetching README`);

        throw err;
      }

      if (readmeContent !== expectedReadmeContent) {
        throw Error(
          `Repo ${this.repoUrl} exists but wasn't created by Compost E2E tests`
        );
      }

      console.log(`Repo ${this.repoUrl} exists`);
      return true;
    }

    return false;
  }

  async getReadmeContents(): Promise<string> {
    console.log(`Fetching README contents for ${this.repoUrl}`);

    const resp = await axios.get(
      `${this.repoApiUrl}/items?path=README.md&includeContent=true&api-version=6.0`,
      { headers: this.authHeaders() }
    );

    return resp.data.content;
  }

  async createRepoIfNotExists() {
    if (await this.checkRepoExists()) {
      return;
    }

    console.log(`Creating repo ${this.repoUrl}`);

    try {
      await axios.post(
        `${this.repoApiUrl}?api-version=6.0`,
        {
          name: 'compost-e2e-tests',
        },
        { headers: this.authHeaders() }
      );
    } catch (err) {
      throw new Error(
        `Failed to create repo ${this.repoUrl}: ${JSON.stringify(
          err.response.data
        )}`
      );
    }
  }

  async createPr(branch: string): Promise<number> {
    console.log(`Creating a new PR for branch ${branch}`);

    const resp = await axios.post(
      `${this.repoApiUrl}/pullrequests?api-version=6.0`,
      {
        sourceRefName: `refs/heads/${branch}`,
        targetRefName: 'refs/heads/master',
        title: `Test PR for branch ${branch}`,
        description: 'Adding a new file',
      },
      { headers: this.authHeaders() }
    );

    return resp.data.pullRequestId;
  }

  async getPrComments(
    prNumber: number,
    keepMarkdownHeader?: boolean
  ): Promise<CommentResult[]> {
    const results: { id: string; body: string; createdAt: string }[] = [];

    console.log(`Fetching PR comments for ${this.repoUrl} PR ${prNumber}`);

    const resp = await axios.get<{
      value: {
        isDeleted: boolean;
        comments: {
          commentId: string;
          content: string;
          publishedDate: string;
          isDeleted: boolean;
        }[];
      }[];
    }>(`${this.repoApiUrl}pullRequests/${prNumber}/threads?api-version=6.0`, {
      headers: this.authHeaders(),
    });

    for (const thread of resp.data.value) {
      if (thread.isDeleted) {
        continue;
      }
      for (const comment of thread.comments) {
        if (comment.isDeleted) {
          continue;
        }
        results.push({
          id: comment.commentId,
          body: comment.content,
          createdAt: comment.publishedDate,
        });
        break;
      }
    }

    const comments = results
      .sort((a, b) =>
        `${a.createdAt} ${a.id}`.localeCompare(`${b.createdAt} ${b.id}`)
      )
      .map((r) => ({
        body: keepMarkdownHeader ? r.body : stripMarkdownTag(r.body),
        isHidden: false,
      }));

    return comments;
  }

  async closePr(prNumber: number): Promise<void> {
    console.log(`Closing PR ${prNumber}`);

    await axios.patch(
      `${this.repoApiUrl}/pullrequests/${prNumber}?api-version=6.0`,
      {
        status: 'abandoned',
      },
      { headers: this.authHeaders() }
    );
  }

  async closeAllPrs(): Promise<void> {
    console.log(`Closing all test PRs`);

    const resp = await axios.get(
      `${this.repoApiUrl}/pullrequests?searchCriteria.status=active?api-version=6.0`,
      { headers: this.authHeaders() }
    );

    for (const pr of resp.data.value) {
      if (!pr.sourceRefName.startsWith(`refs/heads/${branchPrefix}`)) {
        console.log(
          `Skipping PR ${
            pr.pullRequestId
          } since it's for branch ${pr.sourceRefName.replace(
            'refs/heads/',
            ''
          )} which doesn't match the expected branch prefix of ${branchPrefix}`
        );
        continue;
      }
      await this.closePr(pr.pullRequestId);
    }
  }

  async deleteRepoIfPossible(): Promise<void> {
    console.log(`Attempting to delete repo ${this.repoUrl}`);

    // Find the repo ID since the delete call needs this instead of the name
    let repoId: string;

    try {
      const resp = await axios.get(`${this.repoApiUrl}?api-version=6.0`, {
        headers: this.authHeaders(),
      });

      repoId = resp.data.id;

      // Replace the name in the URL with the ID
      const url = this.repoApiUrl.replace(/[^/]+\/$/, repoId);

      await axios.delete(`${url}?api-version=6.0`, {
        headers: this.authHeaders(),
      });
    } catch (err) {
      console.log(`Unable to delete test repo: ${err.message}`);
      console.log(`If you need to clean up the repo, please do so manually`);
      return;
    }

    console.log(`Deleted repo ${this.repoUrl}`);
  }
}
