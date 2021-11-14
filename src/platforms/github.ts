import { Octokit } from 'octokit';
import { Repository } from '@octokit/graphql-schema';
import { Comment, CommentHandlerOptions } from '.';
import BaseCommentHandler from './base';
import { DetectResult } from '..';
import { Logger } from '../util';

export type GitHubOptions = CommentHandlerOptions & {
  token: string;
  apiUrl: string;
};

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
      this.errorHandler('GITHUB_TOKEN is required');
      return;
    }

    this.apiUrl =
      opts?.apiUrl || process.env.GITHUB_API_URL || 'https://api.github.com';

    this.octokit = new Octokit({
      auth: this.token,
      apiUrl: this.apiUrl,
    });
  }
}

export class GitHubPrHandler extends GitHubHandler {
  constructor(project: string, private prNumber: number, opts?: GitHubOptions) {
    super(project, opts as GitHubOptions);
  }

  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for GitHub Actions pull request');

    if (process.env.GITHUB_ACTIONS !== 'true') {
      logger.debug('GITHUB_ACTIONS environment variable is not set to true');
      return null;
    }
    logger.debug('GITHUB_ACTIONS environment variable is set to true');

    const project = process.env.GITHUB_REPOSITORY;
    if (!project) {
      logger.debug('GITHUB_REPOSITORY environment variable is not set');
      return null;
    }
    logger.debug(`GITHUB_REPOSITORY environment variable is set to ${project}`);

    if (!process.env.GITHUB_PULL_REQUEST_NUMBER) {
      logger.debug(
        'GITHUB_PULL_REQUEST_NUMBER environment variable is not set'
      );
      return null;
    }
    logger.debug(
      `GITHUB_PULL_REQUEST_NUMBER environment variable is set to ${process.env.GITHUB_PULL_REQUEST_NUMBER}`
    );

    const prNumber = Number(process.env.GITHUB_PULL_REQUEST_NUMBER);

    if (Number.isNaN(prNumber)) {
      logger.debug(
        `GITHUB_PULL_REQUEST_NUMBER environment variable is not a valid number`
      );
      return null;
    }

    return {
      platform: 'github',
      project,
      targetType: 'pr',
      targetRef: prNumber,
    };
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
          prNumber: this.prNumber,
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
      issue_number: this.prNumber,
      body,
    });

    return new GitHubComment(
      resp.data.id.toString(),
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

export class GitHubCommitHandler extends GitHubHandler {
  constructor(
    project: string,
    private commitSha: string,
    opts?: GitHubOptions
  ) {
    super(project, opts as GitHubOptions);
  }

  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for GitHub Actions commit');

    if (process.env.GITHUB_ACTIONS !== 'true') {
      logger.debug('GITHUB_ACTIONS environment variable is not set to true');
      return null;
    }
    logger.debug('GITHUB_ACTIONS environment variable is set to true');

    const project = process.env.GITHUB_REPOSITORY;
    if (!project) {
      logger.debug('GITHUB_REPOSITORY environment variable is not set');
      return null;
    }

    logger.debug(`GITHUB_REPOSITORY environment variable is set to ${project}`);

    if (!process.env.GITHUB_COMMIT_SHA) {
      logger.debug('GITHUB_COMMIT_SHA environment variable is not set');
      return null;
    }
    logger.debug(
      `GITHUB_COMMIT_SHA environment variable is set to ${process.env.GITHUB_COMMIT_SHA}`
    );

    return {
      platform: 'github',
      project,
      targetType: 'commit',
      targetRef: process.env.GITHUB_COMMIT_SHA,
    };
  }

  async callCreateComment(body: string): Promise<GitHubComment> {
    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Pull Request ID as well
    const resp = await this.octokit.rest.repos.createCommitComment({
      owner: this.owner,
      repo: this.repo,
      commit_sha: this.commitSha,
      body,
    });

    return new GitHubComment(
      resp.data.id.toString(),
      resp.data.body,
      resp.data.created_at,
      resp.data.html_url,
      false
    );
  }

  callFindMatchingComments = this.unsupported(
    'Finding matching comments on GitHub commits is not currently supported'
  );

  callUpdateComment = this.unsupported(
    'Updating comments on GitHub commits is not currently supported'
  );

  callDeleteComment = this.unsupported(
    'Deleting comments on GitHub commits is not currently supported'
  );

  callHideComment = this.unsupported(
    'Hiding comments on GitHub commits is not currently supported'
  );
}
