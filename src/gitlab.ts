import axios from 'axios';
import { Logger, ErrorHandler, GitLabOptions, Comment } from './types';
import Integration from './integration';

export default class GitLabIntegration extends Integration {
  private token: string;

  private serverUrl: string;

  private project: string;

  private mergeRequestNumber: number;

  constructor(opts: GitLabOptions, logger: Logger, errorHandler: ErrorHandler) {
    super(logger, errorHandler);
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

  async hideAndCreate(): Promise<void> {
    this.errorHandler('Hiding comments is hot supported by GitLab');
  }

  async hideComment(): Promise<void> {
    this.errorHandler('Hiding comments is hot supported by GitLab');
  }

  async findMatchingComments(tag: string): Promise<Comment[]> {
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

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    return matchingComments;
  }

  async createComment(body: string): Promise<Comment> {
    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Merge Request ID as well
    const resp = await axios.post<{
      id: number;
      body: string;
      created_at: string;
    }>(
      `${this.serverUrl}/api/v4/projects/${encodeURIComponent(
        this.project
      )}/merge_requests/${this.mergeRequestNumber}/notes`,
      { body },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    const url = `${this.serverUrl}/${this.project}/-/merge_requests/${this.mergeRequestNumber}#note_${resp.data.id}`;

    return {
      id: resp.data.id.toString(),
      url,
      body: resp.data.body,
      createdAt: resp.data.created_at,
    };
  }

  async updateComment(comment: Comment, body: string): Promise<void> {
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

  async deleteComment(comment: Comment): Promise<void> {
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
}
