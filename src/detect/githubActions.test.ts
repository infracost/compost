import { DetectError } from '.';
import { Logger, NullLogger } from '../util';
import { GitHubActionsDetector } from './githubActions';

describe('GitHubActionsDetector', () => {
  let logger: Logger;
  let detector: GitHubActionsDetector;

  beforeEach(() => {
    logger = new NullLogger();
    detector = new GitHubActionsDetector({ logger });
  });

  describe('detect', () => {
    const expectedPrResult = {
      platform: 'github',
      project: 'infracost/compost-example',
      targetType: 'pr',
      targetRef: 4,
      opts: {
        token: 'MY_TOKEN_VALUE',
        apiUrl: 'https://api.customgithub.com',
      },
    };

    const expectedCommitResult = {
      platform: 'github',
      project: 'infracost/compost-example',
      targetType: 'commit',
      targetRef: 'aaaaaaa',
      opts: {
        token: 'MY_TOKEN_VALUE',
        apiUrl: 'https://api.customgithub.com',
      },
    };

    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_API_URL = 'https://api.customgithub.com';
      process.env.GITHUB_TOKEN = 'MY_TOKEN_VALUE';
      process.env.GITHUB_REPOSITORY = 'infracost/compost-example';
      process.env.GITHUB_PULL_REQUEST_NUMBER = '4';
      process.env.GITHUB_COMMIT_SHA = 'aaaaaaa';
    });

    afterEach(() => {
      process.env = {};
    });

    it('does not detect if no env is set', () => {
      process.env = {};
      expect(() => detector.detect()).toThrow(DetectError);
    });

    it('does not log the $GITHUB_TOKEN value', () => {
      process.env.GITHUB_PULL_REQUEST_NUMBER = '4';

      let logs = '';

      const appendToLogs = (m: string) => {
        logs += `${m  }\n`;
      };
      jest.spyOn(logger, 'debug').mockImplementation(appendToLogs);
      jest.spyOn(logger, 'info').mockImplementation(appendToLogs);
      jest.spyOn(logger, 'warn').mockImplementation(appendToLogs);

      detector.detect();
      expect(logs).not.toContain('MY_TOKEN_VALUE');
    });

    it('detects GitHub PR if $GITHUB_PULL_REQUEST_NUMBER and $GITHUB_COMMIT_SHA are set', () => {
      process.env.GITHUB_PULL_REQUEST_NUMBER = '4';
      expect(detector.detect()).toEqual(expectedPrResult);
    });

    it('detects GitHub commit if targetTypes is set to commit', () => {
      detector = new GitHubActionsDetector({ targetTypes: ['commit'] });
      expect(detector.detect()).toEqual(expectedCommitResult);
    });

    it('detects GitHub commit if only $GITHUB_COMMIT_SHA is set', () => {
      process.env.GITHUB_PULL_REQUEST_NUMBER = undefined;
      expect(detector.detect()).toEqual(expectedCommitResult);
    });

    it('does not detect if $GITHUB_PULL_REQUEST_NUMBER is not a number', () => {
      process.env.GITHUB_PULL_REQUEST_NUMBER = 'a';
      expect(() => detector.detect()).toThrow(
        'GITHUB_PULL_REQUEST_NUMBER environment variable is not a valid number'
      );
    });

    it('does not detect if neither $GITHUB_PULL_REQUEST_NUMBER or $GITHUB_COMMIT_SHA are set', () => {
      process.env.GITHUB_PULL_REQUEST_NUMBER = undefined;
      process.env.GITHUB_COMMIT_SHA = undefined;
      expect(() => detector.detect()).toThrow(DetectError);
    });

    ['GITHUB_ACTIONS', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY'].forEach((key) => {
      it(`does not detect GitHub PR if $${key} is missing`, () => {
        process.env[key] = undefined;
        expect(() => detector.detect()).toThrow(
          `${key} environment variable is not set`
        );
      });
    });
  });
});
