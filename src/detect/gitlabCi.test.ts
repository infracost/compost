import { DetectError } from '.';
import { Logger, NullLogger } from '../util';
import { GitLabCiDetector } from './gitlabCi';

describe('GitLabCiDetector', () => {
  let logger: Logger;
  let detector: GitLabCiDetector;

  beforeEach(() => {
    logger = new NullLogger();
    detector = new GitLabCiDetector({ logger });
  });

  describe('detect', () => {
    const expectedResult = {
      platform: 'gitlab',
      project: 'infracost/compost-example',
      token: 'MY_TOKEN_VALUE',
      serverUrl: 'https://customgitlab.com/api',
    };

    const expectedPrResult = {
      ...expectedResult,
      targetType: 'merge-request',
      targetRef: 2,
    };

    const expectedCommitResult = {
      ...expectedResult,
      targetType: 'commit',
      targetRef: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    beforeEach(() => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_SERVER_URL = 'https://customgitlab.com/api';
      process.env.GITLAB_TOKEN = 'MY_TOKEN_VALUE';
      process.env.CI_PROJECT_PATH = 'infracost/compost-example';
      process.env.CI_MERGE_REQUEST_IID = '2';
      process.env.CI_COMMIT_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    });

    afterEach(() => {
      process.env = {};
    });

    it('does not detect if no env is set', () => {
      process.env = {};
      expect(() => detector.detect()).toThrow(DetectError);
    });

    it('does not log the $GITLAB_TOKEN value', () => {
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

    it('detects GitLab MR if $CI_MERGE_REQUEST_IID and $CI_COMMIT_SHA are set', () => {
      expect(detector.detect()).toEqual(expectedPrResult);
    });

    it('detects GitLab commit if targetType is set to commit', () => {
      detector = new GitLabCiDetector({ targetType: 'commit' });
      expect(detector.detect()).toEqual(expectedCommitResult);
    });

    it('detects GitLab commit if only $CI_COMMIT_SHA is set', () => {
      process.env.CI_MERGE_REQUEST_IID = undefined;
      expect(detector.detect()).toEqual(expectedCommitResult);
    });

    it('does not detect if neither $CI_MERGE_REQUEST_IID or $CI_COMMIT_SHA are set', () => {
      process.env.CI_MERGE_REQUEST_IID = undefined;
      process.env.CI_COMMIT_SHA = undefined;
      expect(() => detector.detect()).toThrow(DetectError);
    });

    ['GITLAB_CI', 'GITLAB_TOKEN', 'CI_PROJECT_PATH'].forEach((key) => {
      it(`does not detect GitLab if $${key} is missing`, () => {
        process.env[key] = undefined;
        expect(() => detector.detect()).toThrow(
          `${key} environment variable is not set`
        );
      });
    });
  });
});
