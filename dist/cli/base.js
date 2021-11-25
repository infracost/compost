"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = (0, tslib_1.__importDefault)(require("fs"));
const command_1 = require("@oclif/command");
const util_1 = require("util");
class BaseCommand extends command_1.Command {
    constructor(argv, config) {
        super(argv, config);
        this.logger = this.wrapLogger();
        this.errorHandler = this.error;
    }
    wrapLogger() {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return {
            debug: (...args) => this.debug(args),
            // Overwrite info to use stderr instead of stdout
            info(message = '', ...args) {
                // eslint-disable-next-line no-param-reassign
                message = typeof message === 'string' ? message : (0, util_1.inspect)(message);
                process.stderr.write(`${(0, util_1.format)(message, ...args)}\n`);
            },
            warn: (message) => this.warn(message),
        };
        /* eslint-enable @typescript-eslint/no-explicit-any */
    }
    loadBody(flags) {
        if (flags.body) {
            return flags.body;
        }
        const bodyFile = flags['body-file'];
        if (!bodyFile) {
            this.errorHandler('body or body-file is required');
        }
        if (!fs_1.default.existsSync(bodyFile)) {
            this.errorHandler(`body-file ${bodyFile} does not exist`);
        }
        try {
            return fs_1.default.readFileSync(bodyFile, 'utf8');
        }
        catch (err) {
            this.errorHandler(`Error reading body-file: ${err}`);
        }
        return '';
    }
    loadBaseOptions(flags) {
        return {
            tag: flags.tag,
            logger: this.logger,
            errorHandler: this.errorHandler,
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadBaseArgs(args) {
        const { project } = args;
        const targetType = args.target_type;
        const behavior = args.behavior;
        let targetRef = args.target_ref;
        if (targetType === 'pull-request' || targetType === 'merge-request') {
            targetRef = parseInt(targetRef, 10);
            if (Number.isNaN(targetRef)) {
                this.errorHandler(`target_ref must be a number`);
            }
        }
        return {
            project,
            targetType,
            targetRef,
            behavior,
        };
    }
    static async handleComment(platform, behavior, body) {
        if (behavior === 'latest') {
            const comment = await platform.getComment(behavior);
            if (comment) {
                process.stdout.write(`${comment.body}\n`);
            }
        }
        else {
            await platform.postComment(behavior, body);
        }
    }
}
exports.default = BaseCommand;
BaseCommand.flags = {
    help: command_1.flags.help({ char: 'h', description: 'Show help' }),
    body: command_1.flags.string({
        description: 'Body of comment to post, mutually exclusive with body-file',
        exclusive: ['body-file'],
    }),
    'body-file': command_1.flags.string({
        description: 'File containing body of comment to post, mutually exclusive with body',
        exclusive: ['body'],
    }),
    tag: command_1.flags.string({
        description: 'Will match any comments with same tag when upserting, hiding or deleting',
    }),
};
BaseCommand.args = [
    {
        name: 'project',
        description: 'Project name in format owner/repo',
        required: true,
    },
    {
        name: 'target_type',
        description: 'Whether to post on a pull request or commit',
        required: true,
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
    },
    {
        name: 'target_ref',
        description: 'The pull request number or commit SHA',
        required: true,
    },
    {
        name: 'behavior',
        description: 'Behavior when posting or retrieving a comment',
        required: true,
        options: ['update', 'new', 'hide-and-new', 'delete-and-new', 'latest'],
    },
];
