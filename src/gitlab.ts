import chalk from 'chalk';
import axios from 'axios';
import {
  Integration,
  Logger,
  ErrorHandler,
  GitLabOptions,
  ActionOptions,
} from './types';
import { markdownComment, markdownTag } from './util';

type Comment = {
  id: string;
  url: string;
  createdAt: string;
  body: string;
};

export default class GitLabIntegration extends Integration {
  private token: string;

  private serverUrl: string;

  private project: string;

  private mergeRequestNumber: number;

  constructor(
    opts: GitLabOptions,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {
    super();
    this.processOpts(opts);
  }

  static autoDetect(): boolean {
    return process.env.GITLAB_CI === 'true';
  }

  processOpts(opts?: GitLabOptions): void {
    this.token = opts?.token || process.env.GITLAB_TOKEN;
    if (!this.token) {
      this.errorHandler('GITLAB_TOKEN is required');
    }

    this.serverUrl =
      opts?.serverUrl || process.env.CI_SERVER_URL || 'https://gitlab.com';

    this.project = opts?.project || process.env.CI_PROJECT_PATH;
    if (!this.project) {
      this.errorHandler('CI_PROJECT_PATH is required');
    }

    this.mergeRequestNumber =
      opts?.mergeRequestNumber || Number(process.env.CI_MERGE_REQUEST_IID);

    if (!this.mergeRequestNumber) {
      this.errorHandler('CI_MERGE_REQUEST_IID is required');
    }

    if (Number.isNaN(this.mergeRequestNumber)) {
      this.errorHandler('Invalid GitLab pull request number');
    }
  }

  async create(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    await this.createComment(bodyWithTag);
  }

  async upsert(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    const matchingComments = await this.findMatchingComments(opts.tag);
    const latestMatchingComment =
      GitLabIntegration.getLatestMatchingComment(matchingComments);

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

  async hideAndCreate(): Promise<void> {
    this.errorHandler('hideAndCreate is not supported by GitLab');
  }

  async deleteAndCreate(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    const matchingComments = await this.findMatchingComments(opts.tag);
    await this.deleteComments(matchingComments);

    await this.createComment(bodyWithTag);
  }

  private async findMatchingComments(tag: string): Promise<Comment[]> {
    this.logger.info(`Finding matching comments for tag \`${tag}\``);

    const allComments: Comment[] = [];

    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = `
        query($project: ID!, $mergeRequestNumber: String!, $after: String) {
          project(fullPath: $project) {
            mergeRequest(iid: $mergeRequestNumber) {
              notes(first: 100, after: $after) {
                nodes {
                  id
                  url
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
        project: this.project,
        mergeRequestNumber: this.mergeRequestNumber.toString(),
        after,
      };

      const resp = await axios.post<{
        errors: object[];
        data: {
          project: {
            mergeRequest?: {
              notes: {
                nodes: Comment[];
                pageInfo: {
                  endCursor: string;
                  hasNextPage: boolean;
                };
              };
            };
          };
        };
      }>(
        `${this.serverUrl}/api/graphql`,
        { query, variables },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      if (resp.data.errors) {
        this.errorHandler(
          `Failed to fetch comments: ${JSON.stringify(resp.data.errors)}`
        );
      }

      const { data } = resp.data;

      after = data.project?.mergeRequest?.notes.pageInfo.endCursor;
      hasNextPage = data.project?.mergeRequest?.notes.pageInfo.hasNextPage;
      allComments.push(...(data.project?.mergeRequest?.notes.nodes || []));
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

  private static getLatestMatchingComment(comments: Comment[]): Comment {
    return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  private async createComment(body: string): Promise<void> {
    this.logger.info(
      `Creating new comment on merge request ${this.mergeRequestNumber}`
    );

    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Merge Request ID as well
    const resp = await axios.post<{ id: number }>(
      `${this.serverUrl}/api/v4/projects/${encodeURIComponent(
        this.project
      )}/merge_requests/${this.mergeRequestNumber}/notes`,
      { body },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    const url = `${this.serverUrl}/${this.project}/-/merge_requests/${this.mergeRequestNumber}#note_${resp.data.id}`;

    this.logger.info(`Created new comment: ${chalk.blueBright(url)}`);
  }

  private async updateComment(comment: Comment, body: string): Promise<void> {
    this.logger.info(`Updating comment ${chalk.blueBright(comment.url)}`);

    const query = `
      mutation($input: UpdateNoteInput!) {
        updateNote(input: $input) {
          clientMutationId
        }
      }`;

    const variables = {
      input: {
        id: comment.id,
        body,
      },
    };

    const resp = await axios.post<{
      errors: object[];
    }>(
      `${this.serverUrl}/api/graphql`,
      { query, variables },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (resp.data.errors) {
      this.errorHandler(
        `Failed to update comment: ${JSON.stringify(resp.data.errors)}`
      );
    }
  }

  private async deleteComment(comment: Comment): Promise<void> {
    this.logger.info(`Deleting comment ${chalk.blueBright(comment.url)}`);

    const query = `
      mutation($input: DestroyNoteInput!) {
        destroyNote(input: $input) {
          clientMutationId
        }
      }`;

    const variables = {
      input: {
        id: comment.id,
      },
    };

    const resp = await axios.post<{
      errors: object[];
    }>(
      `${this.serverUrl}/api/graphql`,
      { query, variables },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (resp.data.errors) {
      this.errorHandler(
        `Failed to delete comment: ${JSON.stringify(resp.data.errors)}`
      );
    }
  }

  private async deleteComments(comments: Comment[]): Promise<void> {
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
}
