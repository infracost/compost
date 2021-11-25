import { flags } from '@oclif/command';
import BaseCommand from '../base';
export default class GitHubCommand extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'github-token': flags.IOptionFlag<string>;
        'github-api-url': flags.IOptionFlag<string>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        body: flags.IOptionFlag<string>;
        'body-file': flags.IOptionFlag<string>;
        tag: flags.IOptionFlag<string>;
    };
    static args: import("@oclif/parser/lib/args").Input;
    run(): Promise<void>;
}
