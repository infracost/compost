import IntegrationComments, { Behavior } from '../..';
import BaseCommand from '../base';

export default class AutoDetect extends BaseCommand {
  static description =
    'Auto-detect the platform and post a comment to a {pull|merge} request/commit';

  static flags = BaseCommand.flags;

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(AutoDetect);

    const body = this.loadBody(flags);

    const opts = this.loadBaseOptions(flags);

    const comments = new IntegrationComments(opts);
    const platform = comments.detectPlatform();
    if (!platform) {
      this.error('Unable to detect platform');
    }
    await comments.postComment(platform, args.behavior as Behavior, body);
  }
}
