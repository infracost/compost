import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import BaseCommand from '../base';
export default class GitLabCommand extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'gitlab-token': flags.IOptionFlag<string>;
        'gitlab-server-url': flags.IOptionFlag<string>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        body: flags.IOptionFlag<string>;
        'body-file': flags.IOptionFlag<string>;
        tag: flags.IOptionFlag<string>;
    };
    static fixupBaseArgs(args: args.Input): args.Input;
    static args: args.Input;
    run(): Promise<void>;
}
