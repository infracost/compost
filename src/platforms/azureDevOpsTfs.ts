import axios from 'axios';
import { Comment, CommentHandlerOptions } from '.';
import BaseCommentHandler from './base';

export type AzureDevOpsTfsOptions = {
  token: string;
  collectionUri: string;
  teamProject: string;
  repositoryId: string;
  pullRequestNumber: number;
} & CommentHandlerOptions;

class AzureDevOpsTfsComment implements Comment {
  constructor(
    public selfHref: string,
    public body: string,
    public createdAt: string
  ) {}

  // Azure DevOps doesn't allow you to have comment links in the browser
  ref(): string {
    return this.selfHref;
  }

  sortKey(): string {
    return this.createdAt;
  }

  // eslint-disable-next-line class-methods-use-this
  isHidden(): boolean {
    return false;
  }
}

export class AzureDevOpsTfsCommentHandler extends BaseCommentHandler<AzureDevOpsTfsComment> {
  private token: string;

  private collectionUri: string;

  private teamProject: string;

  private repositoryId: string;

  private pullRequestNumber: number;

  constructor(opts?: AzureDevOpsTfsOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);
  }

  static detect(): boolean {
    return (
      !!process.env.SYSTEM_COLLECTIONURI &&
      process.env.BUILD_REASON === 'PullRequest' &&
      process.env.BUILD_REPOSITORY_PROVIDER === 'TfsGit'
    );
  }

  processOpts(opts?: AzureDevOpsTfsOptions): void {
    this.token = opts?.token || process.env.SYSTEM_ACCESSTOKEN;
    if (!this.token) {
      this.errorHandler('SYSTEM_ACCESSTOKEN is required');
      return;
    }

    this.collectionUri =
      opts?.collectionUri || process.env.SYSTEM_COLLECTIONURI;
    if (!this.collectionUri) {
      this.errorHandler('SYSTEM_COLLECTIONURI is required');
      return;
    }

    this.teamProject = opts?.teamProject || process.env.SYSTEM_TEAMPROJECT;
    if (!this.teamProject) {
      this.errorHandler('SYSTEM_TEAMPROJECT is required');
      return;
    }

    this.repositoryId = opts?.repositoryId || process.env.BUILD_REPOSITORY_ID;
    if (!this.repositoryId) {
      this.errorHandler('BUILD_REPOSITORY_ID is required');
      return;
    }

    this.pullRequestNumber =
      opts?.pullRequestNumber ||
      Number(process.env.SYSTEM_PULLREQUEST_PULLREQUESTID);

    if (!this.pullRequestNumber) {
      this.errorHandler('SYSTEM_PULLREQUEST_PULLREQUESTID is required');
      return;
    }

    if (Number.isNaN(this.pullRequestNumber)) {
      this.errorHandler('Invalid Azure DevOps (TFS) pull request number');
    }
  }

  async hideAndCreateComment(): Promise<void> {
    this.errorHandler('Hiding comments is not supported by Azure DevOps (TFS)');
  }

  async callHideComment(): Promise<void> {
    this.errorHandler('Hiding comments is not supported by Azure DevOps (TFS)');
  }

  async callFindMatchingComments(
    tag: string
  ): Promise<AzureDevOpsTfsComment[]> {
    const resp = await axios.get<{
      value: {
        isDeleted: boolean;
        comments: {
          content: string;
          publishedDate: string;
          isDeleted: boolean;
          _links: {
            self: {
              href: string;
            };
          };
        }[];
      }[];
    }>(
      `${this.collectionUri}${this.teamProject}/_apis/git/repositories/${this.repositoryId}/pullRequests/${this.pullRequestNumber}/threads?api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${this.token}`,
        },
      }
    );

    // This plugin only creates comments at the top-level of threads,
    // so we can always just pull the first comment in the thread
    const topLevelComments: AzureDevOpsTfsComment[] = [];

    for (const thread of resp.data.value) {
      if (thread.isDeleted) {
        continue;
      }
      for (const comment of thread.comments) {
        if (comment.isDeleted) {
          continue;
        }
        topLevelComments.push(
          new AzureDevOpsTfsComment(
            comment._links.self.href, // eslint-disable-line no-underscore-dangle
            comment.content,
            comment.publishedDate
          )
        );
        break;
      }
    }

    const matchingComments = topLevelComments.filter((c) =>
      c.body.includes(tag)
    );

    return matchingComments;
  }

  async callCreateComment(body: string): Promise<AzureDevOpsTfsComment> {
    const resp = await axios.post<{
      comments: {
        content: string;
        publishedDate: string;
        _links: {
          self: {
            href: string;
          };
        };
      }[];
    }>(
      `${this.collectionUri}${this.teamProject}/_apis/git/repositories/${this.repositoryId}/pullRequests/${this.pullRequestNumber}/threads?api-version=6.0`,
      {
        comments: [
          {
            content: body,
            parentCommentId: 0,
            commentType: 1,
          },
        ],
        status: 4,
      },
      {
        headers: {
          Authorization: `Basic ${this.token}`,
        },
      }
    );

    if (resp.data.comments.length === 0) {
      // This error should never happen because we are creating the thread with a comment
      const err = 'Failed to create new thread: empty comment list';
      this.errorHandler(err);
      throw err;
    }

    const firstComment = resp.data.comments[0];

    return new AzureDevOpsTfsComment(
      firstComment._links.self.href, // eslint-disable-line no-underscore-dangle
      firstComment.content,
      firstComment.publishedDate
    );
  }

  async callUpdateComment(
    comment: AzureDevOpsTfsComment,
    body: string
  ): Promise<void> {
    await axios.patch(
      `${comment.selfHref}?api-version=6.0`,
      {
        content: body,
        parentCommentId: 0,
        commentType: 1,
      },
      {
        headers: {
          Authorization: `Basic ${this.token}`,
        },
      }
    );
  }

  async callDeleteComment(comment: AzureDevOpsTfsComment): Promise<void> {
    await axios.delete(`${comment.selfHref}?api-version=6.0`, {
      headers: {
        Authorization: `Basic ${this.token}`,
      },
    });
  }
}
