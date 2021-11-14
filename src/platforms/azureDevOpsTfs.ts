import axios from 'axios';
import { Comment, CommentHandlerOptions } from '.';
import { DetectResult } from '..';
import { Logger } from '../util';
import BaseCommentHandler from './base';

export type AzureDevOpsTfsOptions = CommentHandlerOptions & {
  token: string;
  collectionUri: string;
  teamProject: string;
  repositoryId: string;
};

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

abstract class AzureDevOpsTfsHandler extends BaseCommentHandler<AzureDevOpsTfsComment> {
  protected token: string;

  protected collectionUri: string;

  protected teamProject: string;

  protected repositoryId: string;

  constructor(opts?: AzureDevOpsTfsOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);
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
    }
  }
}

export class AzureDevOpsTfsPrHandler extends AzureDevOpsTfsHandler {
  constructor(private prNumber: number, opts?: AzureDevOpsTfsOptions) {
    super(opts as AzureDevOpsTfsOptions);
  }

  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (TFS) pull request');

    if (!process.env.SYSTEM_COLLECTIONURI) {
      logger.debug('SYSTEM_COLLECTIONURI environment variable is not set');
      return null;
    }

    logger.debug(
      `SYSTEM_COLLECTIONURI environment variable is set to ${process.env.SYSTEM_COLLECTIONURI}`
    );

    if (!process.env.BUILD_REPOSITORY_PROVIDER) {
      logger.debug('BUILD_REPOSITORY_PROVIDER environment variable not set');
      return null;
    }

    if (process.env.BUILD_REPOSITORY_PROVIDER !== 'TfsGit') {
      logger.debug(
        `BUILD_REPOSITORY_PROVIDER environment variable is set to ${process.env.BUILD_REPOSITORY_PROVIDER}, not to TfsGit`
      );
      return null;
    }

    if (!process.env.BUILD_REASON) {
      logger.debug('BUILD_REASON environment variable not set');
      return null;
    }

    if (process.env.BUILD_REASON !== 'PullRequest') {
      logger.debug(
        `BUILD_REASON environment variable is set to ${process.env.BUILD_REASON}, not to PullRequest`
      );
      return null;
    }

    if (process.env.BUILD_REASON !== 'PullRequest') {
      logger.debug(
        'BUILD_REASON environment variable is not set to PullRequest'
      );
      return null;
    }

    if (!process.env.SYSTEM_PULLREQUEST_PULLREQUESTID) {
      logger.debug(
        'SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is not set'
      );
      return null;
    }

    logger.debug(
      `SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is set to ${process.env.SYSTEM_PULLREQUEST_PULLREQUESTID}`
    );

    const prNumber = Number(process.env.SYSTEM_PULLREQUEST_PULLREQUESTID);

    if (Number.isNaN(prNumber)) {
      logger.debug(
        `SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is not a valid number`
      );
      return null;
    }

    return {
      platform: 'azure-devops-tfs',
      targetType: 'pr',
      targetRef: prNumber,
    };
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
      `${this.collectionUri}${this.teamProject}/_apis/git/repositories/${this.repositoryId}/pullRequests/${this.prNumber}/threads?api-version=6.0`,
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
      `${this.collectionUri}${this.teamProject}/_apis/git/repositories/${this.repositoryId}/pullRequests/${this.prNumber}/threads?api-version=6.0`,
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

  callHideComment = this.unsupported(
    'Hiding comments is not supported by Azure DevOps (TFS)'
  );
}
