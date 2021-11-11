import { Octokit } from 'octokit';
import chalk from 'chalk';
import { IssueComment, Repository } from '@octokit/graphql-schema';
import {
  Integration,
  Logger,
  ErrorHandler,
  GitHubOptions,
  ActionOptions,
} from './types';
import { markdownComment, markdownTag } from './util';

export default class GitHubIntegration extends Integration {
  private token: string;

  private apiUrl: string;

  private owner: string;

  private repo: string;

  private pullRequestNumber: number;

  private octokit: Octokit;

  constructor(
    opts: GitHubOptions,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {
    super();
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

  async create(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    await this.createComment(bodyWithTag);
  }

  async upsert(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    const matchingComments = await this.findMatchingComments(opts.tag);
    const latestMatchingComment =
      GitHubIntegration.getLatestMatchingComment(matchingComments);

    if (latestMatchingComment) {
      if (bodyWithTag === latestMatchingComment.body) {
        this.logger.info(
          `Not updating comment since the latest one matches exactly: ${chalk.blueBright(
            latestMatchingComment.url
          )}`
        );
        return;
      }

      await this.updateComment(latestMatchingComment, body);
    } else {
      await this.createComment(body);
    }
  }

  async hideAndCreate(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    const matchingComments = await this.findMatchingComments(opts.tag);
    await this.hideComments(matchingComments);

    await this.createComment(bodyWithTag);
  }

  async deleteAndCreate(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    const matchingComments = await this.findMatchingComments(opts.tag);
    await this.deleteComments(matchingComments);

    await this.createComment(bodyWithTag);
  }

  private async findMatchingComments(tag: string): Promise<IssueComment[]> {
    this.logger.info(`Finding matching comments for tag \`${tag}\``);

    const allComments: IssueComment[] = [];

    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const data = await this.octokit.graphql<{ repository?: Repository }>(
        `
        query($repo: String! $owner: String! $number: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $number) {
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
          number: this.pullRequestNumber,
          after,
        }
      );

      after = data.repository?.pullRequest?.comments.pageInfo.endCursor;
      hasNextPage = data.repository?.pullRequest?.comments.pageInfo.hasNextPage;
      allComments.push(...(data.repository?.pullRequest?.comments.nodes || []));
    }

    const matchingComments = allComments.filter((c) =>
      c.body.includes(markdownTag(tag))
    );

    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    return matchingComments;
  }

  private static getLatestMatchingComment(
    comments: IssueComment[]
  ): IssueComment {
    return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  private async createComment(body: string): Promise<void> {
    this.logger.info(
      `Creating new comment on pull request ${this.pullRequestNumber}`
    );

    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Pull Request ID as well
    const resp = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullRequestNumber,
      body,
    });

    this.logger.info(
      `Created new comment: ${chalk.blueBright(resp.data.html_url)}`
    );
  }

  private async updateComment(
    comment: IssueComment,
    body: string
  ): Promise<void> {
    this.logger.info(`Updating comment ${chalk.blueBright(comment.url)}`);

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

  private async deleteComment(comment: IssueComment): Promise<void> {
    this.logger.info(`Deleting comment ${chalk.blueBright(comment.url)}`);

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

  private async hideComment(comment: IssueComment): Promise<void> {
    this.logger.info(`Hiding comment ${chalk.blueBright(comment.url)}`);

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

  private async deleteComments(comments: IssueComment[]): Promise<void> {
    this.logger.info(
      `Deleting ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    comments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.deleteComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }

  private async hideComments(comments: IssueComment[]): Promise<void> {
    this.logger.info(
      `Hiding ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    const visibleComments = comments.filter((comment) => !comment.isMinimized);

    visibleComments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.hideComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }
}
