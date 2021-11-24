import GitHubCommand from '../cli/commands/github';
import { captureOutput, OutputMock, suppressOutput } from './helpers/cli';
import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';

describe('GitHub', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let gh: GitHubHelper;
  let branch: string;
  let prNumber: number;
  let commitSha: string;
  let out: OutputMock;
  let args: string[];

  beforeAll(async () => {
    const env = loadGitHubTestEnv();
    repo = env.repo;
    token = env.token;

    gh = new GitHubHelper(repo, token);
    await gh.createRepoIfNotExists();
    [branch, commitSha] = await gh.createBranch();
    prNumber = await gh.createPr(branch);

    suppressOutput();
  });

  afterAll(async () => {
    await gh.closePr(prNumber);
    await gh.deleteBranch(branch);
  });

  beforeEach(() => {
    out = new OutputMock();
    captureOutput(out);
  });

  afterEach(jest.clearAllMocks);
  afterAll(jest.restoreAllMocks);

  describe('PR', () => {
    beforeAll(async () => {
      // Add non-matching existing comment
      args = [repo, 'pr', `${prNumber}`, `--github-token=${token}`];

      await GitHubCommand.run([
        ...args,
        'new',
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitHubCommand.run([...args, 'new', '--body=test 1']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 1', isMinimized: false },
      ]);
    });

    test('update', async () => {
      await GitHubCommand.run([...args, 'update', '--body=test 2']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 2', isMinimized: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitHubCommand.run([...args, 'hide-and-new', '--body=test 3']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 2', isMinimized: true },
        { body: 'test 3', isMinimized: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitHubCommand.run([...args, 'delete-and-new', '--body=test 4']);
      expect(await gh.getPrComments(prNumber)).toEqual([
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

  describe('commit', () => {
    beforeAll(async () => {
      // Add non-matching existing comment
      args = [repo, 'commit', commitSha, `--github-token=${token}`];

      await GitHubCommand.run([
        ...args,
        'new',
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitHubCommand.run([...args, 'new', '--body=test 1']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 1', isMinimized: false },
      ]);
    });

    test('update', async () => {
      await GitHubCommand.run([...args, 'update', '--body=test 2']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 2', isMinimized: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitHubCommand.run([...args, 'hide-and-new', '--body=test 3']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isMinimized: false },
        { body: 'test 2', isMinimized: true },
        { body: 'test 3', isMinimized: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitHubCommand.run([...args, 'delete-and-new', '--body=test 4']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
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
});
