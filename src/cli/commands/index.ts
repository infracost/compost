import { Command, flags } from '@oclif/command';
import { getHelpClass } from '@oclif/plugin-help';

export default class IndexCommand extends Command {
  static flags = {
    version: flags.version({ char: 'v', description: 'Show version' }),
    help: flags.help({ char: 'h', description: 'Show help' }),
  };

  async run() {
    const HelpClass = getHelpClass(this.config);
    const help = new HelpClass(this.config);
    help.showHelp(this.argv);
    return this.exit(0);
  }
}
