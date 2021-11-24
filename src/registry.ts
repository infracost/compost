import { Detector, DetectorOptions } from './types';
import { GitHubActionsDetector } from './detect/githubActions';
import { GitLabCiDetector } from './detect/gitlabCi';
import { AzureDevOpsPipelinesDetector } from './detect/azureDevOpsPipelines';

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
