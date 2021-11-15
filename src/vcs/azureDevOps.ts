import axios from 'axios';
import BaseCommentHandler, { Comment } from './base';
import { Logger } from '../util';
import { CommentHandlerOptions, DetectResult } from '../types';
import { checkEnvVarExists, checkEnvVarValue } from '../cli/base';

const patTokenLength = 52;

export type AzureDevOpsOptions = CommentHandlerOptions & {
  token: string;
};

export type AzureDevOpsDetectResult = DetectResult & {
  opts: AzureDevOpsOptions;
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

abstract class AzureDevOpsHandler extends BaseCommentHandler<AzureDevOpsComment> {
  protected token: string;

  protected repoUrl: string;

  protected repoApiUrl: string;

  constructor(protected project: string, opts?: AzureDevOpsOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);

    try {
      this.repoApiUrl = AzureDevOpsHandler.parseRepoApiUrl(project);
    } catch (err) {
      this.errorHandler(err.message);
    }
  }

  processOpts(opts?: AzureDevOpsOptions): void {
    this.token = opts?.token || process.env.AZURE_DEVOPS_EXT_PAT;
    if (!this.token) {
      this.errorHandler(
        '--azure-devops-token or AZURE_DEVOPS_EXT_PAT environment variable is required'
      );
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
    opts?: AzureDevOpsOptions
  ) {
    super(project, opts as AzureDevOpsOptions);
  }

  static detect(logger: Logger): AzureDevOpsDetectResult | null {
    logger.debug('Checking for Azure DevOps pull request');

    const token = checkEnvVarExists(process.env.SYSTEM_ACCESSTOKEN, logger);
    if (!token) {
      return null;
    }

    if (!checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'TfsGit', logger)) {
      return null;
    }

    const repo = checkEnvVarExists('BUILD_REPOSITORY_URI', logger);
    if (!repo) {
      return null;
    }

    const prNumberVal = checkEnvVarExists(
      'SYSTEM_PULLREQUEST_PULLREQUESTID',
      logger
    );
    if (!prNumberVal) {
      return null;
    }

    const prNumber = Number.parseInt(prNumberVal, 10);
    if (Number.isNaN(prNumber)) {
      logger.debug(
        `SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is not a valid number`
      );
      return null;
    }

    return {
      vcs: 'azure-devops',
      project: repo,
      targetType: 'pr',
      targetRef: prNumber,
      opts: {
        token: process.env.AZURE_DEVOPS_EXT_PAT,
      },
    };
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

  callHideComment = this.unsupported(
    'Hiding comments is not supported by Azure DevOps'
  );
}
