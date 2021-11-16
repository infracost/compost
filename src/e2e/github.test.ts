import GitHubCommand from '../cli/commands/github';
import { captureOutput } from './helpers/cli';
import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';

describe('github pr', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let gh: GitHubHelper;
  let branch: string;
  let prNumber: number;
  let stdout: string;
  let stderr: string;

  beforeAll(async () => {
    const env = loadGitHubTestEnv();
    repo = env.repo;
    token = env.token;

    gh = new GitHubHelper(repo, token);
    await gh.createRepoIfNotExists();
    branch = await gh.createBranch();
    prNumber = await gh.createPullRequest(branch);
  });

  afterAll(async () => {
    await gh.closePullRequest(prNumber);
    await gh.deleteBranch(branch);
  });

  beforeEach(() => {
    captureOutput(stdout, stderr);
  });

  afterEach(jest.restoreAllMocks);

  test('example test', async () => {
    const args = [`${repo}`, 'pr', `${prNumber}`, `--github-token=${token}`];

    await GitHubCommand.run([...args, 'new', '--body=test 1']);
    await GitHubCommand.run([...args, 'new', '--body=test 2']);
    await GitHubCommand.run([...args, 'update', '--body=test 3']);

    const comments = await gh.getPullRequestComments(prNumber);

    expect(comments.length).toBe(2);
    expect(comments).toEqual([
      { body: 'test 1', isMinimized: false },
      { body: 'test 3', isMinimized: false },
    ]);
  });
});
