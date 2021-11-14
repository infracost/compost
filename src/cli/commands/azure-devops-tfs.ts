import { flags } from '@oclif/command';
import { args } from '@oclif/parser';
import Compost from '../..';
import { AzureDevOpsTfsOptions } from '../../platforms/azureDevOpsTfs';
import BaseCommand from '../base';

export default class AzureDevOpsTfsCommand extends BaseCommand {
  static description =
    'Post a comment to a Azure DevOps (TFS) pull request/commit';

  static flags = {
    ...BaseCommand.flags,
    'azure-devops-token': flags.string({
      description: 'Azure DevOps token',
    }),
    'azure-devops-server-url': flags.string({
      description: 'Azure DevOps server URL',
      default: 'https://dev.azure.com',
    }),
  };

  // fixup the args to specify the project format.
  static fixupBaseArgs(args: args.Input): args.Input {
    return [
      {
        ...args[0],
        description: 'Project name in format org/teamProject/repo',
      },
      ...args.slice(1),
    ];
  }

  static args = AzureDevOpsTfsCommand.fixupBaseArgs(BaseCommand.args);

  async run() {
    const { args, flags } = this.parse(AzureDevOpsTfsCommand);

    const body = this.loadBody(flags);

    const { project, targetType, targetRef, behavior } =
      this.loadBaseArgs(args);

    const opts: AzureDevOpsTfsOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['azure-devops-token'],
      serverUrl: flags['azure-devops-server-url'],
    };

    const comments = new Compost(opts);
    await comments.postComment(
      'azure-devops-tfs',
      project,
      targetType,
      targetRef,
      behavior,
      body
    );
  }
}
