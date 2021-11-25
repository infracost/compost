"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const command_1 = require("@oclif/command");
const azureDevOps_1 = require("../../platforms/azureDevOps");
const base_1 = (0, tslib_1.__importDefault)(require("../base"));
class AzureDevOpsCommand extends base_1.default {
    // fixup the args to specify the project format.
    static fixupBaseArgs(args) {
        return [
            Object.assign(Object.assign({}, args[0]), { description: 'Repo URL, e.g. https://dev.azure.com/infracost/base/_git/compost-example' }),
            ...args.slice(1),
        ];
    }
    async run() {
        const { args, flags } = this.parse(AzureDevOpsCommand);
        const { project, targetType, targetRef, behavior } = this.loadBaseArgs(args);
        let body;
        if (behavior !== 'latest') {
            body = this.loadBody(flags);
        }
        const token = flags['azure-devops-token'];
        const c = new azureDevOps_1.AzureDevOps(project, targetType, targetRef, token, this.loadBaseOptions(flags));
        await base_1.default.handleComment(c, behavior, body);
    }
}
exports.default = AzureDevOpsCommand;
AzureDevOpsCommand.description = 'Post a comment to a Azure DevOps pull request/commit';
AzureDevOpsCommand.examples = [
    `• Update a comment on a pull request:
  
   $ compost azure-devops https://dev.azure.com/infracost/base/_git/compost-example pr 3 update --body="my comment"`,
];
AzureDevOpsCommand.flags = Object.assign(Object.assign({}, base_1.default.flags), { 'azure-devops-token': command_1.flags.string({
        description: 'Azure DevOps PAT token or a base64 encoded bearer token',
    }) });
AzureDevOpsCommand.args = AzureDevOpsCommand.fixupBaseArgs(base_1.default.args);
