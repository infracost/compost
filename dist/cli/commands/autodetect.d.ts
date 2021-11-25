import { flags } from '@oclif/parser';
import BaseCommand from '../base';
export default class AutoDetectCommand extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'target-type': flags.IOptionFlag<string>;
        help: flags.IBooleanFlag<void>;
        body: import("@oclif/command/lib/flags").IOptionFlag<string>;
        'body-file': import("@oclif/command/lib/flags").IOptionFlag<string>;
        tag: import("@oclif/command/lib/flags").IOptionFlag<string>;
    };
    static args: import("@oclif/parser/lib/args").IArg<any>[];
    run(): Promise<void>;
}
