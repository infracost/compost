import { DetectError } from '.';
import { Logger, NullLogger } from '../util';
import { AzureDevOpsPipelinesDetector } from './azureDevOpsPipelines';

describe('AzureDevOpsPipelinesDetector', () => {
  let logger: Logger;
  let detector: AzureDevOpsPipelinesDetector;

  it('does not detect if BUILD_REPOSITORY_PROVIDER is not TfsGit or Github', () => {
    process.env.BUILD_REPOSITORY_PROVIDER = 'other';
    expect(() => detector.detect()).toThrow(DetectError);
  });

  beforeEach(() => {
    logger = new NullLogger();
    detector = new AzureDevOpsPipelinesDetector({ logger });
  });

  describe('detect', () => {
    describe('Azure DevOps', () => {
      const expectedResult = {
        platform: 'azure-devops',
        project:
          'https://dev.azure.com/infracost/base/_git/infracost/compost-example',
        token: 'MY_AZURE_DEVOPS_TOKEN_VALUE',
      };

      const expectedPrResult = {
        ...expectedResult,
        targetType: 'pull-request',
        targetRef: 2,
      };

      beforeEach(() => {
        process.env.BUILD_REPOSITORY_PROVIDER = 'TfsGit';
        process.env.SYSTEM_ACCESSTOKEN = 'MY_AZURE_DEVOPS_TOKEN_VALUE';
        process.env.BUILD_REPOSITORY_URI =
          'https://dev.azure.com/infracost/base/_git/infracost/compost-example';
        process.env.SYSTEM_PULLREQUEST_PULLREQUESTID = '2';
      });

      afterEach(() => {
        process.env = {};
      });

      it('does not detect if no env is set', () => {
        process.env = {};
        expect(() => detector.detect()).toThrow(DetectError);
      });

      it('does not log the $SYSTEM_ACCESSTOKEN value', () => {
        let logs = '';

        const appendToLogs = (m: string) => {
          logs += `${m}\n`;
        };
        jest.spyOn(logger, 'debug').mockImplementation(appendToLogs);
        jest.spyOn(logger, 'info').mockImplementation(appendToLogs);
        jest.spyOn(logger, 'warn').mockImplementation(appendToLogs);

        detector.detect();
        expect(logs).not.toContain('MY_AZURE_DEVOPS_TOKEN_VALUE');
      });

      it('detects Azure DevOps PR if $SYSTEM_PULLREQUEST_PULLREQUESTID is set', () => {
        expect(detector.detect()).toEqual(expectedPrResult);
      });

      it('does not detect Azure DevOps PR if targetType is set to commit', () => {
        detector = new AzureDevOpsPipelinesDetector({ targetType: 'commit' });
        expect(() => detector.detect()).toThrow(DetectError);
      });

      [
        'BUILD_REPOSITORY_PROVIDER',
        'SYSTEM_ACCESSTOKEN',
        'BUILD_REPOSITORY_URI',
      ].forEach((key) => {
        it(`does not detect Azure DevOps if $${key} is missing`, () => {
          process.env[key] = undefined;
          expect(() => detector.detect()).toThrow(
            `${key} environment variable is not set`
          );
        });
      });
    });

    describe('GitHub', () => {
      const expectedResult = {
        platform: 'github',
        project: 'infracost/compost-example',
        token: 'MY_GITHUB_TOKEN_VALUE',
      };

      const expectedPrResult = {
        ...expectedResult,
        targetType: 'pull-request',
        targetRef: 2,
      };

      beforeEach(() => {
        process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub';
        process.env.GITHUB_TOKEN = 'MY_GITHUB_TOKEN_VALUE';
        process.env.BUILD_REPOSITORY_NAME = 'infracost/compost-example';
        process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER = '2';
      });

      afterEach(() => {
        process.env = {};
      });

      it('does not detect if no env is set', () => {
        process.env = {};
        expect(() => detector.detect()).toThrow(DetectError);
      });

      it('does not log the $GITHUB_TOKEN value', () => {
        let logs = '';

        const appendToLogs = (m: string) => {
          logs += `${m}\n`;
        };
        jest.spyOn(logger, 'debug').mockImplementation(appendToLogs);
        jest.spyOn(logger, 'info').mockImplementation(appendToLogs);
        jest.spyOn(logger, 'warn').mockImplementation(appendToLogs);

        detector.detect();
        expect(logs).not.toContain('MY_GITHUB_TOKEN_VALUE');
      });

      it('detects GitHub PR if $SYSTEM_PULLREQUEST_PULLREQUESTNUMBER is set', () => {
        expect(detector.detect()).toEqual(expectedPrResult);
      });

      it('does not detect Github PR if targetType is set to commit', () => {
        detector = new AzureDevOpsPipelinesDetector({ targetType: 'commit' });
        expect(() => detector.detect()).toThrow(DetectError);
      });

      [
        'BUILD_REPOSITORY_PROVIDER',
        'GITHUB_TOKEN',
        'BUILD_REPOSITORY_NAME',
      ].forEach((key) => {
        it(`does not detect Github if $${key} is missing`, () => {
          process.env[key] = undefined;
          expect(() => detector.detect()).toThrow(
            `${key} environment variable is not set`
          );
        });
      });
    });
  });
});
