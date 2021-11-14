import { CommentHandlerOptions, CommentHandler } from './platforms';
import {
  AzureDevOpsTfsOptions,
  AzureDevOpsTfsPrHandler,
} from './platforms/azureDevOpsTfs';
import {
  GitHubOptions,
  GitHubPrHandler,
  GitHubCommitHandler,
} from './platforms/github';
import { GitLabOptions, GitLabMrHandler } from './platforms/gitlab';
import { defaultErrorHandler, ErrorHandler, Logger, NullLogger } from './util';

export type Platform = 'github' | 'gitlab' | 'azure-devops-tfs';

export type TargetType = 'pr' | 'mr' | 'commit';

export type TargetReference = string | number;

export type Behavior = 'update' | 'new' | 'hide_and_new' | 'delete_and_new';

export type DetectResult = {
  platform: Platform;
  targetType: TargetType;
  targetRef: TargetReference;
};

export type Options =
  | CommentHandlerOptions
  | GitHubOptions
  | GitLabOptions
  | AzureDevOpsTfsOptions;

function commentHandlerFactory(
  platform: Platform,
  targetType: TargetType,
  targetRef: TargetReference,
  opts?: Options
): CommentHandler | null {
  if (targetType === 'pr' || targetType === 'mr') {
    switch (platform) {
      case 'github':
        return new GitHubPrHandler(targetRef as number, opts as GitHubOptions);
      case 'gitlab':
        return new GitLabMrHandler(targetRef as number, opts as GitLabOptions);
      case 'azure-devops-tfs':
        return new AzureDevOpsTfsPrHandler(
          targetRef as number,
          opts as AzureDevOpsTfsOptions
        );
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } else if (targetType === 'commit') {
    switch (platform) {
      case 'github':
        return new GitHubCommitHandler(
          targetRef as string,
          opts as GitHubOptions
        );
      default:
        throw new Error(
          `Unsupported target type ${targetType} for platform ${platform}`
        );
    }
  }

  return null;
}

export default class Compost {
  opts: Options;

  private logger: Logger;

  private errorHandler: ErrorHandler;

  constructor(opts?: Options) {
    this.opts = opts;
    this.logger = opts?.logger ?? new NullLogger();
    this.errorHandler = opts?.errorHandler ?? defaultErrorHandler;
  }

  private getCommentHandler(
    platform: Platform,
    targetType: TargetType,
    targetRef: TargetReference
  ): CommentHandler | null {
    let handler: CommentHandler;
    try {
      handler = commentHandlerFactory(
        platform,
        targetType,
        targetRef,
        this.opts
      );
    } catch (err) {
      this.errorHandler(err);
      return null;
    }

    return handler;
  }

  detectEnvironment(): DetectResult | null {
    const commentHandlerConfigs = [
      { handler: GitHubPrHandler, displayName: 'GitHub pull request' },
      { handler: GitHubCommitHandler, displayName: 'GitHub comment' },
      { handler: GitLabMrHandler, displayName: 'GitLab merge request' },
      {
        handler: AzureDevOpsTfsPrHandler,
        displayName: 'Azure DevOps (TFS) pull request',
      },
    ];

    for (const config of commentHandlerConfigs) {
      const platform = config.handler.detect(this.logger);
      if (platform) {
        this.logger.info(`Detected ${config.displayName}`);
        return platform;
      }
    }

    return null;
  }

  async postComment(
    platform: Platform,
    targetType: TargetType,
    targetRef: TargetReference,
    behavior: Behavior,
    body: string
  ): Promise<void> {
    const handler = this.getCommentHandler(platform, targetType, targetRef);

    if (handler === null) {
      this.errorHandler(
        `Unable to find comment handler for platform ${platform}, target type ${targetType}`
      );
    }

    switch (behavior) {
      case 'update':
        await handler.updateComment(body);
        break;
      case 'new':
        await handler.newComment(body);
        break;
      case 'hide_and_new':
        await handler.hideAndNewComment(body);
        break;
      case 'delete_and_new':
        await handler.deleteAndNewComment(body);
        break;
      default:
        // This should never happen
        throw new Error(`Unknown behavior: ${behavior}`);
    }
  }
}
