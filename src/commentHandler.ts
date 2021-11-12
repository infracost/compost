import chalk from 'chalk';
import {
  ActionOptions,
  Comment,
  CommentHandler,
  ErrorHandler,
  Logger,
} from './types';

function markdownTag(s: string) {
  return `[//]: <> (${s})`;
}

function markdownComment(s: string, tag?: string) {
  let comment = s;
  if (tag) {
    comment = `${markdownTag(tag)}\n${comment}`;
  }

  return comment;
}

export default abstract class BaseCommentHandler<C extends Comment>
  implements CommentHandler
{
  constructor(protected logger: Logger, protected errorHandler: ErrorHandler) {}

  static autoDetect(): boolean {
    return false;
  }

  async createComment(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  async upsertComment(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(opts.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    const latestMatchingComment = matchingComments.sort((a, b) =>
      b.sortKey().localeCompare(a.sortKey())
    )[0];

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

  async hideAndCreateComment(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(opts.tag)
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

  async deleteAndCreateComment(
    body: string,
    opts: ActionOptions
  ): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(opts.tag)
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
    this.logger.info(
      `Hiding ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    const visibleComments = comments.filter((comment) => !comment.isHidden);

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
