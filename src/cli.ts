#!/usr/bin/env node

import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { postComment } from '.';
import { PostCommentOptions } from './types';

class IntegrationComments extends Command {
  static description = 'describe the command here';

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),

    platform: flags.string({
      description:
        'Set the integration platform, if blank will try to autodetect',
    }),
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
    'github-token': flags.string({ description: 'Github token' }),
    'github-api-url': flags.string({
      description: 'Github API URL',
      default: 'https://api.github.com',
    }),
    'github-repository': flags.string({
      description: 'Github repository in the format owner/repo',
    }),
    'github-pull-request-number': flags.integer({
      description: 'Github repository number',
    }),
  };

  static args = [];

  async run() {
    const { flags } = this.parse(IntegrationComments);

    let { message } = flags;
    if (flags['message-file']) {
      message = fs.readFileSync(flags['message-file'], 'utf8');
    }

    if (!message) {
      this.error('message or message-file is required');
    }

    const opts: PostCommentOptions = {
      platform: flags.platform,
      message,
      tag: flags.tag || 'infracost-integration-comment',
      upsertLatest: flags['upsert-latest'],
      github: {
        token: flags['github-token'],
        apiUrl: flags['github-api-url'],
        repository: flags['github-repository'],
        pullRequestNumber: flags['github-pull-request-number'],
      },
      logger: this,
      errorHandler: this.error,
    };

    await postComment(opts);
  }
}

export = IntegrationComments;
