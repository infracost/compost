import * as fs from 'fs';
import { TargetReference, TargetType } from '../types';
import { GitHubDetectResult } from '../platforms/github';
import { BaseDetector } from './base';
import { DetectError } from '.';

export class GitHubActionsDetector extends BaseDetector {
  detect(): GitHubDetectResult {
    this.logger.debug('Checking for GitHub Actions');

    this.checkEnvVarValue('GITHUB_ACTIONS', 'true');
    const token = this.checkEnvVarExists('GITHUB_TOKEN', true);
    const project = this.checkEnvVarExists('GITHUB_REPOSITORY');
    const apiUrl = process.env.GITHUB_API_URL;

    let targetType: TargetType;
    let targetRef: TargetReference;

    const eventPath = process.env.GITHUB_EVENT_PATH;
    let event: { pull_request?: { number?: number; head?: { sha?: string } } };

    if (eventPath) {
      event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    }

    if (
      this.shouldDetectTargetType('pull-request') ||
      this.shouldDetectTargetType('merge-request')
    ) {
      targetRef = event?.pull_request?.number;
      if (targetRef) {
        targetType = 'pull-request';
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `GITHUB_EVENT_PATH pull_request.number is not a valid number`
          );
        }
      }
    }

    if (!targetRef && this.shouldDetectTargetType('commit')) {
      targetType = 'commit';

      // If the event is a pull request, use the head commit SHA
      // since GITHUB_SHA is the last merge commit on ref branch
      targetRef = event?.pull_request?.head?.sha;
      if (!targetRef) {
        targetRef = this.checkEnvVarExists('GITHUB_SHA');
      }
    }

    if (!targetRef) {
      throw new DetectError('Could not detect target reference');
    }

    return {
      platform: 'github',
      project,
      targetType,
      targetRef,
      token,
      apiUrl,
    };
  }
}
