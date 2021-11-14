import { flags } from '@oclif/parser';
import Compost, { Behavior } from '../..';
import BaseCommand from '../base';

export default class AutoDetect extends BaseCommand {
  static description =
    'Auto-detect the platform and post a comment to a {pull|merge} request/commit';

  static flags = {
    ...BaseCommand.flags,
    'target-type': flags.string({
      multiple: true,
      description: 'Limit the auto-detection to pull/merge requests or commits',
      options: ['pr', 'mr', 'commit'],
    }),
  };

  // We don't want the project, repo, targt_type or targer_ref args since those are auto-detected
  static args = BaseCommand.args.slice(3);

  async run() {
    const { args, flags } = this.parse(AutoDetect);

    const body = this.loadBody(flags);

    const opts = this.loadBaseOptions(flags);

    const comments = new Compost(opts);

    const detectResult = comments.detectEnvironment(flags['target-type']);
    if (!detectResult) {
      this.error('Unable to detect current environment');
    }

    const { platform, project, targetType, targetRef } = detectResult;

    await comments.postComment(
      platform,
      project,
      targetType,
      targetRef,
      args.behavior as Behavior,
      body
    );
  }
}
