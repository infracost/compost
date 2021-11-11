import { Command } from '@oclif/command';
import { PrettyPrintableError } from '@oclif/errors';

export type Logger = Pick<Command, 'warn' | 'log'>;
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
  github?: GitHubOptions;
};

export abstract class Integration {
  static autoDetect(): boolean {
    return false;
  }

  abstract postComment(options: PostCommentOptions): Promise<void>;
}
