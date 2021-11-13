import { flags } from '@oclif/command';
import IntegrationComments, { Behavior } from '../..';
import { GitHubOptions } from '../../platforms/github';
import BaseCommand from '../baseCommand';

export default class GitHubCommand extends BaseCommand {
  static description = 'Post a comment to a GitHub pull request/commit';

  static flags = {
    ...BaseCommand.flags,
    'github-token': flags.string({ description: 'GitHub token' }),
    'github-api-url': flags.string({
      description: 'GitHub API URL',
      default: 'https://api.github.com',
    }),
    'github-owner': flags.string({
      description: 'GitHub owner',
    }),
    'github-repo': flags.string({
      description: 'GitHub repo',
    }),
    'github-pull-request-number': flags.integer({
      description: 'GitHub pull request number',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(GitHubCommand);

    const body = this.loadBody(flags);

    const opts: GitHubOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['github-token'],
      apiUrl: flags['github-api-url'],
      owner: flags['github-owner'],
      repo: flags['github-repo'],
      pullRequestNumber: flags['github-pull-request-number'],
    };

    const comments = new IntegrationComments(opts);
    await comments.postComment('github', args.behavior as Behavior, body);
  }
}
