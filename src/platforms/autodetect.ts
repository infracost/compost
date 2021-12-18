import { DetectError } from '../detect';
import { detectorRegistry } from '../detect/registry';
import {
  TargetType,
  CommentHandlerOptions,
  DetectResult,
  Platform,
  PlatformName,
} from '../types';
import { Logger, NullLogger, defaultErrorHandler } from '../util';
import { AzureDevOps, AzureDevOpsDetectResult } from './azureDevOps';
import { GitHub, GitHubDetectResult } from './github';
import { GitLab, GitLabDetectResult } from './gitlab';

export type AutoDetectOptions = CommentHandlerOptions & {
  platform?: PlatformName;
  targetType?: TargetType;
};

export function autodetect(opts?: AutoDetectOptions): Platform | null | never {
  const logger = opts?.logger ?? new NullLogger();
  const errorHandler = opts?.errorHandler ?? defaultErrorHandler;

  let detectResult: DetectResult | null = null;

  try {
    detectResult = detectEnvironment(logger, opts?.platform, opts?.targetType);
  } catch (err) {
    errorHandler(err);
    return null;
  }

  if (!detectResult) {
    errorHandler('Unable to detect current environment');
    return null;
  }

  const { platform, project, targetType, targetRef } = detectResult;

  switch (platform) {
    case 'github':
      return new GitHub(
        project,
        targetType,
        targetRef,
        (detectResult as GitHubDetectResult).token,
        (detectResult as GitHubDetectResult).apiUrl,
        opts
      );
    case 'gitlab':
      return new GitLab(
        project,
        targetType,
        targetRef,
        (detectResult as GitLabDetectResult).token,
        (detectResult as GitLabDetectResult).serverUrl,
        opts
      );
    case 'azure-devops':
      return new AzureDevOps(
        project,
        targetType,
        targetRef,
        (detectResult as AzureDevOpsDetectResult).token,
        opts
      );
    default:
      errorHandler(`Unsupported platform: ${platform}`);
      return null;
  }
}

// Detect the current environment
// Checks all the detect functions and finds the first one that returns a result
function detectEnvironment(
  logger: Logger,
  platform?: PlatformName,
  targetType?: TargetType
): DetectResult | null {
  for (const config of detectorRegistry) {
    if (platform && !config.supportedPlatforms.includes(platform)) {
      continue;
    }

    const detector = config.factory({
      logger,
      targetType,
    });

    let result: DetectResult;

    try {
      result = detector.detect();
    } catch (err) {
      if (err.name === DetectError.name) {
        logger.debug(err.message);
        continue;
      }
      throw err;
    }

    if (result) {
      logger.info(`Detected ${config.displayName}
  Platform: ${result.platform}
  Project: ${result.project}
  Target type: ${result.targetType}
  Target ref: ${result.targetRef}\n`);
      return result;
    }
  }

  return null;
}
