import { Command, flags } from '@oclif/command';
import { args, OutputArgs, OutputFlags } from '@oclif/parser';
import { IConfig } from '@oclif/config';
import { ErrorHandler, Logger } from '../util';
import { CommentHandlerOptions, TargetType, TargetReference, Behavior, Platform } from '../types';
export default abstract class BaseCommand extends Command {
    protected logger: Logger;
    protected errorHandler: ErrorHandler;
    constructor(argv: string[], config: IConfig);
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        body: flags.IOptionFlag<string>;
        'body-file': flags.IOptionFlag<string>;
        tag: flags.IOptionFlag<string>;
    };
    static args: args.Input;
    private wrapLogger;
    protected loadBody(flags: OutputFlags<typeof BaseCommand.flags>): string;
    protected loadBaseOptions(flags: OutputFlags<typeof BaseCommand.flags>): CommentHandlerOptions;
    protected loadBaseArgs(args: OutputArgs<any>): {
        project: string;
        targetType: TargetType;
        targetRef: TargetReference;
        behavior: Behavior;
    };
    protected static handleComment(platform: Platform, behavior: Behavior, body: string): Promise<void>;
}
