/* eslint-disable import/prefer-default-export */

import { TargetReference, TargetType } from '../types';
import { GitLabDetectResult } from '../platforms/gitlab';
import { BaseDetector, DetectError } from './base';

export class GitLabCiDetector extends BaseDetector {
  detect(): GitLabDetectResult {
    this.logger.debug('Checking for GitLab CI');

    this.checkEnvVarValue('GITLAB_CI', 'true');
    const token = this.checkEnvVarExists('GITLAB_TOKEN');
    const project = this.checkEnvVarExists('CI_PROJECT_PATH');
    const serverUrl = process.env.CI_SERVER_URL;

    let targetType: TargetType;
    let targetRef: TargetReference;

    if (this.supportsTargetType('mr') || this.supportsTargetType('pr')) {
      if (process.env.CI_MERGE_REQUEST_IID) {
        targetType = 'mr';
        targetRef = Number.parseInt(process.env.CI_MERGE_REQUEST_IID, 10);
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `CI_MERGE_REQUEST_IID environment variable is not a valid number`
          );
        }
      }
    }

    if (!targetRef) {
      return null;
    }

    return {
      platform: 'gitlab',
      project,
      targetType,
      targetRef,
      opts: {
        token,
        serverUrl,
      },
    };
  }
}
