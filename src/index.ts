/* eslint-disable import/prefer-default-export */

import {
  ActionOptions,
  GitHubOptions,
  Logger,
  Action,
  GitLabOptions,
  CommentHandler,
  AzureDevOpsTfsOptions,
} from './types';
import GitHubCommentHandler from './github';
import { defaultErrorHandler, NullLogger } from './util';
import GitLabCommentHandler from './gitlab';
import AzureDevOpsTfsCommentHandler from './azureDevOpsTfs';

function createCommentHandler(opts: ActionOptions): CommentHandler {
  const logger: Logger = opts.logger || new NullLogger();
  const errorHandler = opts.errorHandler || defaultErrorHandler;

  let commentHandler: CommentHandler;

  if (
    opts.platform === 'github' ||
    (!opts.platform && GitHubCommentHandler.autoDetect())
  ) {
    logger.info('Detected GitHub');
    commentHandler = new GitHubCommentHandler(
      opts.platformOptions as GitHubOptions,
      logger,
      errorHandler
    );
  } else if (
    opts.platform === 'gitlab' ||
    (!opts.platform && GitLabCommentHandler.autoDetect())
  ) {
    logger.info('Detected GitLab');
    commentHandler = new GitLabCommentHandler(
      opts.platformOptions as GitLabOptions,
      logger,
      errorHandler
    );
  } else if (
    opts.platform === 'azure-devops-tfs' ||
    (!opts.platform && AzureDevOpsTfsCommentHandler.autoDetect())
  ) {
    logger.info('Detected Azure DevOps (TFS)');
    commentHandler = new AzureDevOpsTfsCommentHandler(
      opts.platformOptions as AzureDevOpsTfsOptions,
      logger,
      errorHandler
    );
  }

  if (!commentHandler) {
    errorHandler(`Could not detect the current platform`);
  }

  return commentHandler;
}

export async function postComment(
  action: Action,
  body: string,
  opts: ActionOptions
): Promise<void> {
  switch (action) {
    case 'create':
      await createComment(body, opts);
      break;
    case 'upsert':
      await upsertComment(body, opts);
      break;
    case 'hideAndCreate':
      await hideAndCreateComment(body, opts);
      break;
    case 'deleteAndCreate':
      await deleteAndCreateComment(body, opts);
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export async function createComment(
  body: string,
  opts: ActionOptions
): Promise<void> {
  const integration = createCommentHandler(opts);
  await integration.createComment(body, opts);
}

export async function upsertComment(
  body: string,
  opts: ActionOptions
): Promise<void> {
  const integration = createCommentHandler(opts);
  await integration.upsertComment(body, opts);
}

export async function hideAndCreateComment(
  body: string,
  opts: ActionOptions
): Promise<void> {
  const integration = createCommentHandler(opts);
  await integration.hideAndCreateComment(body, opts);
}

export function deleteAndCreateComment(
  body: string,
  opts: ActionOptions
): void {
  const integration = createCommentHandler(opts);
  integration.deleteAndCreateComment(body, opts);
}
