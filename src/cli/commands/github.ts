import { flags } from '@oclif/command';
import { GitHub } from '../../platforms/github';
import BaseCommand from '../base';

export default class GitHubCommand extends BaseCommand {
  static description = 'Post a comment to a GitHub pull request/commit';

  static examples = [
    `• Update a comment on a pull request:

   $ compost github update infracost/compost-example pr 3 --body="my comment"
`,
    `• Update a comment on a commit:
    
   $ compost github update infracost/compost-example commit 2ca7182 --body="my comment",`,
  ];

  static flags = {
    ...BaseCommand.flags,
    'github-token': flags.string({
      description: 'GitHub token, defaults to $GITHUB_TOKEN',
    }),
    'github-api-url': flags.string({
      description: 'GitHub API URL, defaults to $GITHUB_API_URL',
      default: process.env.GITHUB_API_URL || 'https://api.github.com',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(GitHubCommand);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    let body: string;
    if (behavior !== 'latest') {
      body = this.loadBody(flags);
    }

    const token = flags['github-token'];
    const apiUrl = flags['github-api-url'];

    const c = new GitHub(
      project,
      targetType,
      targetRef,
      token,
      apiUrl,
      this.loadBaseOptions(flags)
    );

    await BaseCommand.handleComment(c, behavior, body);
  }
}
