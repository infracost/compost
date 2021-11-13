import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { OutputFlags } from '@oclif/parser';
import { Logger } from '../util';
import { CommentHandlerOptions } from '../platforms';

export default abstract class BaseCommand extends Command {
  static flags = {
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
  };

  static args = [
    {
      name: 'behavior',
      required: true,
      options: ['update', 'new', 'hide_and_new', 'delete_and_new'],
      description: 'Behavior when posting the comment',
    },
  ];

  private wrapLogger(): Logger {
    return {
      debug: (...args: any[]) => this.debug(args), // eslint-disable-line @typescript-eslint/no-explicit-any
      info: (message: string, ...args: any[]) => this.log(message, ...args), // eslint-disable-line @typescript-eslint/no-explicit-any
      warn: (message: string) => this.warn(message),
    };
  }

  loadBody(flags: OutputFlags<typeof BaseCommand.flags>): string {
    let { body } = flags;

    if (flags['body-file']) {
      body = fs.readFileSync(flags['body-file'], 'utf8');
    }

    if (!body) {
      this.error('body or body-file is required');
    }

    return body;
  }

  loadBaseOptions(
    flags: OutputFlags<typeof BaseCommand.flags>
  ): CommentHandlerOptions {
    return {
      tag: flags.tag,
      logger: this.wrapLogger(),
      errorHandler: this.error,
    };
  }
}
