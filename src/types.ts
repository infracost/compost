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
  repository: string;
  pullRequestNumber: number;
};

export type PostCommentOptions = {
  platform?: string;
  message: string;
  tag: string;
  upsertLatest?: boolean;
  logger?: Logger;
  errorHandler?: ErrorHandler;
  github?: GitHubOptions;
};

export interface Integration {
  name: string;
  isDetected(): boolean;
  processEnv(opts: PostCommentOptions): void;
  postComment(options: PostCommentOptions): Promise<void>;
}
