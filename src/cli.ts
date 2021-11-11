#!/usr/bin/env node

import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { postComment } from '.';
import { IntegrationOptions, Logger, PostCommentOptions } from './types';

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

    message: flags.string({
      description:
        'Message to post in the comment, mutually exclusive with message-file',
      exclusive: ['message-file'],
    }),
    'message-file': flags.string({
      description:
        'File containing message to post in the comment, mutually exclusive with message',
      exclusive: ['message'],
    }),
    tag: flags.string({
      description:
        'Used with upsert-latest to match the latest comment with the same tag',
      dependsOn: ['upsert-latest'],
    }),
    'upsert-latest': flags.boolean({
      description: 'Upsert the latest comment with the same tag',
    }),
    ...IntegrationComments.gitHubFlags,
  };

  static args = [];

  wrapLogger(): Logger {
    return {
      debug: (...args: any[]) => this.debug(args), // eslint-disable-line @typescript-eslint/no-explicit-any
      info: (message: string, ...args: any[]) => this.log(message, ...args), // eslint-disable-line @typescript-eslint/no-explicit-any
      warn: (message: string) => this.warn(message),
    };
  }

  async run() {
    const { flags } = this.parse(IntegrationComments);

    let { message } = flags;
    if (flags['message-file']) {
      message = fs.readFileSync(flags['message-file'], 'utf8');
    }

    if (!message) {
      this.error('message or message-file is required');
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

    const commentOpts: PostCommentOptions = {
      platform,
      message,
      tag: flags.tag || 'infracost-integration-comment',
      upsertLatest: flags['upsert-latest'],
      integrationOptions: integrationOpts,
      logger: this.wrapLogger(),
      errorHandler: this.error,
    };

    await postComment(commentOpts);
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
