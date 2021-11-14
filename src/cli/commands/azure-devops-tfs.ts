import { flags } from '@oclif/command';
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
    'collection-uri': flags.string({
      description: 'Azure DevOps (TFS) collection URI',
    }),
    'team-project': flags.string({
      description: 'Azure DevOps (TFS) team project',
    }),
    'repository-id': flags.string({
      description: 'Azure DevOps (TFS) repository ID',
    }),
  };

  static args = [
    ...BaseCommand.args,
    {
      name: 'targetType',
      required: true,
      options: ['pr'],
      description: 'Whether to post on a pull request or commit',
    },
    {
      name: 'targetReference',
      required: true,
      description: 'The pull request number or commit SHA ',
    },
  ];

  async run() {
    const { args, flags } = this.parse(AzureDevOpsTfsCommand);

    const body = this.loadBody(flags);

    const opts: AzureDevOpsTfsOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['azure-devops-token'],
      collectionUri: flags['collection-uri'],
      teamProject: flags['team-project'],
      repositoryId: flags['repository-id'],
    };

    const { targetType, targetRef, behavior } = this.loadBaseArgs(args);

    const comments = new Compost(opts);
    await comments.postComment(
      'azure-devops-tfs',
      targetType,
      targetRef,
      behavior,
      body
    );
  }
}
