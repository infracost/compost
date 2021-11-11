#!/usr/bin/env node

import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { postComment } from '.';
import { IntegrationOptions, Logger, ActionOptions, Action } from './types';

class IntegrationComments extends Command {
  static description = 'describe the command here';

  static gitHubFlags = {
    'github-token': flags.string({ description: 'Github token' }),
    'github-api-url': flags.string({
      description: 'Github API URL',
      default: 'https://api.github.com',
    }),
    'github-owner': flags.string({
      description: 'Github owner',
    }),
    'github-repo': flags.string({
      description: 'Github repo',
    }),
    'github-pull-request-number': flags.integer({
      description: 'Github repository number',
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

    let integrationOpts: IntegrationOptions;
    let platform: string;

    if (anyFlagSet(IntegrationComments.gitHubFlags, flags)) {
      platform = 'github';

      integrationOpts = {
        token: flags['github-token'],
        apiUrl: flags['github-api-url'],
        owner: flags['github-owner'],
        repo: flags['github-repo'],
        pullRequestNumber: flags['github-pull-request-number'],
      };
    }

    const actionOpts: ActionOptions = {
      platform,
      tag: flags.tag || 'infracost-integration-comment',
      integrationOptions: integrationOpts,
      logger: this.wrapLogger(),
      errorHandler: this.error,
    };

    await postComment(args.action as Action, body, actionOpts);
  }
}

function anyFlagSet(
  flags: flags.Input<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  flagsSet: { [key: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
): boolean {
  for (const [key, value] of Object.entries(flags)) {
    if (flagsSet[key] !== value.default) {
      return true;
    }
  }
  return false;
}

export = IntegrationComments;
