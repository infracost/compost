import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { args, OutputArgs, OutputFlags } from '@oclif/parser';
import { format, inspect } from 'util';
import { IConfig } from '@oclif/config';
import { ErrorHandler, Logger } from '../util';
import {
  CommentHandlerOptions,
  TargetType,
  TargetReference,
  Behavior,
  Platform,
} from '../types';

export default abstract class BaseCommand extends Command {
  protected logger: Logger;

  protected errorHandler: ErrorHandler;

  constructor(argv: string[], config: IConfig) {
    super(argv, config);
    this.logger = this.wrapLogger();
    this.errorHandler = this.error;
  }

  static flags = {
    help: flags.help({ char: 'h', description: 'Show help' }),

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

  static args: args.Input = [
    {
      name: 'behavior',
      description: 'Behavior when posting or retrieving a comment',
      required: true,
      options: ['update', 'new', 'hide-and-new', 'delete-and-new', 'latest'],
    },
    {
      name: 'project',
      description: 'Project name in format owner/repo',
      required: true,
    },
    {
      name: 'target-type',
      description: 'Whether to post on a pull request or commit',
      required: true,
      options: ['pull-request', 'merge-request', 'pr', 'mr', 'commit'],
      parse(val: string): string {
        switch (val) {
          case 'pr':
            return 'pull-request';
          case 'mr':
            return 'merge-request';
          default:
            return val;
        }
      },
    },
    {
      name: 'target-ref',
      description: 'The pull request number or commit SHA',
      required: true,
    },
  ];

  private wrapLogger(): Logger {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return {
      debug: (...args: any[]) => this.debug(args),
      // Overwrite to use stderr instead of stdout
      info(message = '', ...args: any[]): void {
        // eslint-disable-next-line no-param-reassign
        message = typeof message === 'string' ? message : inspect(message);
        process.stderr.write(`${format(message, ...args)}\n`);
      },
      // Overwrite to use stderr instead of stdout
      warn: (message: string) => this.warn(message),
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  protected loadBody(flags: OutputFlags<typeof BaseCommand.flags>): string {
    if (flags.body) {
      return flags.body;
    }

    const bodyFile = flags['body-file'];

    if (!bodyFile) {
      this.errorHandler('body or body-file is required');
    }

    if (!fs.existsSync(bodyFile)) {
      this.errorHandler(`body-file ${bodyFile} does not exist`);
    }

    try {
      return fs.readFileSync(bodyFile, 'utf8');
    } catch (err) {
      this.errorHandler(`Error reading body-file: ${err}`);
    }

    return '';
  }

  protected loadBaseOptions(
    flags: OutputFlags<typeof BaseCommand.flags>
  ): CommentHandlerOptions {
    return {
      tag: flags.tag,
      logger: this.logger,
      errorHandler: this.errorHandler,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected loadBaseArgs(args: OutputArgs<any>): {
    project: string;
    targetType: TargetType;
    targetRef: TargetReference;
    behavior: Behavior;
  } {
    const { project } = args;
    const targetType = args['target-type'] as TargetType;
    const behavior = args.behavior as Behavior;

    let targetRef: TargetReference = args['target-ref'];
    if (targetType === 'pull-request' || targetType === 'merge-request') {
      targetRef = parseInt(targetRef as string, 10);
      if (Number.isNaN(targetRef)) {
        this.errorHandler(`target-ref must be a number`);
      }
    }

    return {
      project,
      targetType,
      targetRef,
      behavior,
    };
  }

  protected static async handleComment(
    platform: Platform,
    behavior: Behavior,
    body: string
  ): Promise<void> {
    if (behavior === 'latest') {
      const comment = await platform.getComment(behavior);
      if (comment) {
        process.stdout.write(`${comment.body}\n`);
      }
    } else {
      await platform.postComment(behavior, body);
    }
  }
}
