import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import Compost from '../..';
import { AzureDevOpsOptions } from '../../platforms/azureDevOps';
import BaseCommand from '../base';

export default class AzureDevOpsCommand extends BaseCommand {
  static description = 'Post a comment to a Azure DevOps pull request/commit';

  static examples = [
    `• Update a comment on a pull request:
  
   $ compost azure-devops https://dev.azure.com/infracost/base/_git/compost-example pr 3 update --body="my comment"`,
  ];

  static flags = {
    ...BaseCommand.flags,
    'azure-devops-token': flags.string({
      description: 'Azure DevOps PAT token or a base64 encoded bearer token',
    }),
  };

  // fixup the args to specify the project format.
  static fixupBaseArgs(args: args.Input): args.Input {
    return [
      {
        ...args[0],
        description:
          'Repo URL, e.g. https://dev.azure.com/infracost/base/_git/compost-example',
      },
      ...args.slice(1),
    ];
  }

  static args = AzureDevOpsCommand.fixupBaseArgs(BaseCommand.args);

  async run() {
    const { args, flags } = this.parse(AzureDevOpsCommand);

    const body = this.loadBody(flags);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    const opts: AzureDevOpsOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['azure-devops-token'],
    };

    const compost = new Compost(opts);
    await BaseCommand.runCompost(
      compost,
      'azure-devops',
      project,
      targetType,
      targetRef,
      behavior,
      body
    );
  }
}
