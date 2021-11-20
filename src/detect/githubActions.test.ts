import * as path from 'path';
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
    const expectedResult = {
      platform: 'github',
      project: 'infracost/compost-example',
      opts: {
        token: 'MY_TOKEN_VALUE',
        apiUrl: 'https://api.customgithub.com',
      },
    };

    const expectedPrResult = {
      ...expectedResult,
      targetType: 'pr',
      targetRef: 2,
    };

    const expectedPrCommitResult = {
      ...expectedResult,
      targetType: 'commit',
      targetRef: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
    };

    const expectedNonPrCommitResult = {
      ...expectedResult,
      targetType: 'commit',
      targetRef: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_API_URL = 'https://api.customgithub.com';
      process.env.GITHUB_TOKEN = 'MY_TOKEN_VALUE';
      process.env.GITHUB_REPOSITORY = 'infracost/compost-example';
      process.env.GITHUB_EVENT_PATH = path.join(
        __dirname,
        'testdata',
        'pull_request_event.json'
      );
      process.env.GITHUB_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
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
      expect(logs).not.toContain('MY_TOKEN_VALUE');
    });

    it('detects GitHub PR if $GITHUB_EVENT_PATH pull_request.number and $GITHUB_SHA are set', () => {
      expect(detector.detect()).toEqual(expectedPrResult);
    });

    it('detects GitHub PR commit if targetTypes is set to commit', () => {
      detector = new GitHubActionsDetector({ targetTypes: ['commit'] });
      expect(detector.detect()).toEqual(expectedPrCommitResult);
    });

    it('detects GitHub commit if only $GITHUB_SHA is set', () => {
      process.env.GITHUB_EVENT_PATH = undefined;
      expect(detector.detect()).toEqual(expectedNonPrCommitResult);
    });

    it('does not detect if neither $GITHUB_EVENT_PATH or $GITHUB_SHA are set', () => {
      process.env.GITHUB_EVENT_PATH = undefined;
      process.env.GITHUB_SHA = undefined;
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
