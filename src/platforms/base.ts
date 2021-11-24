import chalk from 'chalk';
import {
  Comment,
  CommentHandler,
  CommentHandlerOptions,
  GetBehavior,
  Platform,
  PlatformOptions,
  PostBehavior,
} from '../types';
import {
  addMarkdownTag,
  defaultErrorHandler,
  ErrorHandler,
  Logger,
  markdownTag,
  NullLogger,
  stripMarkdownTag,
} from '../util';

export const defaultTag = 'compost-comment';

export abstract class BasePlatform implements Platform {
  protected logger: Logger;

  protected errorHandler: ErrorHandler;

  constructor(opts?: PlatformOptions) {
    this.logger = opts?.logger ?? new NullLogger();
    this.errorHandler = opts?.errorHandler ?? defaultErrorHandler;
  }

  abstract getHandler(): CommentHandler | never;

  async getComment(behavior: GetBehavior): Promise<Comment | null> {
    const handler = this.getHandler();

    let comment: Comment | null = null;

    switch (behavior) {
      case 'latest':
        comment = await handler.latestComment();
        break;
      default:
        // This should never happen
        this.errorHandler(`Unknown behavior: ${behavior}`);
    }

    comment = {
      ...comment,
      body: stripMarkdownTag(comment.body),
    };

    return comment;
  }

  // Post a comment to the pull/merge request or commit
  async postComment(behavior: PostBehavior, body: string): Promise<void> {
    const handler = this.getHandler();

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
        this.errorHandler(`Unknown behavior: ${behavior}`);
    }
  }
}

export abstract class BaseCommentHandler<C extends Comment>
  implements CommentHandler
{
  protected tag: string;

  protected logger: Logger;

  protected errorHandler: ErrorHandler;

  constructor(protected opts?: CommentHandlerOptions) {
    this.tag = opts.tag || defaultTag;
    this.logger = opts?.logger ?? new NullLogger();
    this.errorHandler = opts?.errorHandler ?? defaultErrorHandler;
  }

  async latestComment(): Promise<C | null> {
    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    return (
      matchingComments.sort((a, b) =>
        b.sortKey().localeCompare(a.sortKey())
      )[0] ?? null
    );
  }

  async updateComment(body: string): Promise<void> {
    const bodyWithTag = addMarkdownTag(body, this.tag);

    const latestMatchingComment = await this.latestComment();

    if (latestMatchingComment) {
      if (bodyWithTag === latestMatchingComment.body) {
        this.logger.info(
          `Not updating comment since the latest one matches exactly: ${chalk.blueBright(
            latestMatchingComment.ref()
          )}`
        );
        return;
      }

      this.logger.info(
        `Updating comment ${chalk.blueBright(latestMatchingComment.ref())}`
      );
      await this.callUpdateComment(latestMatchingComment, bodyWithTag);
    } else {
      this.logger.info('Creating new comment');
      const comment = await this.callCreateComment(bodyWithTag);
      this.logger.info(
        `Created new comment: ${chalk.blueBright(comment.ref())}`
      );
    }
  }

  async newComment(body: string): Promise<void> {
    const bodyWithTag = addMarkdownTag(body, this.tag);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  async hideAndNewComment(body: string): Promise<void> {
    const bodyWithTag = addMarkdownTag(body, this.tag);

    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.hideComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  async deleteAndNewComment(body: string): Promise<void> {
    const bodyWithTag = addMarkdownTag(body, this.tag);

    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.deleteComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  private async deleteComments(comments: C[]): Promise<void> {
    this.logger.info(
      `Deleting ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    comments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.logger.info(
            `Deleting comment ${chalk.blueBright(comment.ref())}`
          );
          this.callDeleteComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }

  private async hideComments(comments: C[]): Promise<void> {
    const promises: Promise<void>[] = [];

    const visibleComments = comments.filter((comment) => !comment.isHidden());

    if (visibleComments.length !== comments.length) {
      const hiddenCommentCount = comments.length - visibleComments.length;
      this.logger.info(
        `${hiddenCommentCount} comment${
          hiddenCommentCount === 1 ? ' is' : 's are'
        } already hidden`
      );
    }

    this.logger.info(
      `Hiding ${visibleComments.length} comment${
        visibleComments.length === 1 ? '' : 's'
      }`
    );

    visibleComments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.logger.info(`Hiding comment ${chalk.blueBright(comment.ref())}`);
          this.callHideComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }

  abstract callFindMatchingComments(tag: string): Promise<C[]>;

  abstract callCreateComment(body: string): Promise<C>;

  abstract callUpdateComment(comment: C, body: string): Promise<void>;

  abstract callHideComment(comment: C): Promise<void>;

  abstract callDeleteComment(comment: C): Promise<void>;
}
