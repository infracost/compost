/* eslint-disable no-console */

import axios from 'axios';
import { stripMarkdownTag } from '../../util';
import { CommentResult } from './comment';
import { branchPrefix } from './git';

export function loadGitLabTestEnv(): { repo: string; token: string } {
  const repo = global.env.COMPOST_E2E_GITLAB_REPO;
  const token = global.env.COMPOST_E2E_GITLAB_TOKEN;

  if (!repo) {
    throw new Error(`Expected COMPOST_E2E_GITLAB_REPO to be set in .env.test`);
  }

  if (!token) {
    throw new Error(`Expected COMPOST_E2E_GITLAB_TOKEN to be set in .env.test`);
  }

  return { repo, token };
}

export default class GitLabHelper {
  private owner: string;

  private repo: string;

  constructor(fullRepo: string, private token: string) {
    [this.owner, this.repo] = fullRepo.split('/');

    if (!this.owner || !this.repo) {
      throw new Error(`Invalid repo: ${fullRepo}`);
    }
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  private encodedProjectPath(): string {
    return encodeURIComponent(`${this.owner}/${this.repo}`);
  }

  async getUsername(): Promise<string> {
    const resp = await axios.get<{ username: string }>(
      `https://gitlab.com/api/v4/user`,
      { headers: this.authHeaders() }
    );

    return resp.data.username;
  }

  async checkRepoExists(): Promise<boolean> {
    console.log(`Checking if repo ${this.owner}/${this.repo} exists`);

    try {
      const resp = await axios.get(
        `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}`,
        { headers: this.authHeaders() }
      );

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
      if (err.response.status === 404) {
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

    console.log(`Creating repo ${this.owner}/${this.repo}`);

    try {
      const namespaceResp = await axios.get<{ id: number }>(
        `https://gitlab.com/api/v4/namespaces/${encodeURIComponent(
          this.owner
        )}`,
        { headers: this.authHeaders() }
      );
      const namespaceId = namespaceResp.data.id;

      await axios.post(
        `https://gitlab.com/api/v4/projects`,
        {
          path: this.repo,
          namespace_id: namespaceId,
          description: 'Compost E2E test repo',
        },
        { headers: this.authHeaders() }
      );
    } catch (err) {
      throw new Error(
        `Failed to create repo ${this.owner}/${this.repo}: ${JSON.stringify(
          err.response.data
        )}`
      );
    }
  }

  async createMr(branch: string): Promise<number> {
    console.log(`Creating a new MR for branch ${branch}`);

    const resp = await axios.post(
      `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}/merge_requests`,
      {
        source_branch: branch,
        target_branch: 'master',
        title: `Test MR for branch ${branch}`,
      },
      { headers: this.authHeaders() }
    );

    return resp.data.iid;
  }

  async getMrComments(
    mrNumber: number,
    keepMarkdownHeader?: boolean
  ): Promise<CommentResult[]> {
    const results: { id: string; body: string; createdAt: string }[] = [];

    console.log(
      `Fetching MR comments for ${this.owner}/${this.repo} MR ${mrNumber}`
    );

    let after = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const query = `
        query($project: ID!, $mrNumber: String!, $after: String) {
          project(fullPath: $project) {
            mergeRequest(iid: $mrNumber) {
              notes(first: 100, after: $after) {
                nodes {
                  id
                  createdAt
                  body
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }`;

      const variables = {
        project: `${this.owner}/${this.repo}`,
        mrNumber: mrNumber.toString(),
        after,
      };

      const resp = await axios.post<{
        errors: object[];
        data: {
          project: {
            mergeRequest?: {
              notes: {
                nodes: {
                  id: string;
                  body: string;
                  createdAt: string;
                }[];
                pageInfo: {
                  endCursor: string;
                  hasNextPage: boolean;
                };
              };
            };
          };
        };
      }>(
        `https://gitlab.com/api/graphql`,
        { query, variables },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      const { data } = resp.data;

      after = data.project?.mergeRequest?.notes.pageInfo.endCursor;
      hasNextPage = data.project?.mergeRequest?.notes.pageInfo.hasNextPage;

      results.push(...(data.project?.mergeRequest?.notes.nodes ?? []));
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

  async getCommitComments(
    commitSha: string,
    keepMarkdownHeader?: boolean
  ): Promise<CommentResult[]> {
    const results: { id: number; created_at: string; body: string }[] = [];

    console.log(
      `Fetching commit comments for ${this.owner}/${this.repo} commit ${commitSha}`
    );

    let page = '1';
    while (page) {
      const resp = await axios.get<
        {
          individual_note: boolean;
          notes: { id: number; created_at: string; body: string }[];
        }[]
      >(
        `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}/repository/commits/${commitSha}/discussions?per_page=100&page=${page}`,
        { headers: this.authHeaders() }
      );

      page = resp.headers['x-next-page'];

      const notes = resp.data
        .filter((d) => d.individual_note)
        .map((d) => d.notes)
        .flat();
      results.push(...notes);
    }

    const comments = results
      .sort((a, b) =>
        `${a.created_at} ${a.id}`.localeCompare(`${b.created_at} ${b.id}`)
      )
      .map((r) => ({
        body: keepMarkdownHeader ? r.body : stripMarkdownTag(r.body),
        isHidden: false,
      }));

    return comments;
  }

  async closeMr(prNumber: number): Promise<void> {
    console.log(`Closing MR ${prNumber}`);

    await axios.put(
      `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}/merge_requests/${prNumber}`,
      {
        state_event: 'close',
      },
      { headers: this.authHeaders() }
    );
  }

  async closeAllMrs(): Promise<void> {
    console.log(`Closing all test MRs`);

    const resp = await axios.get(
      `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}/merge_requests?state=opened`,
      { headers: this.authHeaders() }
    );

    for (const mr of resp.data) {
      if (!mr.source_branch.startsWith(`${branchPrefix}`)) {
        console.log(
          `Skipping MR ${mr.number} since it's for branch ${mr.head.ref} which doesn't match the expected branch prefix of ${branchPrefix}`
        );
        continue;
      }
      await this.closeMr(mr.iid);
    }
  }

  async deleteRepoIfPossible(): Promise<void> {
    console.log(`Attempting to delete repo ${this.owner}/${this.repo}`);

    try {
      await axios.delete(
        `https://gitlab.com/api/v4/projects/${this.encodedProjectPath()}`,
        { headers: this.authHeaders() }
      );
    } catch (err) {
      console.log(`Unable to delete test repo: ${err.message}`);
      console.log(`If you need to clean up the repo, please do so manually`);
      return;
    }

    console.log(`Deleted repo ${this.owner}/${this.repo}`);
  }
}
