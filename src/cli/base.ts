import fs from 'fs';
import { Command, flags } from '@oclif/command';
import { args, OutputArgs, OutputFlags } from '@oclif/parser';
import { Logger } from '../util';
import { Behavior, TargetReference, TargetType } from '..';
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

  static args: args.Input = [
    {
      name: 'project',
      required: true,
      description: 'Project name in format owner/repo',
    },
    {
      name: 'target_type',
      required: true,
      options: ['pr', 'commit'],
      parse(input: string) {
        return input === 'mr' ? 'pr' : input;
      },
      description: 'Whether to post on a pull request or commit',
    },
    {
      name: 'target_ref',
      required: true,
      description: 'The pull request number or commit SHA',
    },
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

    if (body) {
      return body;
    }

    const bodyFile = flags['body-file'];

    if (!fs.existsSync(bodyFile)) {
      this.error(`body-file ${bodyFile} does not exist`);
    }

    try {
      body = fs.readFileSync(bodyFile, 'utf8');
    } catch (err) {
      this.error(`Error reading body-file: ${err}`);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadBaseArgs(args: OutputArgs<any>): {
    project: string;
    targetType: TargetType;
    targetRef: TargetReference;
    behavior: Behavior;
  } {
    const { project } = args;
    const targetType = args.target_type as TargetType;
    const behavior = args.behavior as Behavior;

    let targetRef: TargetReference = args.target_ref;
    if (targetType === 'pr' || targetType === 'mr') {
      targetRef = parseInt(targetRef as string, 10);
      if (Number.isNaN(targetRef)) {
        this.error(`target_ref must be a number`);
      }
    }

    return {
      project,
      targetType,
      targetRef,
      behavior,
    };
  }
}
