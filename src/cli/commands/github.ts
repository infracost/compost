import { flags } from '@oclif/command';
import Compost from '../..';
import { GitHubOptions } from '../../platforms/github';
import BaseCommand from '../base';

export default class GitHubCommand extends BaseCommand {
  static description = 'Post a comment to a GitHub pull request/commit';

  static flags = {
    ...BaseCommand.flags,
    'github-token': flags.string({ description: 'GitHub token' }),
    'api-url': flags.string({
      description: 'GitHub API URL',
      default: 'https://api.github.com',
    }),
    owner: flags.string({
      description: 'GitHub owner',
    }),
    repo: flags.string({
      description: 'GitHub repo',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(GitHubCommand);

    const body = this.loadBody(flags);

    const opts: GitHubOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['github-token'],
      apiUrl: flags['api-url'],
      owner: flags.owner,
      repo: flags.repo,
    };

    const { targetType, targetRef, behavior } = this.loadBaseArgs(args);

    const comments = new Compost(opts);
    await comments.postComment('github', targetType, targetRef, behavior, body);
  }
}
