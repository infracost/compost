"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const parser_1 = require("@oclif/parser");
const autodetect_1 = require("../../platforms/autodetect");
const base_1 = (0, tslib_1.__importDefault)(require("../base"));
class AutoDetectCommand extends base_1.default {
    async run() {
        const { args, flags } = this.parse(AutoDetectCommand);
        const behavior = args.behavior;
        let body;
        if (behavior !== 'latest') {
            body = this.loadBody(flags);
        }
        const targetType = flags['target-type'];
        const c = (0, autodetect_1.autodetect)(Object.assign({ targetType }, this.loadBaseOptions(flags)));
        await base_1.default.handleComment(c, behavior, body);
    }
}
exports.default = AutoDetectCommand;
AutoDetectCommand.description = 'Auto-detect the CI environment and post a comment to a pull/merge request or commit';
AutoDetectCommand.examples = [
    `• Update the previously posted comment, or create if it doesn't exist:

   $ compost autodetect update --body="my comment"
`,
    `• Post a new comment:

   $ compost autodetect new --body="my new comment"
`,
    `• Delete the previous posted comments and post a new comment:

   $ compost autodetect delete-and-new --body="my new comment"
`,
    `• Hide the previous posted comments and post a new comment (GitHub only):

   $ compost autodetect hide-and-new --body="my new comment"`,
];
AutoDetectCommand.flags = Object.assign(Object.assign({}, base_1.default.flags), { 'target-type': parser_1.flags.string({
        description: 'Limit the auto-detection to pull/merge requests or commits',
        options: ['pull-request', 'merge-request', 'pr', 'mr', 'commit'],
        parse(val) {
            switch (val) {
                case 'pr':
                    return 'pull-request';
                case 'mr':
                    return 'merge-request';
                default:
                    return val;
            }
        },
    }) });
// We don't want the project, repo, targt_type or targer_ref args since those are auto-detected
AutoDetectCommand.args = base_1.default.args.slice(3);
