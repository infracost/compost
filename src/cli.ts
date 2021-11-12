#!/usr/bin/env node

import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { postComment } from '.';
import { PlatformOptions, Logger, ActionOptions, Action } from './types';

class IntegrationComments extends Command {
  static description = 'describe the command here';

  static gitHubFlags = {
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

  static gitLabFlags = {
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

  static azureDevOpsTfsFlags = {
    'azure-devops-tfs-token': flags.string({
      description: 'Azure DevOps TFC token',
    }),
    'azure-devops-tfs-collection-uri': flags.string({
      description: 'Azure DevOps collection URI',
    }),
    'azure-devops-tfs-team-project': flags.string({
      description: 'Azure DevOps team project',
    }),
    'azure-devops-tfs-repository-id': flags.string({
      description: 'Azure DevOps repository ID',
    }),
    'azure-devops-tfs-pull-request-number': flags.integer({
      description: 'Azure DevOps pull request number',
    }),
  };

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),

    body: flags.string({
      description: 'Body of comment to post, mutually exclusive with body-file',
      exclusive: ['body-file'],
    }),
    'body-file': flags.string({
      description:
        'File containing body of comment to post, mutually exclusive with body',
      exclusive: ['body'],
    }),
    tag: flags.string({
      description:
        'Will match any comments with same tag when upserting, hiding or deleting',
    }),
    ...IntegrationComments.gitHubFlags,
    ...IntegrationComments.gitLabFlags,
    ...IntegrationComments.azureDevOpsTfsFlags,
  };

  static args = [
    {
      name: 'action',
      required: true,
      options: ['create', 'upsert', 'hideAndCreate', 'deleteAndCreate'],
      description: 'Method of posting the comment',
    },
  ];

  wrapLogger(): Logger {
    return {
      debug: (...args: any[]) => this.debug(args), // eslint-disable-line @typescript-eslint/no-explicit-any
      info: (message: string, ...args: any[]) => this.log(message, ...args), // eslint-disable-line @typescript-eslint/no-explicit-any
      warn: (message: string) => this.warn(message),
    };
  }

  async run() {
    const { args, flags } = this.parse(IntegrationComments);

    let { body } = flags;
    if (flags['body-file']) {
      body = fs.readFileSync(flags['body-file'], 'utf8');
    }

    if (!body) {
      this.error('body or body-file is required');
    }

    let platformOpts: PlatformOptions;
    let platform: string;

    const hasGitHubFlags = hasAnyFlags(flags, IntegrationComments.gitHubFlags);
    const hasGitLabFlags = hasAnyFlags(flags, IntegrationComments.gitLabFlags);
    const hasAzureDevopsTfsFlags = hasAnyFlags(
      flags,
      IntegrationComments.azureDevOpsTfsFlags
    );

    if (
      [hasGitHubFlags, hasGitLabFlags, hasAzureDevopsTfsFlags].filter(Boolean)
        .length > 1
    ) {
      this.error(
        'Only flags for one integration can be used, e.g. --github-* or --gitlab-*'
      );
    }

    if (hasGitHubFlags) {
      platform = 'github';

      platformOpts = {
        token: flags['github-token'],
        apiUrl: flags['github-api-url'],
        owner: flags['github-owner'],
        repo: flags['github-repo'],
        pullRequestNumber: flags['github-pull-request-number'],
      };
    } else if (hasGitLabFlags) {
      platform = 'gitlab';

      platformOpts = {
        token: flags['gitlab-token'],
        serverUrl: flags['gitlab-server-url'],
        project: flags['gitlab-project'],
        mergeRequestNumber: flags['gitlab-merge-request-number'],
      };
    } else if (hasAzureDevopsTfsFlags) {
      platform = 'azure-devops-tfs';

      platformOpts = {
        token: flags['azure-devops-tfs-token'],
        collectionUri: flags['azure-devops-tfs-collection-uri'],
        teamProject: flags['azure-devops-tfs-team-project'],
        repositoryId: flags['azure-devops-tfs-repository-id'],
        pullRequestNumber: flags['azure-devops-tfs-pull-request-number'],
      };
    }

    const actionOpts: ActionOptions = {
      platform,
      tag: flags.tag || 'infracost-integration-comment',
      platformOptions: platformOpts,
      logger: this.wrapLogger(),
      errorHandler: this.error,
    };

    await postComment(args.action as Action, body, actionOpts);
  }
}

function hasAnyFlags(
  flags: { [key: string]: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  flagSet: flags.Input<any> // eslint-disable-line @typescript-eslint/no-explicit-any
): boolean {
  for (const [key, value] of Object.entries(flagSet)) {
    if (flags[key] !== value.default) {
      return true;
    }
  }
  return false;
}

export = IntegrationComments;
