import axios from 'axios';
import {
  CommentHandlerOptions,
  Comment,
  DetectResult,
  TargetReference,
  TargetType,
} from '../types';
import { BaseCommentHandler, BasePlatform } from './base';

const patTokenLength = 52;

export type AzureDevOpsDetectResult = DetectResult & {
  token: string;
};

class AzureDevOpsComment implements Comment {
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

export class AzureDevOps extends BasePlatform {
  private handler: AzureDevOpsHandler;

  constructor(
    project: string,
    targetType: TargetType,
    targetRef: TargetReference,
    token?: string,
    opts?: CommentHandlerOptions
  ) {
    super(opts);

    if (targetType === 'commit') {
      this.errorHandler(`Commit target type is not supported by Azure DevOps`);
    } else {
      this.handler = new AzureDevOpsPrHandler(
        project,
        targetRef as number,
        token,
        opts
      );
    }
  }

  getHandler(): AzureDevOpsHandler {
    return this.handler;
  }
}

abstract class AzureDevOpsHandler extends BaseCommentHandler<AzureDevOpsComment> {
  protected repoUrl: string;

  protected repoApiUrl: string;

  constructor(
    protected project: string,
    protected token?: string,
    opts?: CommentHandlerOptions
  ) {
    super(opts);

    this.token ||= process.env.AZURE_DEVOPS_EXT_PAT;
    if (!this.token) {
      this.errorHandler(
        'Azure DevOps token was not specified or could not be detected'
      );
    }

    try {
      this.repoApiUrl = AzureDevOpsHandler.parseRepoApiUrl(project);
    } catch (err) {
      this.errorHandler(err.message);
    }
  }

  // Convert the Azure DevOps repo URL to an API URL
  static parseRepoApiUrl(repoUrl: string): string {
    const parts = repoUrl.split('_git/');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid repo URL format ${repoUrl}. Expected https://dev.azure.com/org/project/_git/repo/.`
      );
    }

    let url = `${parts[0]}_apis/git/repositories/${parts[1]}`;
    if (!url.endsWith('/')) {
      url += '/';
    }

    return url;
  }

  protected authHeaders() {
    let val = `Bearer ${this.token}`;

    const isPat = this.token.length === patTokenLength;
    if (isPat) {
      val = `Basic ${Buffer.from(`:${this.token}`).toString('base64')}`;
    }

    return {
      Authorization: val,
    };
  }
}

export class AzureDevOpsPrHandler extends AzureDevOpsHandler {
  constructor(
    project: string,
    private prNumber: number,
    token?: string,
    opts?: CommentHandlerOptions
  ) {
    super(project, token, opts);
  }

  async callFindMatchingComments(tag: string): Promise<AzureDevOpsComment[]> {
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
      `${this.repoApiUrl}pullRequests/${this.prNumber}/threads?api-version=6.0`,
      {
        headers: this.authHeaders(),
      }
    );

    // This plugin only creates comments at the top-level of threads,
    // so we can always just pull the first comment in the thread
    const topLevelComments: AzureDevOpsComment[] = [];

    for (const thread of resp.data.value) {
      if (thread.isDeleted) {
        continue;
      }
      for (const comment of thread.comments) {
        if (comment.isDeleted) {
          continue;
        }
        topLevelComments.push(
          new AzureDevOpsComment(
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

  async callCreateComment(body: string): Promise<AzureDevOpsComment> {
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
      `${this.repoApiUrl}pullRequests/${this.prNumber}/threads?api-version=6.0`,
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
        headers: this.authHeaders(),
      }
    );

    if (resp.data.comments.length === 0) {
      // This error should never happen because we are creating the thread with a comment
      const err = 'Failed to create new thread: empty comment list';
      this.errorHandler(err);
      throw err;
    }

    const firstComment = resp.data.comments[0];

    return new AzureDevOpsComment(
      firstComment._links.self.href, // eslint-disable-line no-underscore-dangle
      firstComment.content,
      firstComment.publishedDate
    );
  }

  async callUpdateComment(
    comment: AzureDevOpsComment,
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
        headers: this.authHeaders(),
      }
    );
  }

  async callDeleteComment(comment: AzureDevOpsComment): Promise<void> {
    await axios.delete(`${comment.selfHref}?api-version=6.0`, {
      headers: this.authHeaders(),
    });
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
