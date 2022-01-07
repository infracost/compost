import { TargetReference, TargetType } from '../types';
import { GitLabDetectResult } from '../platforms/gitlab';
import { BaseDetector } from './base';
import { DetectError } from '.';

export class GitLabCiDetector extends BaseDetector {
  detect(): GitLabDetectResult {
    this.logger.debug('Checking for GitLab CI');

    this.checkEnvVarValue('GITLAB_CI', 'true');
    const token = this.checkEnvVarExists('GITLAB_TOKEN', true);
    const project = this.checkEnvVarExists('CI_PROJECT_PATH');
    const serverUrl = process.env.CI_SERVER_URL;

    let targetType: TargetType;
    let targetRef: TargetReference;

    if (
      this.shouldDetectTargetType('pull-request') ||
      this.shouldDetectTargetType('merge-request')
    ) {
      if (process.env.CI_MERGE_REQUEST_IID) {
        targetType = 'merge-request';
        targetRef = Number.parseInt(process.env.CI_MERGE_REQUEST_IID, 10);
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `CI_MERGE_REQUEST_IID environment variable is not a valid number`
          );
        }
      }
    }

    if (!targetRef && this.shouldDetectTargetType('commit')) {
      targetType = 'commit';
      targetRef = this.checkEnvVarExists('CI_COMMIT_SHA');
    }

    if (!targetRef) {
      throw new DetectError('Could not detect target reference');
    }

    return {
      platform: 'gitlab',
      project,
      targetType,
      targetRef,
      token,
      serverUrl,
    };
  }
}
