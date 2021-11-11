/* eslint-disable import/prefer-default-export */

import { PostCommentOptions, Integration, GitHubOptions } from './types';
import GitHubIntegration from './github';
import { defaultErrorHandler, NullLogger } from './util';

export function postComment(opts: PostCommentOptions): void {
  const logger = opts.logger || new NullLogger();
  const errorHandler = opts.errorHandler || defaultErrorHandler;

  let integration: Integration;

  if (
    opts.platform === 'github' ||
    (!opts.platform && GitHubIntegration.autoDetect())
  ) {
    logger.log('Detected GitHub');
    integration = new GitHubIntegration(
      opts.integrationOptions as GitHubOptions,
      logger,
      errorHandler
    );
  }

  if (!integration) {
    errorHandler(`Could not detect the current integration platform`);
  }

  integration.postComment(opts);
}
