"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const plugin_help_1 = require("@oclif/plugin-help");
class IndexCommand extends command_1.Command {
    async run() {
        const HelpClass = (0, plugin_help_1.getHelpClass)(this.config);
        const help = new HelpClass(this.config);
        help.showHelp(this.argv);
        return this.exit(0);
    }
}
exports.default = IndexCommand;
IndexCommand.flags = {
    version: command_1.flags.version({ char: 'v', description: 'Show version' }),
    help: command_1.flags.help({ char: 'h', description: 'Show help' }),
};
