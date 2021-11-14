import { Logger } from '../util';
import { DetectResult } from '../types';
import { GitHubCommitHandler, GitHubPrHandler } from './github';
import { checkEnvVarExists, checkEnvVarValue } from '../cli/base';

export class AzureDevOpsGitHubPrHandler extends GitHubPrHandler {
  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) pull request');

    checkEnvVarExists('SYSTEM_COLLECTIONURI', logger);
    checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger);
    const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
    const prNumber = Number.parseInt(
      checkEnvVarExists('SYSTEM_PULLREQUEST_PULLREQUESTNUMBER', logger),
      10
    );

    if (Number.isNaN(prNumber)) {
      logger.debug(
        `SYSTEM_PULLREQUEST_PULLREQUESTNUMBER environment variable is not a valid number`
      );
      return null;
    }

    return {
      platform: 'azure-devops-github',
      project,
      targetType: 'pr',
      targetRef: prNumber,
    };
  }
}

export class AzureDevOpsGitHubCommitHandler extends GitHubCommitHandler {
  static detect(logger: Logger): DetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) commit');

    checkEnvVarExists('SYSTEM_COLLECTIONURI', logger);
    checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger);
    const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
    const commitSha = checkEnvVarExists(
      'SYSTEM_PULLREQUEST_SOURCECOMMITID',
      logger
    );

    return {
      platform: 'azure-devops-github',
      project,
      targetType: 'commit',
      targetRef: commitSha,
    };
  }
}
