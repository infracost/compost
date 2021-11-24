import { Detector, DetectorOptions } from '../types';
import { GitHubActionsDetector } from './githubActions';
import { GitLabCiDetector } from './gitlabCi';
import { AzureDevOpsPipelinesDetector } from './azureDevOpsPipelines';

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
