import chalk from 'chalk';
import { ActionOptions, Comment, ErrorHandler, Logger } from './types';

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

export default abstract class Integration {
  constructor(protected logger: Logger, protected errorHandler: ErrorHandler) {}

  static autoDetect(): boolean {
    return false;
  }

  async create(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info('Creating new comment');
    const comment = await this.createComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.url)}`);
  }

  async upsert(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.findMatchingComments(
      markdownTag(opts.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    const latestMatchingComment = matchingComments.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )[0];

    if (latestMatchingComment) {
      if (bodyWithTag === latestMatchingComment.body) {
        this.logger.info(
          `Not updating comment since the latest one matches exactly: ${chalk.blueBright(
            latestMatchingComment.url
          )}`
        );
        return;
      }

      this.logger.info(
        `Updating comment ${chalk.blueBright(latestMatchingComment.url)}`
      );
      await this.updateComment(latestMatchingComment, bodyWithTag);
    } else {
      this.logger.info('Creating new comment');
      const comment = await this.createComment(bodyWithTag);
      this.logger.info(`Created new comment: ${chalk.blueBright(comment.url)}`);
    }
  }

  async hideAndCreate(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.findMatchingComments(
      markdownTag(opts.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.hideComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.createComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.url)}`);
  }

  async deleteAndCreate(body: string, opts: ActionOptions): Promise<void> {
    const bodyWithTag = markdownComment(body, opts.tag);

    this.logger.info(`Finding matching comments for tag \`${opts.tag}\``);
    const matchingComments = await this.findMatchingComments(
      markdownTag(opts.tag)
    );
    this.logger.info(
      `Found ${matchingComments.length} matching comment${
        matchingComments.length === 1 ? '' : 's'
      }`
    );

    await this.deleteComments(matchingComments);

    this.logger.info('Creating new comment');
    const comment = await this.createComment(bodyWithTag);
    this.logger.info(`Created new comment: ${chalk.blueBright(comment.url)}`);
  }

  private async deleteComments(comments: Comment[]): Promise<void> {
    this.logger.info(
      `Deleting ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    comments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.logger.info(`Deleting comment ${chalk.blueBright(comment.url)}`);
          this.deleteComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }

  private async hideComments(comments: Comment[]): Promise<void> {
    this.logger.info(
      `Hiding ${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );

    const promises: Promise<void>[] = [];

    const visibleComments = comments.filter((comment) => !comment.isHidden);

    visibleComments.forEach((comment) => {
      promises.push(
        new Promise((resolve) => {
          this.logger.info(`Hiding comment ${chalk.blueBright(comment.url)}`);
          this.hideComment(comment).then(resolve);
        })
      );
    });

    await Promise.all(promises);
  }

  abstract findMatchingComments(tag: string): Promise<Comment[]>;

  abstract createComment(body: string): Promise<Comment>;

  abstract updateComment(comment: Comment, body: string): Promise<void>;

  abstract hideComment(comment: Comment): Promise<void>;

  abstract deleteComment(comment: Comment): Promise<void>;
}
