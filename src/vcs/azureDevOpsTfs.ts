import axios from 'axios';
import BaseCommentHandler, { Comment } from './base';
import { Logger } from '../util';
import { CommentHandlerOptions, DetectResult } from '../types';
import { checkEnvVarExists, checkEnvVarValue } from '../cli/base';

const patTokenLength = 52;

export type AzureDevOpsTfsOptions = CommentHandlerOptions & {
  token: string;
  serverUrl: string;
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

  protected serverUrl: string;

  protected org: string;

  protected teamProject: string;

  protected repo: string;

  constructor(protected project: string, opts?: AzureDevOpsTfsOptions) {
    super(opts as CommentHandlerOptions);
    this.processOpts(opts);

    const projectParts = project.split('/', 3);
    if (projectParts.length !== 3) {
      this.errorHandler(
        `Invalid Azure DevOps (TFS) repository name: ${project}, expecting org/teamProject/repo`
      );
      return;
    }

    [this.org, this.teamProject, this.repo] = projectParts;
  }

  processOpts(opts?: AzureDevOpsTfsOptions): void {
    this.token = opts?.token || process.env.SYSTEM_ACCESSTOKEN;
    if (!this.token) {
      this.errorHandler('SYSTEM_ACCESSTOKEN is required');
      return;
    }

    this.serverUrl = opts.serverUrl;

    if (!this.serverUrl) {
      let collectionUri = process.env.SYSTEM_COLLECTIONURI;
      if (collectionUri) {
        collectionUri = collectionUri.replace(/\/+$/, '');
        this.serverUrl = collectionUri.substring(
          0,
          collectionUri.lastIndexOf('/') + 1
        );
      }
    }

    this.serverUrl = this.serverUrl || 'https://dev.azure.com';
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

export class AzureDevOpsTfsPrHandler extends AzureDevOpsTfsHandler {
  constructor(
    project: string,
    private prNumber: number,
    opts?: AzureDevOpsTfsOptions
  ) {
    super(project, opts as AzureDevOpsTfsOptions);
  }

  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (TFS) pull request');

    const collectionUri = checkEnvVarExists('SYSTEM_COLLECTIONURI', logger);
    if (!collectionUri) {
      return null;
    }

    // The collection URI is in the format https://dev.azure.com/org/
    const org = collectionUri.replace(/\/+$/, '').split('/').at(-1);

    if (!checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'TfsGit', logger)) {
      return null;
    }

    const teamProject = checkEnvVarExists('SYSTEM_TEAMPROJECT', logger);
    if (!teamProject) {
      return null;
    }

    const repo = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
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
      vcs: 'azure-devops-tfs',
      project: `${org}/${teamProject}/${repo}`,
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
      `${this.serverUrl}/${this.org}/${this.teamProject}/_apis/git/repositories/${this.repo}/pullRequests/${this.prNumber}/threads?api-version=6.0`,
      {
        headers: this.authHeaders(),
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
      `${this.serverUrl}/${this.org}/${this.teamProject}/_apis/git/repositories/${this.repo}/pullRequests/${this.prNumber}/threads?api-version=6.0`,
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
        headers: this.authHeaders(),
      }
    );
  }

  async callDeleteComment(comment: AzureDevOpsTfsComment): Promise<void> {
    await axios.delete(`${comment.selfHref}?api-version=6.0`, {
      headers: this.authHeaders(),
    });
  }

  callHideComment = this.unsupported(
    'Hiding comments is not supported by Azure DevOps (TFS)'
  );
}
