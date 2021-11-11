import { Octokit } from 'octokit';
import { Repository } from '@octokit/graphql-schema';
import { Comment, Logger, ErrorHandler, GitHubOptions } from './types';
import Integration from './integration';

export default class GitHubIntegration extends Integration {
  private token: string;

  private apiUrl: string;

  private owner: string;

  private repo: string;

  private pullRequestNumber: number;

  private octokit: Octokit;

  constructor(opts: GitHubOptions, logger: Logger, errorHandler: ErrorHandler) {
    super(logger, errorHandler);
    this.processOpts(opts);
  }

  static autoDetect(): boolean {
    return process.env.GITHUB_ACTIONS === 'true';
  }

  processOpts(opts?: GitHubOptions): void {
    this.token = opts?.token || process.env.GITHUB_TOKEN;
    if (!this.token) {
      this.errorHandler('GITHUB_TOKEN is required');
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
      }
    }

    this.pullRequestNumber =
      opts?.pullRequestNumber || Number(process.env.GITHUB_PULL_REQUEST_NUMBER);

    if (!this.pullRequestNumber) {
      this.errorHandler('GITHUB_PULL_REQUEST_NUMBER is required');
    }

    if (Number.isNaN(this.pullRequestNumber)) {
      this.errorHandler('Invalid GitHub pull request number');
    }

    this.octokit = new Octokit({
      auth: this.token,
      apiUrl: this.apiUrl,
    });
  }

  async findMatchingComments(tag: string): Promise<Comment[]> {
    this.logger.info(`Finding matching comments for tag \`${tag}\``);

    const allComments: Comment[] = [];

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

      allComments.push(
        ...((data.repository?.pullRequest?.comments.nodes as Comment[]) || [])
      );
    }

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    return matchingComments;
  }

  async createComment(body: string): Promise<Comment> {
    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Pull Request ID as well
    const resp = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullRequestNumber,
      body,
    });

    return {
      id: resp.data.id.toString(),
      url: resp.data.html_url,
      createdAt: resp.data.created_at,
      body: resp.data.body,
    };
  }

  async updateComment(comment: Comment, body: string): Promise<void> {
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

  async deleteComment(comment: Comment): Promise<void> {
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

  async hideComment(comment: Comment): Promise<void> {
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
