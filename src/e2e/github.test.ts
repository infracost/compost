import GitHubCommand from '../cli/commands/github';
import {
  createPullRequest,
  createRepo,
  deleteRepoIfExists,
  getPullRequestComments,
} from './helpers/github';

describe('github pr', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let prNumber: number;
  let stdout: string;

  beforeAll(async () => {
    token = global.env.COMPOST_E2E_GITHUB_TOKEN;
    repo = global.env.COMPOST_E2E_GITHUB_REPO;

    if (!token) {
      throw new Error(
        `Expected COMPOST_E2E_GITHUB_TOKEN to be set in .env.test`
      );
    }

    if (!repo) {
      throw new Error(
        `Expected COMPOST_E2E_GITHUB_REPO to be set in .env.test`
      );
    }

    await deleteRepoIfExists(repo);
    await createRepo(repo);
    prNumber = await createPullRequest(repo);
  });

  afterAll(async () => {
    await deleteRepoIfExists(repo);
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
