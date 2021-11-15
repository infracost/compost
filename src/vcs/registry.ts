import {
  CommentHandler,
  CommentHandlerOptions,
  DetectFunction,
  VCS,
  TargetReference,
  TargetType,
} from '../types';
import {
  AzureDevOpsGitHubPrHandler,
  AzureDevOpsGitHubCommitHandler,
} from './azureDevOpsGitHub';
import {
  AzureDevOpsTfsOptions,
  AzureDevOpsTfsPrHandler,
} from './azureDevOpsTfs';
import { GitHubOptions, GitHubPrHandler, GitHubCommitHandler } from './github';
import { GitLabOptions, GitLabMrHandler } from './gitlab';

type HandlerConfig = {
  displayName: string;
  vcs: VCS;
  supportedTargetTypes: TargetType[];
  handlerFactory: (
    project: string,
    targetRef: TargetReference,
    opts?: CommentHandlerOptions
  ) => CommentHandler;
  detectFunc: DetectFunction;
};

type Registry = HandlerConfig[];

// Registry of all comment handlers.
// Includes a factory to construct it, which vcss
// and target types it supports (pr, mr, commit), and a function for detecting
// it is available.
const registry: Registry = [
  {
    displayName: 'GitHub pull request',
    vcs: 'github',
    supportedTargetTypes: ['pr', 'mr'],
    handlerFactory: (project: string, prNumber: number, opts: GitHubOptions) =>
      new GitHubPrHandler(project, prNumber, opts),
    detectFunc: GitHubPrHandler.detect,
  },
  {
    displayName: 'GitHub commit',
    vcs: 'github',
    supportedTargetTypes: ['commit'],
    handlerFactory: (project: string, commitSha: string, opts: GitHubOptions) =>
      new GitHubCommitHandler(project, commitSha, opts),
    detectFunc: GitHubCommitHandler.detect,
  },
  {
    displayName: 'GitLab merge request',
    vcs: 'gitlab',
    supportedTargetTypes: ['pr', 'mr'],
    handlerFactory: (project: string, mrNumber: number, opts: GitLabOptions) =>
      new GitLabMrHandler(project, mrNumber, opts),
    detectFunc: GitLabMrHandler.detect,
  },
  {
    displayName: 'Azure DevOps (TFS) pull request',
    vcs: 'azure-devops-tfs',
    supportedTargetTypes: ['pr', 'mr'],
    handlerFactory: (
      project: string,
      prNumber: number,
      opts: AzureDevOpsTfsOptions
    ) => new AzureDevOpsTfsPrHandler(project, prNumber, opts),
    detectFunc: AzureDevOpsTfsPrHandler.detect,
  },
  {
    displayName: 'Azure DevOps (GitHub) pull request',
    vcs: 'azure-devops-github',
    supportedTargetTypes: ['pr', 'mr'],
    handlerFactory: (project: string, prNumber: number, opts: GitHubOptions) =>
      new AzureDevOpsGitHubPrHandler(project, prNumber, opts),
    detectFunc: AzureDevOpsGitHubPrHandler.detect,
  },
  {
    displayName: 'Azure DevOps (GitHub) commit',
    vcs: 'azure-devops-github',
    supportedTargetTypes: ['commit'],
    handlerFactory: (project: string, commitSha: string, opts: GitHubOptions) =>
      new AzureDevOpsGitHubCommitHandler(project, commitSha, opts),
    detectFunc: AzureDevOpsGitHubCommitHandler.detect,
  },
];

export default registry;
