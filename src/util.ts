import { Logger } from './types';

export class NullLogger implements Logger {
  debug() {} // eslint-disable-line class-methods-use-this

  info() {} // eslint-disable-line class-methods-use-this

  warn() {} // eslint-disable-line class-methods-use-this
}

export function defaultErrorHandler(err: Error): never {
  throw err;
}

export function markdownTag(s: string) {
  return `[//]: <> (${s})`;
}

export function markdownComment(s: string, tag?: string) {
  let comment = s;
  if (tag) {
    comment = `${markdownTag(tag)}\n${comment}`;
  }

  return comment;
}
