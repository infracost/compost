import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import { GitLab } from '../../platforms/gitlab';
import BaseCommand from '../base';

export default class GitLabCommand extends BaseCommand {
  static description = 'Post a comment to a GitLab merge request/commit';

  static examples = [
    `• Update a comment on a merge request:

   $ compost gitlab update infracost/compost-example mr 3 --body="my comment"`,
  ];

  static flags = {
    ...BaseCommand.flags,
    'gitlab-token': flags.string({ description: 'GitLab token' }),
    'gitlab-server-url': flags.string({
      description: 'GitLab server URL',
      default: 'https://gitlab.com',
    }),
  };

  // fixup the args to use the term 'merge request' instead of 'pull request'.
  static fixupBaseArgs(args: args.Input): args.Input {
    return [
      args[0],
      {
        ...args[1],
        description: 'Whether to post on a merge request or commit',
      },
      {
        ...args[2],
        description: 'The merge request number or commit SHA',
      },
      ...args.slice(3),
    ];
  }

  static args = GitLabCommand.fixupBaseArgs(BaseCommand.args);

  async run() {
    const { args, flags } = this.parse(GitLabCommand);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    let body: string;
    if (behavior !== 'latest') {
      body = this.loadBody(flags);
    }

    const token = flags['gitlab-token'];
    const serverUrl = flags['gitlab-server-url'];

    const c = new GitLab(
      project,
      targetType,
      targetRef,
      token,
      serverUrl,
      this.loadBaseOptions(flags)
    );

    await BaseCommand.handleComment(c, behavior, body);
  }
}
