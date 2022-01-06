import GitLabCommand from '../cli/commands/gitlab';
import { captureOutput, OutputMock, suppressOutput } from './helpers/cli';
import GitHelper from './helpers/git';
import GitLabHelper, { loadGitLabTestEnv } from './helpers/gitlab';

describe('GitLab', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repo: string;
  let gl: GitLabHelper;
  let git: GitHelper;
  let branch: string;
  let mrNumber: number;
  let commitSha: string;
  let out: OutputMock;
  let args: string[];

  beforeAll(async () => {
    const env = loadGitLabTestEnv();
    repo = env.repo;
    token = env.token;

    gl = new GitLabHelper(repo, token);
    git = new GitHelper(
      `https://gitlab.com/${repo}`,
      await gl.getUsername(),
      token
    );

    await gl.createRepoIfNotExists();
    await git.cloneTemplateRepo();
    [branch, commitSha] = await git.createBranch();
    mrNumber = await gl.createMr(branch);

    suppressOutput();
  });

  afterAll(async () => {
    await gl.closeMr(mrNumber);
    await git.deleteBranch(branch);
    await git.cleanupRepo();
  });

  beforeEach(() => {
    out = new OutputMock();
    captureOutput(out);
  });

  afterEach(jest.clearAllMocks);
  afterAll(jest.restoreAllMocks);

  describe('MR', () => {
    beforeAll(async () => {
      // Add non-matching existing comment
      args = [repo, 'mr', `${mrNumber}`, `--gitlab-token=${token}`];

      await GitLabCommand.run([
        'new',
        ...args,
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitLabCommand.run(['new', ...args, '--body=test 1']);
      expect(await gl.getMrComments(mrNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 1', isHidden: false },
      ]);
    });

    test('update', async () => {
      await GitLabCommand.run(['update', ...args, '--body=test 2']);
      expect(await gl.getMrComments(mrNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitLabCommand.run(['hide-and-new', ...args, '--body=test 3']);
      expect(out.stderr).toContain(
        'Warning: Hiding comments is not supported by GitLab'
      );
      expect(await gl.getMrComments(mrNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
        { body: 'test 3', isHidden: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitLabCommand.run(['delete-and-new', ...args, '--body=test 4']);
      expect(await gl.getMrComments(mrNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 4', isHidden: false },
      ]);
    });

    test('latest', async () => {
      await GitLabCommand.run(['new', ...args, '--body=test 5']);
      await GitLabCommand.run(['new', ...args, '--body=other', '--tag=other']);
      await GitLabCommand.run(['latest', ...args]);
      expect(out.stdout).toEqual('test 5\n');
    });
  });

  describe('commit', () => {
    beforeAll(async () => {
      // Add non-matching existing comment
      args = [repo, 'commit', commitSha, `--gitlab-token=${token}`];

      await GitLabCommand.run([
        'new',
        ...args,
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await GitLabCommand.run(['new', ...args, '--body=test 1']);
      expect(await gl.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 1', isHidden: false },
      ]);
    });

    test('update', async () => {
      await GitLabCommand.run(['update', ...args, '--body=test 2']);
      expect(await gl.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
      ]);
    });

    test('hide-and-new', async () => {
      await GitLabCommand.run(['hide-and-new', ...args, '--body=test 3']);
      expect(out.stderr).toContain(
        'Warning: Hiding comments is not supported by GitLab'
      );
      expect(await gl.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
        { body: 'test 3', isHidden: false },
      ]);
    });

    test('delete-and-new', async () => {
      await GitLabCommand.run(['delete-and-new', ...args, '--body=test 4']);
      expect(await gl.getCommitComments(commitSha)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 4', isHidden: false },
      ]);
    });

    test('latest', async () => {
      await GitLabCommand.run(['new', ...args, '--body=test 5']);
      await GitLabCommand.run(['new', ...args, '--body=other', '--tag=other']);
      await GitLabCommand.run(['latest', ...args]);
      expect(out.stdout).toEqual('test 5\n');
    });
  });
});
