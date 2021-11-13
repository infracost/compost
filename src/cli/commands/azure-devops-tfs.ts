import { flags } from '@oclif/command';
import IntegrationComments, { Behavior } from '../..';
import { AzureDevOpsTfsOptions } from '../../platforms/azureDevOpsTfs';
import BaseCommand from '../baseCommand';

export default class AzureDevOpsTfs extends BaseCommand {
  static description =
    'Post a comment to a Azure DevOps (TFS) pull request/commit';

  static flags = {
    ...BaseCommand.flags,
    'azure-devops-tfs-token': flags.string({
      description: 'Azure DevOps (TFS) token',
    }),
    'azure-devops-tfs-collection-uri': flags.string({
      description: 'Azure DevOps (TFS) collection URI',
    }),
    'azure-devops-tfs-team-project': flags.string({
      description: 'Azure DevOps (TFS) team project',
    }),
    'azure-devops-tfs-repository-id': flags.string({
      description: 'Azure DevOps (TFS) repository ID',
    }),
    'azure-devops-tfs-pull-request-number': flags.integer({
      description: 'Azure DevOps (TFS) pull request number',
    }),
  };

  static args = BaseCommand.args;

  async run() {
    const { args, flags } = this.parse(AzureDevOpsTfs);

    const body = this.loadBody(flags);

    const opts: AzureDevOpsTfsOptions = {
      ...this.loadBaseOptions(flags),
      token: flags['azure-devops-tfs-token'],
      collectionUri: flags['azure-devops-tfs-collection-uri'],
      teamProject: flags['azure-devops-tfs-team-project'],
      repositoryId: flags['azure-devops-tfs-repository-id'],
      pullRequestNumber: flags['azure-devops-tfs-pull-request-number'],
    };

    const comments = new IntegrationComments(opts);
    await comments.postComment(
      'azure-devops-tfs',
      args.behavior as Behavior,
      body
    );
  }
}
