"use strict";
/* eslint-disable no-console */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGitHubTestEnv = void 0;
const octokit_1 = require("octokit");
const plugin_retry_1 = require("@octokit/plugin-retry");
const util_1 = require("../../util");
const templateOwner = 'infracost';
const templateRepo = 'compost-e2e-tests-template';
const branchPrefix = 'e2e-test-';
const OctokitWithRetries = octokit_1.Octokit.plugin(plugin_retry_1.retry);
function loadGitHubTestEnv() {
    const repo = global.env.COMPOST_E2E_GITHUB_REPO;
    const token = global.env.COMPOST_E2E_GITHUB_TOKEN;
    if (!repo) {
        throw new Error(`Expected COMPOST_E2E_GITHUB_REPO to be set in .env.test`);
    }
    if (!token) {
        throw new Error(`Expected COMPOST_E2E_GITHUB_TOKEN to be set in .env.test`);
    }
    return { repo, token };
}
exports.loadGitHubTestEnv = loadGitHubTestEnv;
function generateRandomBranchName() {
    return `${branchPrefix}${Math.random().toString(36).substring(7)}`;
}
class GitHubHelper {
    constructor(fullRepo, token) {
        [this.owner, this.repo] = fullRepo.split('/');
        if (!this.owner || !this.repo) {
            throw new Error(`Invalid repo: ${fullRepo}`);
        }
        this.octokit = new OctokitWithRetries({
            auth: token,
        });
    }
    async createRepoIfNotExists() {
        var _a;
        console.log(`Checking if repo ${this.owner}/${this.repo} exists`);
        try {
            const resp = await this.octokit.rest.repos.get({
                owner: this.owner,
                repo: this.repo,
            });
            if (resp.data) {
                if (((_a = resp.data.template_repository) === null || _a === void 0 ? void 0 : _a.full_name) !==
                    `${templateOwner}/${templateRepo}`) {
                    throw Error(`Repo ${this.owner}/${this.repo} exists and does not use the ${templateOwner}/${templateRepo} template`);
                }
                console.log(`Repo ${this.owner}/${this.repo} already exists`);
                return;
            }
        }
        catch (err) {
            if (err.status !== 404) {
                throw err;
            }
        }
        console.log(`Creating repo ${this.owner}/${this.repo} from ${templateOwner}/${templateRepo} template`);
        await this.octokit.rest.repos.createUsingTemplate({
            owner: this.owner,
            name: this.repo,
            template_owner: templateOwner,
            template_repo: templateRepo,
            include_all_branches: true,
        });
        // Sleep for 2 seconds to give GitHub time to propogate the repo creation
        await new Promise((r) => {
            setTimeout(r, 2000);
        });
    }
    async createBranch() {
        const branch = generateRandomBranchName();
        console.log(`Getting latest commit SHA`);
        const masterCommitSha = (await this.octokit.rest.repos.listCommits({
            owner: this.owner,
            repo: this.repo,
            sha: 'master',
            per_page: 1,
        })).data[0].sha;
        console.log(`Creating branch ${branch}`);
        await this.octokit.rest.git.createRef({
            owner: this.owner,
            repo: this.repo,
            ref: `refs/heads/${branch}`,
            sha: masterCommitSha,
        });
        console.log(`Creating a new file on branch ${branch}`);
        const resp = await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path: 'new_file.txt',
            content: Buffer.from(`Test file for branch ${branch}`).toString('base64'),
            message: `Add test file to branch ${branch}`,
            branch,
        });
        const commitSha = resp.data.commit.sha;
        return [branch, commitSha];
    }
    async createPr(branch) {
        console.log(`Creating a new PR for branch ${branch}`);
        const resp = await this.octokit.rest.pulls.create({
            owner: this.owner,
            repo: this.repo,
            title: `Test PR for branch ${branch}`,
            head: branch,
            base: 'master',
        });
        return resp.data.number;
    }
    async getPrComments(prNumber, keepMarkdownHeader) {
        var _a, _b, _c, _d, _e, _f;
        // Use the GraphQL api here so we can see if they're minimized
        let after = null;
        let hasNextPage = true;
        let comments = [];
        console.log(`Fetching PR comments for ${this.owner}/${this.repo} PR ${prNumber}`);
        while (hasNextPage) {
            const data = await this.octokit.graphql(`
        query($repo: String! $owner: String! $prNumber: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $prNumber) {
              comments(first: 100 after: $after) {
                nodes {
                  body
                  isMinimized
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
        `, {
                owner: this.owner,
                repo: this.repo,
                prNumber,
                after,
            });
            after = (_b = (_a = data.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.comments.pageInfo.endCursor;
            hasNextPage = (_d = (_c = data.repository) === null || _c === void 0 ? void 0 : _c.pullRequest) === null || _d === void 0 ? void 0 : _d.comments.pageInfo.hasNextPage;
            comments.push(...(((_f = (_e = data.repository) === null || _e === void 0 ? void 0 : _e.pullRequest) === null || _f === void 0 ? void 0 : _f.comments.nodes) || []));
        }
        if (!keepMarkdownHeader) {
            comments = comments.map((c) => (Object.assign(Object.assign({}, c), { body: (0, util_1.stripMarkdownTag)(c.body) })));
        }
        return comments;
    }
    async getCommitComments(commitSha, keepMarkdownHeader) {
        var _a;
        // Use the GraphQL api here so we can see if they're minimized
        let after = null;
        let hasNextPage = true;
        let comments = [];
        console.log(`Fetching commit comments for ${this.owner}/${this.repo} commit ${commitSha}`);
        while (hasNextPage) {
            const data = await this.octokit.graphql(`
        query($repo: String! $owner: String! $commitSha: GitObjectID! $after: String) {
          repository(name: $repo owner: $owner) {
            object(oid: $commitSha) {
              ... on Commit {
                comments(first: 100 after: $after) {
                  nodes {
                    body
                    isMinimized
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }
        `, {
                owner: this.owner,
                repo: this.repo,
                commitSha,
                after,
            });
            const commit = (_a = data.repository) === null || _a === void 0 ? void 0 : _a.object;
            after = commit === null || commit === void 0 ? void 0 : commit.comments.pageInfo.endCursor;
            hasNextPage = commit === null || commit === void 0 ? void 0 : commit.comments.pageInfo.hasNextPage;
            comments.push(...((commit === null || commit === void 0 ? void 0 : commit.comments.nodes) || []));
        }
        if (!keepMarkdownHeader) {
            comments = comments.map((c) => (Object.assign(Object.assign({}, c), { body: (0, util_1.stripMarkdownTag)(c.body) })));
        }
        return comments;
    }
    async closePr(prNumber) {
        console.log(`Closing PR ${prNumber}`);
        await this.octokit.rest.pulls.update({
            owner: this.owner,
            repo: this.repo,
            pull_number: prNumber,
            state: 'closed',
        });
    }
    async deleteBranch(branch) {
        console.log(`Deleting branch ${branch}`);
        console.log(`refs/heads/${branch}`);
        await this.octokit.rest.git.deleteRef({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${branch}`,
        });
    }
    async closeAllPrs() {
        console.log(`Closing all test pull requests`);
        const data = await this.octokit.paginate(this.octokit.rest.pulls.list, {
            owner: this.owner,
            repo: this.repo,
            state: 'open',
        });
        for (const pr of data) {
            if (!pr.head.ref.startsWith(`${branchPrefix}`)) {
                console.log(`Skipping PR ${pr.number} since it's for branch ${pr.head.ref} which doesn't match the expected branch prefix of ${branchPrefix}`);
                continue;
            }
            await this.octokit.rest.pulls.update({
                owner: this.owner,
                repo: this.repo,
                pull_number: pr.number,
                state: 'closed',
            });
        }
    }
    async deleteAllBranches() {
        console.log(`Deleting all test branches`);
        const data = await this.octokit.paginate(this.octokit.rest.git.listMatchingRefs, {
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${branchPrefix}`,
        });
        for (const branch of data) {
            await this.octokit.rest.git.deleteRef({
                owner: this.owner,
                repo: this.repo,
                ref: branch.ref.replace('refs/', ''),
            });
        }
    }
    async deleteRepoIfPossible() {
        console.log(`Attempting to delete repo ${this.owner}/${this.repo}`);
        try {
            await this.octokit.rest.repos.delete({
                owner: this.owner,
                repo: this.repo,
            });
        }
        catch (err) {
            console.log(`Unable to delete test repo: ${err.message}`);
            console.log(`If you need to clean up the repo, please do so manually`);
            return;
        }
        console.log(`Deleted repo ${this.owner}/${this.repo}`);
    }
}
exports.default = GitHubHelper;
