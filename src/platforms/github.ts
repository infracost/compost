import { Octokit } from 'octokit';
import { Repository, Commit } from '@octokit/graphql-schema';
import { retry } from '@octokit/plugin-retry';
import BaseCommentHandler from './base';
import { CommentHandlerOptions, Comment, DetectResult } from '../types';

const OctokitWithRetries = Octokit.plugin(retry);

export type GitHubOptions = CommentHandlerOptions & {
  token: string;
  apiUrl?: string;
};

export type GitHubDetectResult = DetectResult & {
  opts: GitHubOptions;
};

class GitHubComment implements Comment {
  constructor(
    public globalId: string,
    public id: number,
    public body: string,
    public createdAt: string,
    public url: string,
    public isMinimized?: boolean
  ) {}

  ref(): string {
    return this.url;
  }

  sortKey(): string {
    // Use ID as well if issues were posted in the same second
    return `${this.createdAt} ${this.id}`;
  }

  isHidden(): boolean {
    return this.isMinimized;
  }
}

abstract class GitHubHandler extends BaseCommentHandler<GitHubComment> {
  protected token: string;

  protected apiUrl: string;

  protected owner: string;

  protected repo: string;

  protected octokit: Octokit;

  constructor(protected project: string, opts?: GitHubOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);

    const projectParts = project.split('/', 2);
    if (projectParts.length !== 2) {
      this.errorHandler(
        `Invalid GitHub repository name: ${project}, expecting owner/repo`
      );
      return;
    }

    [this.owner, this.repo] = projectParts;
  }

  private processOpts(opts?: GitHubOptions): void {
    this.token = opts?.token || process.env.GITHUB_TOKEN;
    if (!this.token) {
      this.errorHandler('--github-token or GITHUB_TOKEN is required');
      return;
    }

    this.apiUrl =
      opts?.apiUrl || process.env.GITHUB_API_URL || 'https://api.github.com';

    this.octokit = new OctokitWithRetries({
      auth: this.token,
      baseUrl: this.apiUrl,
    });
  }
}

export class GitHubPrHandler extends GitHubHandler {
  constructor(project: string, private prNumber: number, opts?: GitHubOptions) {
    super(project, opts as GitHubOptions);
  }

  async callFindMatchingComments(tag: string): Promise<GitHubComment[]> {
    const allComments: GitHubComment[] = [];

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
                  databaseId
                  url
                  createdAt
                  publishedAt
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
          prNumber: this.prNumber,
          after,
        }
      );

      after = data.repository?.pullRequest?.comments.pageInfo.endCursor;
      hasNextPage = data.repository?.pullRequest?.comments.pageInfo.hasNextPage;

      const comments = (data.repository?.pullRequest?.comments.nodes || []).map(
        (c) =>
          new GitHubComment(
            c.id,
            c.databaseId,
            c.body,
            c.publishedAt ?? c.createdAt,
            c.url,
            c.isMinimized
          )
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
      issue_number: this.prNumber,
      body,
    });

    return new GitHubComment(
      resp.data.node_id,
      resp.data.id,
      resp.data.body,
      resp.data.created_at,
      resp.data.html_url,
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
          id: comment.globalId,
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
          id: comment.globalId,
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
          subjectId: comment.globalId,
          classifier: 'OUTDATED',
        },
      }
    );
  }
}

// Commit comments aren't supported by the GraphQL API so this class uses the REST API
export class GitHubCommitHandler extends GitHubHandler {
  constructor(
    project: string,
    private commitSha: string,
    opts?: GitHubOptions
  ) {
    super(project, opts as GitHubOptions);
  }

  async callFindMatchingComments(tag: string): Promise<GitHubComment[]> {
    const allComments: GitHubComment[] = [];

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
                    databaseId
                    url
                    createdAt
                    publishedAt
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
        }`,
        {
          owner: this.owner,
          repo: this.repo,
          commitSha: this.commitSha,
          after,
        }
      );

      const commit = data.repository?.object as Commit | undefined;
      after = commit?.comments.pageInfo.endCursor;
      hasNextPage = commit?.comments.pageInfo.hasNextPage;

      const comments = (commit?.comments.nodes || []).map(
        (c) =>
          new GitHubComment(
            c.id,
            c.databaseId,
            c.body,
            c.publishedAt ?? c.createdAt,
            c.url,
            c.isMinimized
          )
      );
      allComments.push(...comments);
    }

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    return matchingComments;
  }

  async callCreateComment(body: string): Promise<GitHubComment> {
    const resp = await this.octokit.rest.repos.createCommitComment({
      owner: this.owner,
      repo: this.repo,
      commit_sha: this.commitSha,
      body,
    });

    return new GitHubComment(
      resp.data.node_id,
      resp.data.id,
      resp.data.body,
      resp.data.created_at,
      resp.data.html_url,
      false
    );
  }

  async callUpdateComment(comment: GitHubComment, body: string): Promise<void> {
    await this.octokit.rest.repos.updateCommitComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: comment.id,
      body,
    });
  }

  async callDeleteComment(comment: GitHubComment): Promise<void> {
    await this.octokit.rest.repos.deleteCommitComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: comment.id,
    });
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
          subjectId: comment.globalId,
          classifier: 'OUTDATED',
        },
      }
    );
  }
}
