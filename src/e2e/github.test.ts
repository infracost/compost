import GitHubCommand from '../cli/commands/github';
import { captureOutput, OutputMock, suppressOutput } from './helpers/cli';
import GitHelper from './helpers/git';
import GitHubHelper, { loadGitHubTestEnv } from './helpers/github';

describe('GitHub', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let gh: GitHubHelper;
  let git: GitHelper;
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
    git = new GitHelper(
      `https://github.com/${repo}`,
      await gh.getUsername(),
      token
    );

    await gh.createRepoIfNotExists();
    await git.cloneTemplateRepo();
    [branch, commitSha] = await git.createBranch();
    prNumber = await gh.createPr(branch);

    suppressOutput();
  });

  afterAll(async () => {
    await gh.closePr(prNumber);
    await git.deleteBranch(branch);
    await git.cleanupRepo();
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
        'new',
        ...args,
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitHubCommand.run(['new', ...args, '--body=test 1']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 1', isHidden: false },
      ]);
    });

    test('update', async () => {
      await GitHubCommand.run(['update', ...args, '--body=test 2']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitHubCommand.run(['hide-and-new', ...args, '--body=test 3']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: true },
        { body: 'test 3', isHidden: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitHubCommand.run(['delete-and-new', ...args, '--body=test 4']);
      expect(await gh.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 4', isHidden: false },
      ]);
    });

    test('latest', async () => {
      await GitHubCommand.run(['new', ...args, '--body=test 5']);
      await GitHubCommand.run(['new', ...args, '--body=other', '--tag=other']);
      await GitHubCommand.run(['latest', ...args]);
      expect(out.stdout).toEqual('test 5\n');
    });
  });

  describe('commit', () => {
    beforeAll(async () => {
      // Add non-matching existing comment
      args = [repo, 'commit', commitSha, `--github-token=${token}`];

      await GitHubCommand.run([
        'new',
        ...args,
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitHubCommand.run(['new', ...args, '--body=test 1']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 1', isHidden: false },
      ]);
    });

    test('update', async () => {
      await GitHubCommand.run(['update', ...args, '--body=test 2']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitHubCommand.run(['hide-and-new', ...args, '--body=test 3']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: true },
        { body: 'test 3', isHidden: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitHubCommand.run(['delete-and-new', ...args, '--body=test 4']);
      expect(await gh.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 4', isHidden: false },
      ]);
    });

    test('latest', async () => {
      await GitHubCommand.run(['new', ...args, '--body=test 5']);
      await GitHubCommand.run(['new', ...args, '--body=other', '--tag=other']);
      await GitHubCommand.run(['latest', ...args]);
      expect(out.stdout).toEqual('test 5\n');
    });
  });
});
