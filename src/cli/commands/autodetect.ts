import { flags } from '@oclif/parser';
import { AutoDetect } from '../../platforms/autodetect';
import { Behavior, TargetType } from '../../types';
import { stripMarkdownTag } from '../../util';
import BaseCommand from '../base';

export default class AutoDetectCommand extends BaseCommand {
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
    const { args, flags } = this.parse(AutoDetectCommand);

    const behavior = args.behavior as Behavior;

    let body: string;
    if (behavior !== 'latest') {
      body = this.loadBody(flags);
    }

    const targetTypes = flags['target-type'] as TargetType[];

    const c = new AutoDetect(targetTypes, this.loadBaseOptions(flags));

    if (behavior === 'latest') {
      const comment = await c.getComment(behavior);
      if (comment) {
        process.stdout.write(`${stripMarkdownTag(comment.body)}\n`);
      }
    } else {
      await c.postComment(behavior, body);
    }
  }
}
