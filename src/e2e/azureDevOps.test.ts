import AzureDevOpsCommand from '../cli/commands/azure-devops';
import { captureOutput, OutputMock, suppressOutput } from './helpers/cli';
import GitHelper from './helpers/git';
import AzureDevOpsHelper, {
  loadAzureDevOpsTestEnv,
} from './helpers/azureDevOps';

describe('AzureDevOps', () => {
  jest.setTimeout(30_000);

  let token: string;
  let repoUrl: string;
  let az: AzureDevOpsHelper;
  let git: GitHelper;
  let branch: string;
  let prNumber: number;
  let out: OutputMock;
  let args: string[];

  beforeAll(async () => {
    const env = loadAzureDevOpsTestEnv();
    repoUrl = env.repoUrl;
    token = env.token;

    az = new AzureDevOpsHelper(repoUrl, token);
    git = new GitHelper(repoUrl, '', token);

    await az.createRepoIfNotExists();
    await git.cloneTemplateRepo();
    [branch] = await git.createBranch();
    prNumber = await az.createPr(branch);

    suppressOutput();
  });

  afterAll(async () => {
    await az.closePr(prNumber);
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
      args = [repoUrl, 'pr', `${prNumber}`, `--azure-devops-token=${token}`];

      await AzureDevOpsCommand.run([
        'new',
        ...args,
        '--body=existing',
        '--tag=existing',
      ]);
    });

    test('new', async () => {
      await AzureDevOpsCommand.run(['new', ...args, '--body=test 1']);
      expect(await az.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 1', isHidden: false },
      ]);
    });

    test('update', async () => {
      await AzureDevOpsCommand.run(['update', ...args, '--body=test 2']);
      expect(await az.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
      ]);
    });

    test('hide-and-new', async () => {
      await AzureDevOpsCommand.run(['hide-and-new', ...args, '--body=test 3']);
      expect(out.stderr).toContain(
        'Warning: Hiding comments is not supported by Azure DevOps'
      );
      expect(await az.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 2', isHidden: false },
        { body: 'test 3', isHidden: false },
      ]);
    });

    test('delete-and-new', async () => {
      await AzureDevOpsCommand.run([
        'delete-and-new',
        ...args,
        '--body=test 4',
      ]);
      expect(await az.getPrComments(prNumber)).toEqual([
        { body: 'existing', isHidden: false },
        { body: 'test 4', isHidden: false },
      ]);
    });

    test('latest', async () => {
      await AzureDevOpsCommand.run(['new', ...args, '--body=test 5']);
      await AzureDevOpsCommand.run([
        'new',
        ...args,
        '--body=other',
        '--tag=other',
      ]);
      await AzureDevOpsCommand.run(['latest', ...args]);
      expect(out.stdout).toEqual('test 5\n');
    });
  });
});
