import { Logger } from '../util';
import { DetectResult } from '../types';
import { GitHubCommitHandler, GitHubPrHandler } from './github';
import { checkEnvVarExists, checkEnvVarValue } from '../cli/base';

export class AzureDevOpsGitHubPrHandler extends GitHubPrHandler {
  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) pull request');

    if (!checkEnvVarExists('SYSTEM_COLLECTIONURI', logger)) {
      return null;
    }

    if (!checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger)) {
      return null;
    }

    const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
    if (!project) {
      return null;
    }

    const prNumberVal = checkEnvVarExists(
      'SYSTEM_PULLREQUEST_PULLREQUESTNUMBER',
      logger
    );
    if (!prNumberVal) {
      return null;
    }

    const prNumber = parseInt(prNumberVal, 10);
    if (Number.isNaN(prNumber)) {
      logger.debug(
        `SYSTEM_PULLREQUEST_PULLREQUESTNUMBER environment variable is not a valid number`
      );
      return null;
    }

    return {
      vcs: 'azure-devops-github',
      project,
      targetType: 'pr',
      targetRef: prNumber,
    };
  }
}

export class AzureDevOpsGitHubCommitHandler extends GitHubCommitHandler {
  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) commit');

    if (!checkEnvVarExists('SYSTEM_COLLECTIONURI', logger)) {
      return null;
    }

    if (!checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger)) {
      return null;
    }

    const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
    if (!project) {
      return null;
    }

    const commitSha = checkEnvVarExists(
      'SYSTEM_PULLREQUEST_SOURCECOMMITID',
      logger
    );
    if (!commitSha) {
      return null;
    }

    return {
      vcs: 'azure-devops-github',
      project,
      targetType: 'commit',
      targetRef: commitSha,
    };
  }
}
