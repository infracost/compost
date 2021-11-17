import GitHubCommand from '../cli/commands/github';
import { captureOutput, OutputMock, suppressOutput } from './helpers/cli';
import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';

describe('GitHub PR', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let gh: GitHubHelper;
  let branch: string;
  let prNumber: number;
  let out: OutputMock;
  let args: string[];

  beforeAll(async () => {
    const env = loadGitHubTestEnv();
    repo = env.repo;
    token = env.token;

    gh = new GitHubHelper(repo, token);
    await gh.createRepoIfNotExists();
    branch = await gh.createBranch();
    prNumber = await gh.createPullRequest(branch);

    args = [`${repo}`, 'pr', `${prNumber}`, `--github-token=${token}`];

    // Add non-matching existing comment
    suppressOutput();
    await GitHubCommand.run([
      ...args,
      'new',
      '--body=existing',
      '--tag=existing',
    ]);
  });

  afterAll(async () => {
    await gh.closePullRequest(prNumber);
    await gh.deleteBranch(branch);
  });

  beforeEach(() => {
    out = new OutputMock();
    captureOutput(out);
  });

  afterEach(jest.clearAllMocks);
  afterAll(jest.restoreAllMocks);

  test('new', async () => {
    await GitHubCommand.run([...args, 'new', '--body=test 1']);
    expect(await gh.getPullRequestComments(prNumber)).toEqual([
      { body: 'existing', isMinimized: false },
      { body: 'test 1', isMinimized: false },
    ]);
  });

  test('update', async () => {
    await GitHubCommand.run([...args, 'update', '--body=test 2']);
    expect(await gh.getPullRequestComments(prNumber)).toEqual([
      { body: 'existing', isMinimized: false },
      { body: 'test 2', isMinimized: false },
    ]);
  });

  test('hide_and_new', async () => {
    await GitHubCommand.run([...args, 'hide_and_new', '--body=test 3']);
    expect(await gh.getPullRequestComments(prNumber)).toEqual([
      { body: 'existing', isMinimized: false },
      { body: 'test 2', isMinimized: true },
      { body: 'test 3', isMinimized: false },
    ]);
  });

  test('delete_and_new', async () => {
    await GitHubCommand.run([...args, 'delete_and_new', '--body=test 4']);
    expect(await gh.getPullRequestComments(prNumber)).toEqual([
      { body: 'existing', isMinimized: false },
      { body: 'test 4', isMinimized: false },
    ]);
  });

  test('latest', async () => {
    await GitHubCommand.run([...args, 'new', '--body=test 5']);
    await GitHubCommand.run([...args, 'new', '--body=other', '--tag=other']);
    await GitHubCommand.run([...args, 'latest']);
    expect(out.stdout).toEqual('test 5\n');
  });
});
