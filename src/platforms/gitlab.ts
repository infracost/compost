import axios from 'axios';
import {
  CommentHandlerOptions,
  Comment,
  DetectResult,
  TargetReference,
  TargetType,
} from '../types';
import { BaseCommentHandler, BasePlatform } from './base';

export type GitLabDetectResult = DetectResult & {
  token: string;
  serverUrl: string;
};

class GitLabComment implements Comment {
  constructor(
    public id: string,
    public body: string,
    public createdAt: string,
    public url: string,
    public discussionId?: number
  ) {}

  ref(): string {
    return this.url;
  }

  sortKey(): string {
    // Use ID as well if issues were posted in the same second
    return `${this.createdAt} ${this.id}`;
  }

  // eslint-disable-next-line class-methods-use-this
  isHidden(): boolean {
    return false;
  }
}

export class GitLab extends BasePlatform {
  private handler: GitLabHandler;

  constructor(
    project: string,
    targetType: TargetType,
    targetRef: TargetReference,
    token?: string,
    serverUrl?: string,
    opts?: CommentHandlerOptions
  ) {
    super(opts);

    if (targetType === 'commit') {
      this.handler = new GitLabCommitHandler(
        project,
        targetRef as string,
        token,
        serverUrl,
        opts
      );
    } else {
      this.handler = new GitLabMrHandler(
        project,
        targetRef as number,
        token,
        serverUrl,
        opts
      );
    }
  }

  getHandler(): GitLabHandler {
    return this.handler;
  }
}

abstract class GitLabHandler extends BaseCommentHandler<GitLabComment> {
  constructor(
    protected project: string,
    protected token?: string,
    protected serverUrl?: string,
    opts?: CommentHandlerOptions
  ) {
    super(opts);

    this.token ||= process.env.GITLAB_TOKEN;
    if (!this.token) {
      this.errorHandler(
        'GitLab token was not specified or could not be detected from the GITLAB_TOKEN environment variable'
      );
      return;
    }

    this.serverUrl ||= process.env.CI_SERVER_URL || 'https://gitlab.com';
  }

  protected authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  protected encodedProjectPath(): string {
    return encodeURIComponent(`${this.project}`);
  }
}

export class GitLabMrHandler extends GitLabHandler {
  constructor(
    project: string,
    private mrNumber: number,
    token?: string,
    gitlabApiUrl?: string,
    opts?: CommentHandlerOptions
  ) {
    super(project, token, gitlabApiUrl, opts);
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
        { headers: this.authHeaders() }
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
      `${
        this.serverUrl
      }/api/v4/projects/${this.encodedProjectPath()}/merge_requests/${
        this.mrNumber
      }/notes`,
      { body },
      { headers: this.authHeaders() }
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
      { headers: this.authHeaders() }
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
      { headers: this.authHeaders() }
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

  async callHideComment() {
    // Shouldn't get here
    this.errorHandler('Not implemented');
  }
}

export class GitLabCommitHandler extends GitLabHandler {
  constructor(
    project: string,
    private commitSha: string,
    token?: string,
    gitlabApiUrl?: string,
    opts?: CommentHandlerOptions
  ) {
    super(project, token, gitlabApiUrl, opts);
  }

  async callFindMatchingComments(tag: string): Promise<GitLabComment[]> {
    const allComments: GitLabComment[] = [];

    let page = '1';
    while (page) {
      const resp = await axios.get<
        {
          id: number;
          individual_note: boolean;
          notes: { id: number; created_at: string; body: string }[];
        }[]
      >(
        `${this.serverUrl}/api/v4/projects/${encodeURIComponent(
          this.project
        )}/repository/commits/${
          this.commitSha
        }/discussions?per_page=100&page=${page}`,
        { headers: this.authHeaders() }
      );
      page = resp.headers['x-next-page'];

      const discussions = resp.data.filter((d) => d.individual_note);

      discussions.forEach((d) => {
        d.notes.forEach((n) => {
          const url = `${this.serverUrl}/${this.project}/-/commit/${this.commitSha}#note_${n.id}`;
          allComments.push(
            new GitLabComment(n.id.toString(), n.body, n.created_at, url, d.id)
          );
        });
      });
    }

    const matchingComments = allComments.filter((c) => c.body.includes(tag));

    return matchingComments;
  }

  async callCreateComment(body: string): Promise<GitLabComment> {
    const resp = await axios.post<{
      id: string;
      body: string;
      created_at: string;
    }>(
      `${
        this.serverUrl
      }/api/v4/projects/${this.encodedProjectPath()}/repository/commits/${
        this.commitSha
      }/comments`,
      { note: body },
      { headers: this.authHeaders() }
    );

    const url = `${this.serverUrl}/${this.project}/-/commits/${this.commitSha}#note_${resp.data.id}`;

    return new GitLabComment(
      resp.data.id,
      resp.data.body,
      resp.data.created_at,
      url
    );
  }

  async callUpdateComment(comment: GitLabComment, body: string): Promise<void> {
    await axios.put<{
      id: string;
      body: string;
      created_at: string;
    }>(
      `${
        this.serverUrl
      }/api/v4/projects/${this.encodedProjectPath()}/repository/commits/${
        this.commitSha
      }/discussions/${comment.discussionId}/notes/${comment.id}`,
      { body },
      { headers: this.authHeaders() }
    );
  }

  async callDeleteComment(comment: GitLabComment): Promise<void> {
    await axios.delete<{
      id: string;
      body: string;
      created_at: string;
    }>(
      `${
        this.serverUrl
      }/api/v4/projects/${this.encodedProjectPath()}/repository/commits/${
        this.commitSha
      }/discussions/${comment.discussionId}/notes/${comment.id}`,
      { headers: this.authHeaders() }
    );
  }

  async hideAndNewComment(body: string): Promise<void> {
    this.logger.warn('Hiding comments is not supported by GitLab');
    await this.newComment(body);
  }

  async callHideComment() {
    // Shouldn't get here
    this.errorHandler('Not implemented');
  }
}
