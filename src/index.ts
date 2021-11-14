import registry from './platforms/registry';
import {
  TargetType,
  TargetReference,
  Behavior,
  CommentHandler,
  DetectResult,
  Platform,
  CommentHandlerOptions,
} from './types';
import { defaultErrorHandler, ErrorHandler, Logger, NullLogger } from './util';

export default class Compost {
  opts: CommentHandlerOptions;

  private logger: Logger;

  private errorHandler: ErrorHandler;

  constructor(opts?: CommentHandlerOptions) {
    this.opts = opts;
    this.logger = opts?.logger ?? new NullLogger();
    this.errorHandler = opts?.errorHandler ?? defaultErrorHandler;
  }

  // Find the comment handler for the given platform and target type and construct it
  private commentHandlerFactory(
    platform: Platform,
    project: string,
    targetType: TargetType,
    targetRef: TargetReference
  ): CommentHandler | null {
    for (const config of registry) {
      if (
        config.platform === platform &&
        config.supportedTargetTypes.includes(targetType)
      ) {
        return config.handlerFactory(project, targetRef, this.opts);
      }
    }

    return null;
  }

  // Detect the current environment
  // Checks all the detect functions and finds the first one that returns a result
  detectEnvironment(targetTypes?: string[]): DetectResult | null {
    for (const config of registry) {
      if (
        targetTypes !== undefined &&
        !config.supportedTargetTypes.some((t) => targetTypes.includes(t))
      ) {
        this.logger.debug(
          `Skipping checking ${config.displayName} since it does not support any of the target types ${targetTypes}`
        );
        continue;
      }

      const result = config.detectFunc(this.logger);
      if (result) {
        this.logger.info(`Detected ${config.displayName}`);
        return result;
      }
    }

    return null;
  }

  // Post a comment to the pull/merge request or commit
  async postComment(
    platform: Platform,
    project: string,
    targetType: TargetType,
    targetRef: TargetReference,
    behavior: Behavior,
    body: string
  ): Promise<void> {
    const handler = this.commentHandlerFactory(
      platform,
      project,
      targetType,
      targetRef
    );

    if (handler === null) {
      this.errorHandler(
        `Unable to find comment handler for platform ${platform}, target type ${targetType}`
      );
    }

    switch (behavior) {
      case 'update':
        await handler.updateComment(body);
        break;
      case 'new':
        await handler.newComment(body);
        break;
      case 'hide_and_new':
        await handler.hideAndNewComment(body);
        break;
      case 'delete_and_new':
        await handler.deleteAndNewComment(body);
        break;
      default:
        // This should never happen
        throw new Error(`Unknown behavior: ${behavior}`);
    }
  }
}
