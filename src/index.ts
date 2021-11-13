import { CommentHandler, CommentHandlerOptions } from './platforms';
import {
  AzureDevOpsTfsCommentHandler,
  AzureDevOpsTfsOptions,
} from './platforms/azureDevOpsTfs';
import { GitHubCommentHandler, GitHubOptions } from './platforms/github';
import { GitLabCommentHandler, GitLabOptions } from './platforms/gitlab';
import { defaultErrorHandler, ErrorHandler, Logger, NullLogger } from './util';

export type SupportedPlatforms = 'github' | 'gitlab' | 'azure-devops-tfs';

export type Behavior = 'update' | 'new' | 'hide_and_new' | 'delete_and_new';

export type Options =
  | CommentHandlerOptions
  | GitHubOptions
  | GitLabOptions
  | AzureDevOpsTfsOptions;

function commentHandlerFactory(
  platform: string,
  opts?: Options
): CommentHandler {
  switch (platform) {
    case 'github':
      return new GitHubCommentHandler(opts as GitHubOptions);
    case 'gitlab':
      return new GitLabCommentHandler(opts as GitLabOptions);
    case 'azure-devops-tfs':
      return new AzureDevOpsTfsCommentHandler(opts as AzureDevOpsTfsOptions);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export default class IntegrationComments {
  opts: Options;

  private logger: Logger;

  private errorHandler: ErrorHandler;

  constructor(opts?: Options) {
    this.opts = opts;
    this.logger = opts?.logger ?? new NullLogger();
    this.errorHandler = opts?.errorHandler ?? defaultErrorHandler;
  }

  detectPlatform(): SupportedPlatforms | void {
    if (GitHubCommentHandler.detect()) {
      this.logger.info('Detected GitHub');
      return 'github';
    }
    if (GitLabCommentHandler.detect()) {
      this.logger.info('Detected GitLab');
      return 'gitlab';
    }
    if (AzureDevOpsTfsCommentHandler.detect()) {
      this.logger.info('Detected Azure DevOps (TFS)');
      return 'azure-devops-tfs';
    }
    this.errorHandler('Unable to detect platform');
    return null;
  }

  async postComment(
    platform: SupportedPlatforms,
    behavior: Behavior,
    body: string
  ): Promise<void> {
    let handler: CommentHandler;
    try {
      handler = commentHandlerFactory(platform, this.opts);
    } catch (err) {
      this.errorHandler(err);
      return;
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
