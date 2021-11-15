import { Logger } from '../util';
import {
  GitHubCommitHandler,
  GitHubDetectResult,
  GitHubPrHandler,
} from './github';
import { checkEnvVarExists, checkEnvVarValue, DetectError } from '../cli/base';

export class AzureDevOpsGitHubPrHandler extends GitHubPrHandler {
  static detect(logger: Logger): GitHubDetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) pull request');

    try {
      checkEnvVarExists('SYSTEM_COLLECTIONURI', logger);
      checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger);
      const token = checkEnvVarExists('GITHUB_TOKEN', logger);
      const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
      const prNumberVal = checkEnvVarExists(
        'SYSTEM_PULLREQUEST_PULLREQUESTNUMBER',
        logger
      );

      const prNumber = parseInt(prNumberVal, 10);
      if (Number.isNaN(prNumber)) {
        throw new DetectError(
          `SYSTEM_PULLREQUEST_PULLREQUESTNUMBER environment variable is not a valid number`
        );
      }

      const apiUrl = process.env.GITHUB_API_URL;

      return {
        vcs: 'azure-devops-github',
        project,
        targetType: 'pr',
        targetRef: prNumber,
        opts: {
          token,
          apiUrl,
        },
      };
    } catch (err) {
      if (err.name !== DetectError.name) {
        throw err;
      }

      logger.debug(err);
      return null;
    }
  }
}

export class AzureDevOpsGitHubCommitHandler extends GitHubCommitHandler {
  static detect(logger: Logger): GitHubDetectResult | null {
    logger.debug('Checking for Azure DevOps (GitHub) commit');

    try {
      checkEnvVarExists('SYSTEM_COLLECTIONURI', logger);
      checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub', logger);
      const token = checkEnvVarExists('GITHUB_TOKEN', logger);
      const project = checkEnvVarExists('BUILD_REPOSITORY_NAME', logger);
      const commitSha = checkEnvVarExists(
        'SYSTEM_PULLREQUEST_SOURCECOMMITID',
        logger
      );

      const apiUrl = process.env.GITHUB_API_URL;

      return {
        vcs: 'azure-devops-github',
        project,
        targetType: 'commit',
        targetRef: commitSha,
        opts: {
          token,
          apiUrl,
        },
      };
    } catch (err) {
      if (err.name !== DetectError.name) {
        throw err;
      }

      logger.debug(err);
      return null;
    }
  }
}
