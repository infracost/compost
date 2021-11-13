import { flags } from '@oclif/command';
import IntegrationComments, { Behavior } from '../..';
import { GitLabOptions } from '../../platforms/gitlab';
import BaseCommand from '../baseCommand';

export default class GitHubCommand extends BaseCommand {
  static description = 'Post a comment to a GitLab merge request/commit';

  static flags = {
    ...BaseCommand.flags,
    'gitlab-token': flags.string({ description: 'GitLab token' }),
    'gitlab-server-url': flags.string({
      description: 'GitLab server URL',
      default: 'https://github.com',
    }),
    'gitlab-project': flags.string({
      description: 'GitLab project (owner/repo)',
    }),
    'gitlab-merge-request-number': flags.integer({
      description: 'GitLab merge request number',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(GitHubCommand);

    const body = this.loadBody(flags);

    const opts: GitLabOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['gitlab-token'],
      serverUrl: flags['gitlab-server-url'],
      project: flags['gitlab-project'],
      mergeRequestNumber: flags['gitlab-merge-request-number'],
    };

    const comments = new IntegrationComments(opts);
    await comments.postComment('gitlab', args.behavior as Behavior, body);
  }
}
