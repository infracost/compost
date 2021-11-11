/* eslint-disable import/prefer-default-export */

import {
  ActionOptions,
  Integration,
  GitHubOptions,
  Logger,
  Action,
} from './types';
import GitHubIntegration from './github';
import { defaultErrorHandler, NullLogger } from './util';

function setupIntegration(opts: ActionOptions): Integration {
  const logger: Logger = opts.logger || new NullLogger();
  const errorHandler = opts.errorHandler || defaultErrorHandler;

  let integration: Integration;

  if (
    opts.platform === 'github' ||
    (!opts.platform && GitHubIntegration.autoDetect())
  ) {
    logger.info('Detected GitHub');
    integration = new GitHubIntegration(
      opts.integrationOptions as GitHubOptions,
      logger,
      errorHandler
    );
  }

  if (!integration) {
    errorHandler(`Could not detect the current integration platform`);
  }

  return integration;
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
  const integration = setupIntegration(opts);
  await integration.create(body, opts);
}

export async function upsertComment(
  body: string,
  opts: ActionOptions
): Promise<void> {
  const integration = setupIntegration(opts);
  await integration.upsert(body, opts);
}

export async function hideAndCreateComment(
  body: string,
  opts: ActionOptions
): Promise<void> {
  const integration = setupIntegration(opts);
  await integration.hideAndCreate(body, opts);
}

export function deleteAndCreateComment(
  body: string,
  opts: ActionOptions
): void {
  const integration = setupIntegration(opts);
  integration.deleteAndCreate(body, opts);
}
