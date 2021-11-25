"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const command_1 = require("@oclif/command");
const gitlab_1 = require("../../platforms/gitlab");
const base_1 = (0, tslib_1.__importDefault)(require("../base"));
class GitLabCommand extends base_1.default {
    // fixup the args to use the term 'merge request' instead of 'pull request'.
    static fixupBaseArgs(args) {
        return [
            args[0],
            Object.assign(Object.assign({}, args[1]), { description: 'Whether to post on a merge request or commit' }),
            Object.assign(Object.assign({}, args[2]), { description: 'The merge request number or commit SHA' }),
            ...args.slice(3),
        ];
    }
    async run() {
        const { args, flags } = this.parse(GitLabCommand);
        const { project, targetType, targetRef, behavior } = this.loadBaseArgs(args);
        let body;
        if (behavior !== 'latest') {
            body = this.loadBody(flags);
        }
        const token = flags['github-token'];
        const serverUrl = flags['github-api-url'];
        const c = new gitlab_1.GitLab(project, targetType, targetRef, token, serverUrl, this.loadBaseOptions(flags));
        await base_1.default.handleComment(c, behavior, body);
    }
}
exports.default = GitLabCommand;
GitLabCommand.description = 'Post a comment to a GitLab merge request/commit';
GitLabCommand.examples = [
    `• Update a comment on a merge request:

   $ compost gitlab infracost/compost-example mr 3 update --body="my comment"`,
];
GitLabCommand.flags = Object.assign(Object.assign({}, base_1.default.flags), { 'gitlab-token': command_1.flags.string({ description: 'GitLab token' }), 'gitlab-server-url': command_1.flags.string({
        description: 'GitLab server URL',
        default: 'https://gitlab.com',
    }) });
GitLabCommand.args = GitLabCommand.fixupBaseArgs(base_1.default.args);
