import Compost from '.';

describe('Compost', () => {
  describe('detectEnvironment', () => {
    let compost: Compost;

    beforeEach(() => {
      compost = new Compost();
    });

    it('returns null if no environment is detected', () => {
      expect(compost.detectEnvironment()).toBeNull();
    });

    it('detects GitHub PR', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REPOSITORY = 'infracost/compost-e2e-tests-temp';
      process.env.GITHUB_PULL_REQUEST_NUMBER = '1';

      expect(compost.detectEnvironment()).toEqual({
        platform: 'github',
        project: 'infracost/compost-e2e-tests-temp',
        targetType: 'pr',
        targetRef: 1,
      });
    });
  });
});
