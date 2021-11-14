import IntegrationComments, { Behavior } from '../..';
import BaseCommand from '../base';

export default class AutoDetect extends BaseCommand {
  static description =
    'Auto-detect the platform and post a comment to a {pull|merge} request/commit';

  static flags = BaseCommand.flags;

  // We don't want the targt_type or targer_ref args
  static args = BaseCommand.args.slice(2);

  async run() {
    const { args, flags } = this.parse(AutoDetect);

    const body = this.loadBody(flags);

    const opts = this.loadBaseOptions(flags);

    const comments = new IntegrationComments(opts);

    const detectResult = comments.detectEnvironment();
    if (!detectResult) {
      this.error('Unable to detect current environment');
    }

    const { platform, targetType, targetRef } = detectResult;

    await comments.postComment(
      platform,
      targetType,
      targetRef,
      args.behavior as Behavior,
      body
    );
  }
}
