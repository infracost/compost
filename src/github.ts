import { Octokit } from 'octokit';
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import {
  Integration,
  Logger,
  ErrorHandler,
  GitHubOptions,
  PostCommentOptions,
} from './types';
import { markdownComment, markdownTag } from './util';

const octokit = new Octokit();
type ListCommentsType = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.rest.issues.listComments
>;
type GetCommentType = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.rest.issues.getComment
>;

export default class GitHubIntegration extends Integration {
  private token: string;

  private apiUrl: string;

  private owner: string;

  private repo: string;

  private pullRequestNumber: number;

  private client: Octokit;

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

    this.client = new Octokit({
      auth: this.token,
      apiUrl: this.apiUrl,
    });
  }

  async postComment(opts: PostCommentOptions): Promise<void> {
    const body = markdownComment(opts.message, opts.tag);

    let hasUpdated = false;

    if (opts.upsertLatest) {
      const latestMatchingComment = await this.findLatestMatchingComment(
        opts.tag
      );

      if (!latestMatchingComment) {
        this.logger.info(`Could not find a latest matching comment`);
      } else {
        if (body === latestMatchingComment.body) {
          this.logger.info(
            `Not updating comment since the latest one matches exactly: ${latestMatchingComment.url}`
          );
          return;
        }

        this.logger.info(`Updating comment ${latestMatchingComment.url}`);
        await this.updateComment(latestMatchingComment.id, body);
        hasUpdated = true;
      }
    }

    if (!hasUpdated) {
      this.logger.info(`Creating new comment`);
      await this.createComment(body);
    }
  }

  async findMatchingComments(tag: string): Promise<ListCommentsType> {
    const allComments = await this.client.paginate(
      this.client.rest.issues.listComments,
      {
        owner: this.owner,
        repo: this.repo,
        issue_number: this.pullRequestNumber,
        per_page: 100,
      }
    );

    return allComments.filter((c) => c.body.includes(markdownTag(tag)));
  }

  async findLatestMatchingComment(tag: string): Promise<GetCommentType> {
    const matchingComments = await this.findMatchingComments(tag);
    return matchingComments.sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    )[0];
  }

  async updateComment(id: number, body: string): Promise<void> {
    await this.client.rest.issues.updateComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: id,
      body,
    });
  }

  async createComment(body: string): Promise<void> {
    await this.client.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullRequestNumber,
      body,
    });
  }
}
