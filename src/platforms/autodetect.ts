import { DetectError } from '../detect';
import { detectorRegistry } from '../detect/registry';
import {
  CommentHandler,
  TargetType,
  CommentHandlerOptions,
  DetectResult,
} from '../types';
import { AzureDevOps, AzureDevOpsDetectResult } from './azureDevOps';
import { BasePlatform } from './base';
import { GitHub, GitHubDetectResult } from './github';
import { GitLab, GitLabDetectResult } from './gitlab';

export class AutoDetect extends BasePlatform {
  protected handler: CommentHandler;

  constructor(targetTypes?: TargetType[], opts?: CommentHandlerOptions) {
    super(opts);

    const detectResult = this.detectEnvironment(targetTypes);
    if (!detectResult) {
      this.errorHandler('Unable to detect current environment');
      return;
    }

    const { platform, project, targetType, targetRef } = detectResult;

    let c: BasePlatform;

    switch (platform) {
      case 'github':
        c = new GitHub(
          project,
          targetType,
          targetRef,
          (detectResult as GitHubDetectResult).githubToken,
          (detectResult as GitHubDetectResult).githubApiUrl,
          opts
        );
        break;
      case 'gitlab':
        c = new GitLab(
          project,
          targetType,
          targetRef,
          (detectResult as GitLabDetectResult).gitlabToken,
          (detectResult as GitLabDetectResult).gitlabServerUrl,
          opts
        );
        break;
      case 'azure-devops':
        c = new AzureDevOps(
          project,
          targetType,
          targetRef,
          (detectResult as AzureDevOpsDetectResult).azureDevOpsToken,
          opts
        );
        break;
      default:
        this.errorHandler(`Unsupported platform: ${platform}`);
        return;
    }

    this.handler = c.getHandler();
  }

  getHandler(): CommentHandler {
    return this.handler;
  }

  // Detect the current environment
  // Checks all the detect functions and finds the first one that returns a result
  detectEnvironment(targetTypes?: TargetType[]): DetectResult | null {
    for (const config of detectorRegistry) {
      const detector = config.factory({
        targetTypes,
        logger: this.logger,
      });

      let result: DetectResult;

      try {
        result = detector.detect();
      } catch (err) {
        if (err.name === DetectError.name) {
          this.logger.debug(err.message);
          continue;
        }
        this.errorHandler(err);
      }

      if (result) {
        this.logger.info(`Detected ${config.displayName}
    Platform: ${result.platform}
    Project: ${result.project}
    Target type: ${result.targetType}
    Target ref: ${result.targetRef}\n`);
        return result;
      }
    }

    return null;
  }
}
