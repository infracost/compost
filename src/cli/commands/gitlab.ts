import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import Compost from '../..';
import { GitLabOptions } from '../../platforms/gitlab';
import BaseCommand from '../base';

export default class GitLabCommand extends BaseCommand {
  static description = 'Post a comment to a GitLab merge request/commit';

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
        options: ['mr', 'commit'],
        parse(input: string) {
          return input === 'pr' ? 'mr' : input;
        },
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

    const body = this.loadBody(flags);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    const opts: GitLabOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['gitlab-token'],
      serverUrl: flags['gitlab-server-url'],
    };

    const comments = new Compost(opts);
    await comments.postComment(
      'gitlab',
      project,
      targetType,
      targetRef,
      behavior,
      body
    );
  }
}
