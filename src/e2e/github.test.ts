import GitHubCommand from '../cli/commands/github';
import {
  createPullRequest,
  createRepo,
  deleteRepoIfExists,
  getPullRequestComments,
} from './helpers/github';

describe('github pr', () => {
  jest.setTimeout(30_000);

  const origEnv = process.env;

  let token: string;
  let repo: string;
  let prNumber: number;
  let stdout: string;

  beforeAll(async () => {
    process.env = {};

    token = origEnv.COMPOST_E2E_GITHUB_TOKEN;
    repo = origEnv.COMPOST_E2E_GITHUB_REPO;

    if (!token) {
      throw new Error(
        `Expected COMPOST_E2E_GITHUB_TOKEN to be set in .env.e2e`
      );
    }

    if (!repo) {
      throw new Error(`Expected COMPOST_E2E_GITHUB_REPO to be set in .env.e2e`);
    }

    await deleteRepoIfExists(repo);
    await createRepo(repo);
    prNumber = await createPullRequest(repo);
  });

  afterAll(async () => {
    await deleteRepoIfExists(repo);

    process.env = origEnv;
  });

  beforeEach(() => {
    // Add any stdout to a variable
    jest.spyOn(process.stdout, 'write').mockImplementation((v) => {
      stdout += v; // eslint-disable-line @typescript-eslint/no-unused-vars
      return true;
    });
  });

  afterEach(jest.restoreAllMocks);

  test('example test', async () => {
    const args = [`${repo}`, 'pr', `${prNumber}`, `--github-token=${token}`];

    await GitHubCommand.run([...args, 'new', '--body=test 1']);
    await GitHubCommand.run([...args, 'new', '--body=test 2']);
    await GitHubCommand.run([...args, 'update', '--body=test 3']);

    const comments = await getPullRequestComments(repo, prNumber);

    expect(comments.length).toBe(2);
    expect(comments).toEqual([
      { body: 'test 1', isMinimized: false },
      { body: 'test 3', isMinimized: false },
    ]);
  });
});
