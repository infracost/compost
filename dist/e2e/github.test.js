"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const github_1 = (0, tslib_1.__importDefault)(require("../cli/commands/github"));
const cli_1 = require("./helpers/cli");
const github_2 = (0, tslib_1.__importStar)(require("./helpers/github"));
describe('GitHub', () => {
    jest.setTimeout(30000);
    let token;
    let repo;
    let gh;
    let branch;
    let prNumber;
    let commitSha;
    let out;
    let args;
    beforeAll(async () => {
        const env = (0, github_2.loadGitHubTestEnv)();
        repo = env.repo;
        token = env.token;
        gh = new github_2.default(repo, token);
        await gh.createRepoIfNotExists();
        [branch, commitSha] = await gh.createBranch();
        prNumber = await gh.createPr(branch);
        (0, cli_1.suppressOutput)();
    });
    afterAll(async () => {
        await gh.closePr(prNumber);
        await gh.deleteBranch(branch);
    });
    beforeEach(() => {
        out = new cli_1.OutputMock();
        (0, cli_1.captureOutput)(out);
    });
    afterEach(jest.clearAllMocks);
    afterAll(jest.restoreAllMocks);
    describe('PR', () => {
        beforeAll(async () => {
            // Add non-matching existing comment
            args = [repo, 'pr', `${prNumber}`, `--github-token=${token}`];
            await github_1.default.run([
                ...args,
                'new',
                '--body=existing',
                '--tag=existing',
            ]);
        });
        test('new', async () => {
            await github_1.default.run([...args, 'new', '--body=test 1']);
            expect(await gh.getPrComments(prNumber)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 1', isMinimized: false },
            ]);
        });
        test('update', async () => {
            await github_1.default.run([...args, 'update', '--body=test 2']);
            expect(await gh.getPrComments(prNumber)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 2', isMinimized: false },
            ]);
        });
        test('hide-and-new', async () => {
            await github_1.default.run([...args, 'hide-and-new', '--body=test 3']);
            expect(await gh.getPrComments(prNumber)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 2', isMinimized: true },
                { body: 'test 3', isMinimized: false },
            ]);
        });
        test('delete-and-new', async () => {
            await github_1.default.run([...args, 'delete-and-new', '--body=test 4']);
            expect(await gh.getPrComments(prNumber)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 4', isMinimized: false },
            ]);
        });
        test('latest', async () => {
            await github_1.default.run([...args, 'new', '--body=test 5']);
            await github_1.default.run([...args, 'new', '--body=other', '--tag=other']);
            await github_1.default.run([...args, 'latest']);
            expect(out.stdout).toEqual('test 5\n');
        });
    });
    describe('commit', () => {
        beforeAll(async () => {
            // Add non-matching existing comment
            args = [repo, 'commit', commitSha, `--github-token=${token}`];
            await github_1.default.run([
                ...args,
                'new',
                '--body=existing',
                '--tag=existing',
            ]);
        });
        test('new', async () => {
            await github_1.default.run([...args, 'new', '--body=test 1']);
            expect(await gh.getCommitComments(commitSha)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 1', isMinimized: false },
            ]);
        });
        test('update', async () => {
            await github_1.default.run([...args, 'update', '--body=test 2']);
            expect(await gh.getCommitComments(commitSha)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 2', isMinimized: false },
            ]);
        });
        test('hide-and-new', async () => {
            await github_1.default.run([...args, 'hide-and-new', '--body=test 3']);
            expect(await gh.getCommitComments(commitSha)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 2', isMinimized: true },
                { body: 'test 3', isMinimized: false },
            ]);
        });
        test('delete-and-new', async () => {
            await github_1.default.run([...args, 'delete-and-new', '--body=test 4']);
            expect(await gh.getCommitComments(commitSha)).toEqual([
                { body: 'existing', isMinimized: false },
                { body: 'test 4', isMinimized: false },
            ]);
        });
        test('latest', async () => {
            await github_1.default.run([...args, 'new', '--body=test 5']);
            await github_1.default.run([...args, 'new', '--body=other', '--tag=other']);
            await github_1.default.run([...args, 'latest']);
            expect(out.stdout).toEqual('test 5\n');
        });
    });
});
