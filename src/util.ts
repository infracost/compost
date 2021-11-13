import { PrettyPrintableError } from '@oclif/errors';

export interface Logger {
  debug(message?: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  info(message?: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  warn(message?: string, ...args: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any
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
