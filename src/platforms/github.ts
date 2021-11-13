import { Octokit } from 'octokit';
import { Repository } from '@octokit/graphql-schema';
import { Comment, CommentHandlerOptions } from '.';
import BaseCommentHandler from './base';

export type GitHubOptions = {
  token: string;
  apiUrl: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
} & CommentHandlerOptions;

class GitHubComment implements Comment {
  constructor(
    public id: string,
    public body: string,
    public createdAt: string,
    public url: string,
    public isMinimized?: boolean
  ) {}

  ref(): string {
    return this.url;
  }

  sortKey(): string {
    return this.createdAt;
  }

  isHidden(): boolean {
    return this.isMinimized;
  }
}

export class GitHubCommentHandler extends BaseCommentHandler<GitHubComment> {
  private token: string;

  private apiUrl: string;

  private owner: string;

  private repo: string;

  private pullRequestNumber: number;

  private octokit: Octokit;

  constructor(opts?: GitHubOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);
  }

  static detect(): boolean {
    return process.env.GITHUB_ACTIONS === 'true';
  }

  processOpts(opts?: GitHubOptions): void {
    this.token = opts?.token || process.env.GITHUB_TOKEN;
    if (!this.token) {
      this.errorHandler('GITHUB_TOKEN is required');
      return;
    }

    this.apiUrl =
      opts?.apiUrl || process.env.GITHUB_API_URL || 'https://api.github.com';

    this.owner = opts?.owner;
    this.repo = opts?.repo;

    if (!this.owner || !this.repo) {
      if (process.env.GITHUB_REPOSITORY) {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/', 2);
        this.owner = owner;
        this.repo = repo;
      } else {
        this.errorHandler('GITHUB_REPOSITORY is required');
        return;
      }
    }

    this.pullRequestNumber =
      opts?.pullRequestNumber || Number(process.env.GITHUB_PULL_REQUEST_NUMBER);

    if (!this.pullRequestNumber) {
      this.errorHandler('GITHUB_PULL_REQUEST_NUMBER is required');
      return;
    }

    if (Number.isNaN(this.pullRequestNumber)) {
      this.errorHandler('Invalid GitHub pull request number');
      return;
    }

    this.octokit = new Octokit({
      auth: this.token,
      apiUrl: this.apiUrl,
    });
  }

  async callFindMatchingComments(tag: string): Promise<GitHubComment[]> {
    const allComments: GitHubComment[] = [];

    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const data = await this.octokit.graphql<{ repository?: Repository }>(
        `
        query($repo: String! $owner: String! $pullRequestNumber: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $pullRequestNumber) {
              comments(first: 100 after: $after) {
                nodes {
                  id
                  url
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
          pullRequestNumber: this.pullRequestNumber,
          after,
        }
      );

      after = data.repository?.pullRequest?.comments.pageInfo.endCursor;
      hasNextPage = data.repository?.pullRequest?.comments.pageInfo.hasNextPage;

      const comments = (data.repository?.pullRequest?.comments.nodes || []).map(
        (c) =>
          new GitHubComment(c.id, c.body, c.createdAt, c.url, c.isMinimized)
      );
      allComments.push(...comments);
    }

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    return matchingComments;
  }

  async callCreateComment(body: string): Promise<GitHubComment> {
    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Pull Request ID as well
    const resp = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullRequestNumber,
      body,
    });

    return new GitHubComment(
      resp.data.id.toString(),
      resp.data.body,
      resp.data.created_at,
      resp.data.url,
      false
    );
  }

  async callUpdateComment(comment: GitHubComment, body: string): Promise<void> {
    await this.octokit.graphql(
      `
      mutation($input: UpdateIssueCommentInput!) {
        updateIssueComment(input: $input) {
          clientMutationId
        }
      }`,
      {
        input: {
          id: comment.id,
          body,
        },
      }
    );
  }

  async callDeleteComment(comment: GitHubComment): Promise<void> {
    await this.octokit.graphql(
      `
      mutation($input: DeleteIssueCommentInput!) { 
        deleteIssueComment(input: $input) {
          clientMutationId
        }
      }
      `,
      {
        input: {
          id: comment.id,
        },
      }
    );
  }

  async callHideComment(comment: GitHubComment): Promise<void> {
    await this.octokit.graphql(
      `
      mutation($input: MinimizeCommentInput!) { 
        minimizeComment(input: $input) {
          clientMutationId
        }
      }
      `,
      {
        input: {
          subjectId: comment.id,
          classifier: 'OUTDATED',
        },
      }
    );
  }
}
