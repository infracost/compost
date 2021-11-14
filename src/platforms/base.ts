import chalk from 'chalk';
import { Comment, CommentHandler, CommentHandlerOptions } from '.';
import { defaultErrorHandler, ErrorHandler, Logger, NullLogger } from '../util';

const defaultTag = 'infracost-integration-comment';

export default abstract class BaseCommentHandler<C extends Comment>
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

  async updateComment(body: string): Promise<void> {
    const bodyWithTag = markdownComment(body, this.tag);

    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
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

  async newComment(body: string): Promise<void> {
    const bodyWithTag = markdownComment(body, this.tag);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  async hideAndNewComment(body: string): Promise<void> {
    const bodyWithTag = markdownComment(body, this.tag);

    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.hidePrComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  async deleteAndNewComment(body: string): Promise<void> {
    const bodyWithTag = markdownComment(body, this.tag);

    this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
    const matchingComments = await this.callFindMatchingComments(
      markdownTag(this.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.deletePrComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.callCreateComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.ref())}`);
  }

  private async deletePrComments(comments: C[]): Promise<void> {
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

  private async hidePrComments(comments: C[]): Promise<void> {
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

  unsupported(message: string): () => never {
    return () => {
      this.errorHandler(message);
      throw new Error(message);
    };
  }
}

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
