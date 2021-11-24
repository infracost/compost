import { Detector, DetectorOptions, PlatformName } from '../types';
import { GitHubActionsDetector } from './githubActions';
import { GitLabCiDetector } from './gitlabCi';
import { AzureDevOpsPipelinesDetector } from './azureDevOpsPipelines';

type DetectorConfig = {
  displayName: string;
  supportedPlatforms: PlatformName[];
  factory: (opts?: DetectorOptions) => Detector;
};

type DetectorRegistry = DetectorConfig[];

// Registry of all detectors
export const detectorRegistry: DetectorRegistry = [
  {
    displayName: 'GitHub Actions',
    supportedPlatforms: ['github'],
    factory: (opts) => new GitHubActionsDetector(opts),
  },
  {
    displayName: 'GitLab CI',
    supportedPlatforms: ['gitlab'],
    factory: (opts) => new GitLabCiDetector(opts),
  },
  {
    displayName: 'Azure DevOps Pipelines',
    supportedPlatforms: ['azure-devops', 'github'],
    factory: (opts) => new AzureDevOpsPipelinesDetector(opts),
  },
];
