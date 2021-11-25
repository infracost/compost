import { Command } from '@oclif/command';
export default class IndexCommand extends Command {
    static flags: {
        version: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    run(): Promise<never>;
}
