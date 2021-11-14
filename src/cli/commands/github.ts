import { flags } from '@oclif/command';
import Compost from '../..';
import { GitHubOptions } from '../../platforms/github';
import BaseCommand from '../base';

export default class GitHubCommand extends BaseCommand {
  static description = 'Post a comment to a GitHub pull request/commit';

  static examples = [
    `• Update a comment on a pull request:

   $ compost github infracost/compost-example pr 3 update --body="my comment"
`,

    `• Update a comment on a commit:
    
   $ compost github infracost/compost-example commit 2ca7182 update --body="my comment",`,
  ];

  static flags = {
    ...BaseCommand.flags,
    'github-token': flags.string({ description: 'GitHub token' }),
    'github-api-url': flags.string({
      description: 'GitHub API URL',
      default: 'https://api.github.com',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(GitHubCommand);

    const body = this.loadBody(flags);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    const opts: GitHubOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['github-token'],
      apiUrl: flags['github-api-url'],
    };

    const comments = new Compost(opts);
    await comments.postComment(
      'github',
      project,
      targetType,
      targetRef,
      behavior,
      body
    );
  }
}
