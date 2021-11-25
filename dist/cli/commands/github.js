"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const command_1 = require("@oclif/command");
const github_1 = require("../../platforms/github");
const base_1 = (0, tslib_1.__importDefault)(require("../base"));
class GitHubCommand extends base_1.default {
    async run() {
        const { args, flags } = this.parse(GitHubCommand);
        const { project, targetType, targetRef, behavior } = this.loadBaseArgs(args);
        let body;
        if (behavior !== 'latest') {
            body = this.loadBody(flags);
        }
        const token = flags['github-token'];
        const apiUrl = flags['github-api-url'];
        const c = new github_1.GitHub(project, targetType, targetRef, token, apiUrl, this.loadBaseOptions(flags));
        await base_1.default.handleComment(c, behavior, body);
    }
}
exports.default = GitHubCommand;
GitHubCommand.description = 'Post a comment to a GitHub pull request/commit';
GitHubCommand.examples = [
    `• Update a comment on a pull request:

   $ compost github infracost/compost-example pr 3 update --body="my comment"
`,
    `• Update a comment on a commit:
    
   $ compost github infracost/compost-example commit 2ca7182 update --body="my comment",`,
];
GitHubCommand.flags = Object.assign(Object.assign({}, base_1.default.flags), { 'github-token': command_1.flags.string({
        description: 'GitHub token, defaults to $GITHUB_TOKEN',
    }), 'github-api-url': command_1.flags.string({
        description: 'GitHub API URL, defaults to $GITHUB_API_URL',
        default: process.env.GITHUB_API_URL || 'https://api.github.com',
    }) });
GitHubCommand.args = base_1.default.args;
