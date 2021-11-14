import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import IntegrationComments from '../..';
import { GitLabOptions } from '../../platforms/gitlab';
import BaseCommand from '../base';

export default class GitLabCommand extends BaseCommand {
  static description = 'Post a comment to a GitLab merge request/commit';

  static flags = {
    ...BaseCommand.flags,
    'gitlab-token': flags.string({ description: 'GitLab token' }),
    'server-url': flags.string({
      description: 'GitLab server URL',
      default: 'https://github.com',
    }),
    project: flags.string({
      description: 'GitLab project (owner/repo)',
    }),
    'merge-request-number': flags.integer({
      description: 'GitLab merge request number',
    }),
  };

  // fixup the args to use the term 'merge request' instead of 'pull request'.
  static fixupBaseArgs(args: args.Input): args.Input {
    return [
      {
        ...args[0],
        options: ['mr', 'commit'],
        parse(input: string) {
          return input === 'pr' ? 'mr' : input;
        },
        description: 'Whether to post on a merge request or commit',
      },
      {
        ...args[1],
        description: 'The merge request number or commit SHA',
      },
      ...args.slice(2),
    ];
  }

  static args = GitLabCommand.fixupBaseArgs(BaseCommand.args);

  async run() {
    const { args, flags } = this.parse(GitLabCommand);

    const body = this.loadBody(flags);

    const opts: GitLabOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['gitlab-token'],
      serverUrl: flags['server-url'],
      project: flags.project,
    };

    const { targetType, targetRef, behavior } = this.loadBaseArgs(args);

    const comments = new IntegrationComments(opts);
    await comments.postComment('gitlab', targetType, targetRef, behavior, body);
  }
}
