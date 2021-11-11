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

export type Action = 'create' | 'upsert' | 'hideAndCreate' | 'deleteAndCreate';

export type ActionOptions = {
  platform?: string;
  tag: string;
  logger?: Logger;
  integrationOptions?: IntegrationOptions;
  errorHandler?: ErrorHandler;
};

export type GitHubOptions = {
  token: string;
  apiUrl: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
};

export type GitLabOptions = {
  token: string;
  serverUrl: string;
  project: string;
  mergeRequestNumber: number;
};

export type IntegrationOptions = GitHubOptions | GitLabOptions;

export abstract class Integration {
  static autoDetect(): boolean {
    return false;
  }

  abstract create(body: string, opt: ActionOptions): Promise<void>;

  abstract upsert(body: string, opts: ActionOptions): Promise<void>;

  abstract hideAndCreate(body: string, opts: ActionOptions): Promise<void>;

  abstract deleteAndCreate(body: string, opts: ActionOptions): Promise<void>;
}
