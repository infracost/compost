import axios from 'axios';
import BaseCommentHandler, { Comment } from './base';
import { CommentHandlerOptions, DetectResult } from '../types';

export type GitLabOptions = CommentHandlerOptions & {
  token: string;
  serverUrl: string;
};

export type GitLabDetectResult = DetectResult & {
  opts: GitLabOptions;
};

class GitLabComment implements Comment {
  constructor(
    public id: string,
    public body: string,
    public createdAt: string,
    public url: string
  ) {}

  ref(): string {
    return this.url;
  }

  sortKey(): string {
    return this.createdAt;
  }

  // eslint-disable-next-line class-methods-use-this
  isHidden(): boolean {
    return false;
  }
}

abstract class GitLabHandler extends BaseCommentHandler<GitLabComment> {
  protected token: string;

  protected serverUrl: string;

  constructor(protected project: string, opts?: GitLabOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);
  }

  processOpts(opts?: GitLabOptions): void {
    this.token = opts?.token || process.env.GITLAB_TOKEN;
    if (!this.token) {
      this.errorHandler('--gitlab-token or GITLAB_TOKEN is required');
      return;
    }

    this.serverUrl =
      opts?.serverUrl || process.env.CI_SERVER_URL || 'https://gitlab.com';
  }
}

export class GitLabMrHandler extends GitLabHandler {
  constructor(project: string, private mrNumber: number, opts?: GitLabOptions) {
    super(project, opts as GitLabOptions);
  }

  async callFindMatchingComments(tag: string): Promise<GitLabComment[]> {
    const allComments: GitLabComment[] = [];

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
        mrNumber: this.mrNumber.toString(),
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
                  url: string;
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

      const comments = (data.project?.mergeRequest?.notes.nodes || []).map(
        (c) => new GitLabComment(c.id, c.body, c.createdAt, c.url)
      );

      allComments.push(...comments);
    }

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    return matchingComments;
  }

  async callCreateComment(body: string): Promise<GitLabComment> {
    // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Merge Request ID as well
    const resp = await axios.post<{
      id: string;
      body: string;
      created_at: string;
    }>(
      `${this.serverUrl}/api/v4/projects/${encodeURIComponent(
        this.project
      )}/merge_requests/${this.mrNumber}/notes`,
      { body },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    const url = `${this.serverUrl}/${this.project}/-/merge_requests/${this.mrNumber}#note_${resp.data.id}`;

    return new GitLabComment(
      resp.data.id,
      resp.data.body,
      resp.data.created_at,
      url
    );
  }

  async callUpdateComment(comment: GitLabComment, body: string): Promise<void> {
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

  async callDeleteComment(comment: GitLabComment): Promise<void> {
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

  async hideAndNewComment(body: string): Promise<void> {
    this.logger.warn('Hiding comments is not supported by GitLab');
    await this.newComment(body);
  }

  // eslint-disable-next-line class-methods-use-this
  async callHideComment() {
    // Shouldn't get here
    this.errorHandler('Not implemented');
  }
}
