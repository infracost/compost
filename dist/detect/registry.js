"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectorRegistry = void 0;
const githubActions_1 = require("./githubActions");
const gitlabCi_1 = require("./gitlabCi");
const azureDevOpsPipelines_1 = require("./azureDevOpsPipelines");
// Registry of all detectors
exports.detectorRegistry = [
    {
        displayName: 'GitHub Actions',
        supportedPlatforms: ['github'],
        factory: (opts) => new githubActions_1.GitHubActionsDetector(opts),
    },
    {
        displayName: 'GitLab CI',
        supportedPlatforms: ['gitlab'],
        factory: (opts) => new gitlabCi_1.GitLabCiDetector(opts),
    },
    {
        displayName: 'Azure DevOps Pipelines',
        supportedPlatforms: ['azure-devops', 'github'],
        factory: (opts) => new azureDevOpsPipelines_1.AzureDevOpsPipelinesDetector(opts),
    },
];
