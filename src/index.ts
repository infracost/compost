import { PostCommentOptions, Integration } from './types';
import GitHubIntegration from './github';
import { defaultErrorHandler, NullLogger } from './util';

export function getDetectedIntegrations(
  integrations: Integration[],
  opts: PostCommentOptions
): Integration[] {
  return integrations.filter(
    (i) => opts.platform === i.name || (!opts.platform && i.isDetected())
  );
}

export function postComment(opts: PostCommentOptions): void {
  const logger = opts.logger || new NullLogger();
  const errorHandler = opts.errorHandler || defaultErrorHandler;

  const integrations: Integration[] = [
    new GitHubIntegration(logger, errorHandler),
  ];

  const detectedIntegrations = getDetectedIntegrations(integrations, opts);

  if (detectedIntegrations.length === 0) {
    errorHandler(`No integrations found`);
  }

  for (const integration of detectedIntegrations) {
    integration.processEnv(opts);
  }

  for (const integration of detectedIntegrations) {
    integration.postComment(opts);
  }
}
