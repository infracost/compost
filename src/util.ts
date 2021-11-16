import { PrettyPrintableError } from '@oclif/errors';

export interface Logger {
  debug(message?: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  info(message: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  warn(message: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type ErrorHandler = (
  input: string | Error,
  options?: {
    code?: string;
    exit: false;
  } & PrettyPrintableError
) => void | never;

export class NullLogger implements Logger {
  debug() {} // eslint-disable-line class-methods-use-this

  info() {} // eslint-disable-line class-methods-use-this

  warn() {} // eslint-disable-line class-methods-use-this
}

export function defaultErrorHandler(err: Error): never {
  throw err;
}

export function stripMarkdownTag(body: string): string {
  return body.replace(/^(\[\/\/\]:.*\n)/, '');
}

export function markdownTag(s: string) {
  return `[//]: <> (${s})`;
}

export function addMarkdownTag(s: string, tag?: string) {
  let comment = s;
  if (tag) {
    comment = `${markdownTag(tag)}\n${comment}`;
  }

  return comment;
}
