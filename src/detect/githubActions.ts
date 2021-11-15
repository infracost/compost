import { TargetReference, TargetType } from '../types';
import { GitHubDetectResult } from '../platforms/github';
import { BaseDetector } from './base';
import { DetectError } from '.';

export class GitHubActionsDetector extends BaseDetector {
  detect(): GitHubDetectResult {
    this.logger.debug('Checking for GitHub Actions');

    this.checkEnvVarValue('GITHUB_ACTIONS', 'true');
    const token = this.checkEnvVarExists('GITHUB_TOKEN');
    const project = this.checkEnvVarExists('GITHUB_REPOSITORY');
    const apiUrl = process.env.GITHUB_API_URL;

    let targetType: TargetType;
    let targetRef: TargetReference;

    if (this.supportsTargetType('pr')) {
      if (process.env.GITHUB_PULL_REQUEST_NUMBER) {
        targetType = 'pr';
        targetRef = Number.parseInt(process.env.GITHUB_PULL_REQUEST_NUMBER, 10);
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `GITHUB_PULL_REQUEST_NUMBER environment variable is not a valid number`
          );
        }
      }
    }

    if (!targetRef && this.supportsTargetType('commit')) {
      targetType = 'commit';
      targetRef = this.checkEnvVarExists('GITHUB_COMMIT_SHA');
    }

    if (!targetRef) {
      return null;
    }

    return {
      platform: 'github',
      project,
      targetType,
      targetRef,
      opts: {
        token,
        apiUrl,
      },
    };
  }
}
