/* eslint-disable import/prefer-default-export */

import { TargetReference, TargetType } from '../types';
import { AzureDevOpsDetectResult } from '../platforms/azureDevOps';
import { GitHubDetectResult } from '../platforms/github';
import { BaseDetector, DetectError } from './base';

export class AzureDevOpsPipelinesDetector extends BaseDetector {
  detect(): AzureDevOpsDetectResult | GitHubDetectResult {
    this.logger.debug('Checking for GitHub Actions');

    this.checkEnvVarValue('GITHUB_ACTIONS', 'true');
    const token = this.checkEnvVarExists('GITHUB_TOKEN');
    const apiUrl = this.checkEnvVarExists('GITHUB_API_URL');
    const project = this.checkEnvVarExists('GITHUB_REPOSITORY');

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

  detectAzureDevOps(): AzureDevOpsDetectResult {
    this.logger.debug('Checking for Azure DevOps Pipelines');

    this.checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'TfsGit');
    const token = this.checkEnvVarExists(process.env.SYSTEM_ACCESSTOKEN);
    const repo = this.checkEnvVarExists('BUILD_REPOSITORY_URI');

    let targetType: TargetType;
    let targetRef: TargetReference;

    if (this.supportsTargetType('pr')) {
      if (process.env.SYSTEM_PULLREQUEST_PULLREQUESTID) {
        targetType = 'pr';
        targetRef = Number.parseInt(
          process.env.SYSTEM_PULLREQUEST_PULLREQUESTID,
          10
        );
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is not a valid number`
          );
        }
      }
    }

    if (!targetRef) {
      return null;
    }

    return {
      platform: 'azure-devops',
      project: repo,
      targetType,
      targetRef,
      opts: {
        token,
      },
    };
  }

  detectGitHub(): GitHubDetectResult {
    this.logger.debug('Checking for Azure DevOps Pipelines (GitHub)');

    this.checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub');
    const token = this.checkEnvVarExists('GITHUB_TOKEN');
    const repo = this.checkEnvVarExists('BUILD_REPOSITORY_NAME');
    const apiUrl = process.env.GITHUB_API_URL;

    let targetType: TargetType;
    let targetRef: TargetReference;

    if (this.supportsTargetType('pr')) {
      if (process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER) {
        targetType = 'pr';
        targetRef = Number.parseInt(
          process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER,
          10
        );
        if (Number.isNaN(targetRef)) {
          throw new DetectError(
            `SYSTEM_PULLREQUEST_PULLREQUESTNUMBER environment variable is not a valid number`
          );
        }
      }
    }

    if (!targetRef) {
      return null;
    }

    return {
      platform: 'azure-devops',
      project: repo,
      targetType,
      targetRef,
      opts: {
        token,
        apiUrl,
      },
    };
  }
}
