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

export type GitHubOptions = {
  token: string;
  apiUrl: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
};

export type IntegrationOptions = GitHubOptions;

export type PostCommentOptions = {
  platform?: string;
  message: string;
  tag: string;
  upsertLatest?: boolean;
  logger?: Logger;
  integrationOptions?: IntegrationOptions;
  errorHandler?: ErrorHandler;
};

export abstract class Integration {
  static autoDetect(): boolean {
    return false;
  }

  abstract postComment(options: PostCommentOptions): Promise<void>;
}
