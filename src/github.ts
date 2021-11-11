import { Octokit } from 'octokit';
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import {
  PostCommentOptions,
  Integration,
  Logger,
  ErrorHandler,
  GitHubOptions,
} from './types';
import { markdownComment, markdownTag } from './util';

export default class GitHubIntegration extends Integration {
  static integrationName = 'github';

  private token: string;

  private apiUrl: string;

  private repository: string;

  private pullRequestNumber: number;

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

    this.repository = opts?.repository || process.env.GITHUB_REPOSITORY;
    if (!this.repository) {
      this.errorHandler('GITHUB_REPOSITORY is required');
    }

    this.pullRequestNumber =
      opts?.pullRequestNumber || Number(process.env.GITHUB_PULL_REQUEST_NUMBER);

    if (!this.pullRequestNumber) {
      this.errorHandler('GITHUB_PULL_REQUEST_NUMBER is required');
    }

    if (Number.isNaN(this.pullRequestNumber)) {
      this.errorHandler('Invalid GitHub pull request number');
    }
  }

  async postComment(opts: PostCommentOptions): Promise<void> {
    const client = new Octokit({
      auth: this.token,
      apiUrl: this.apiUrl,
    });

    const owner = this.repository.split('/')[0];
    const repo = this.repository.split('/', 2)[1];

    const body = markdownComment(opts.message, opts.tag);

    let hasUpdated = false;

    if (opts.upsertLatest) {
      const perPage = 100;
      let page = 1;
      let hasNext = true;

      let matchingComments: GetResponseDataTypeFromEndpointMethod<
        typeof client.rest.issues.listComments
      > = [];

      while (hasNext) {
        const resp = await client.rest.issues.listComments({
          owner,
          repo,
          issue_number: this.pullRequestNumber,
          per_page: 100,
          page,
        });

        matchingComments = matchingComments.concat(
          resp.data.filter((c) => c.body.includes(markdownTag(opts.tag)))
        );

        page += 1;

        hasNext = resp.data.length === perPage;
      }

      if (matchingComments.length > 0) {
        const latestMatching = matchingComments.sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )[0];

        if (body === latestMatching.body) {
          this.logger.log(
            `Not updating comment since the latest one matches exactly: ${latestMatching.url}`
          );
          return;
        }

        this.logger.log(`Updating comment ${latestMatching.url}`);

        await client.rest.issues.updateComment({
          owner,
          repo,
          comment_id: latestMatching.id,
          body,
        });

        hasUpdated = true;
      } else {
        this.logger.log(`Could not find a latest matching comment`);
      }
    }

    if (!hasUpdated) {
      this.logger.log(`Creating new comment`);
      await client.rest.issues.createComment({
        owner,
        repo,
        issue_number: this.pullRequestNumber,
        body,
      });
    }
  }
}
