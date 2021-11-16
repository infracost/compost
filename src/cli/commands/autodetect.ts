import { flags } from '@oclif/parser';
import Compost from '../..';
import { Behavior, Platform, TargetType } from '../../types';
import BaseCommand from '../base';

export default class AutoDetect extends BaseCommand {
  static description =
    'Auto-detect the CI environment and post a comment to a pull/merge request or commit';

  static examples = [
    `• Update the previously posted comment, or create if it doesn't exist:

   $ compost autodetect update --body="my comment"
`,
    `• Post a new comment:

   $ compost autodetect new --body="my new comment"
`,
    `• Delete the previous posted comments and post a new comment:

   $ compost autodetect delete_and_new --body="my new comment"
`,
    `• Hide the previous posted comments and post a new comment (GitHub only):

   $ compost autodetect hide_and_new --body="my new comment"`,
  ];

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

    const detectResult = comments.detectEnvironment(
      flags['target-type'] as TargetType[]
    );
    if (!detectResult) {
      this.errorHandler('Unable to detect current environment');
    }

    const { platform, project, targetType, targetRef } = detectResult;

    await comments.postComment(
      platform as Platform,
      project,
      targetType,
      targetRef,
      args.behavior as Behavior,
      body
    );
  }
}
