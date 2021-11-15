import {
  CommentHandler,
  CommentHandlerOptions,
  Detector,
  DetectorOptions,
  Platform,
  TargetReference,
  TargetType,
} from './types';
import {
  AzureDevOpsOptions,
  AzureDevOpsPrHandler,
} from './platforms/azureDevOps';
import {
  GitHubOptions,
  GitHubPrHandler,
  GitHubCommitHandler,
} from './platforms/github';
import { GitLabOptions, GitLabMrHandler } from './platforms/gitlab';
import { GitHubActionsDetector } from './detect/githubActions';
import { GitLabCiDetector } from './detect/gitlabCi';
import { AzureDevOpsPipelinesDetector } from './detect/azureDevOpsPipelines';

type CommentHandlerConfig = {
  displayName: string;
  platform: Platform;
  supportedTargetTypes: TargetType[];
  factory: (
    project: string,
    targetRef: TargetReference,
    opts?: CommentHandlerOptions
  ) => CommentHandler;
};

type CommentHandlerRegistry = CommentHandlerConfig[];

type DetectorConfig = {
  displayName: string;
  factory: (opts?: DetectorOptions) => Detector;
};

type DetectorRegistry = DetectorConfig[];

// Registry of all detectors
export const detectorRegistry: DetectorRegistry = [
  {
    displayName: 'GitHub Actions',
    factory: (opts) => new GitHubActionsDetector(opts),
  },
  {
    displayName: 'GitLab CI',
    factory: (opts) => new GitLabCiDetector(opts),
  },
  {
    displayName: 'Azure DevOps Pipelines',
    factory: (opts) => new AzureDevOpsPipelinesDetector(opts),
  },
];

// Registry of all comment handlers.
// Includes a factory to construct it, which platform
// and target types it supports (pr, mr, commit)
export const commentHandlerRegistry: CommentHandlerRegistry = [
  {
    displayName: 'GitHub pull request',
    platform: 'github',
    supportedTargetTypes: ['pr'],
    factory: (project, prNumber: number, opts?: GitHubOptions) =>
      new GitHubPrHandler(project, prNumber, opts),
  },
  {
    displayName: 'GitHub commit',
    platform: 'github',
    supportedTargetTypes: ['commit'],
    factory: (project, commitSha: string, opts?: GitHubOptions) =>
      new GitHubCommitHandler(project, commitSha, opts),
  },
  {
    displayName: 'GitLab merge request',
    platform: 'gitlab',
    supportedTargetTypes: ['pr', 'mr'],
    factory: (project, mrNumber: number, opts?: GitLabOptions) =>
      new GitLabMrHandler(project, mrNumber, opts),
  },
  {
    displayName: 'Azure DevOps pull request',
    platform: 'azure-devops',
    supportedTargetTypes: ['pr'],
    factory: (project, prNumber: number, opts?: AzureDevOpsOptions) =>
      new AzureDevOpsPrHandler(project, prNumber, opts),
  },
];
