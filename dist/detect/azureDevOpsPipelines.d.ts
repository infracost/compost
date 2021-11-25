import { AzureDevOpsDetectResult } from '../platforms/azureDevOps';
import { GitHubDetectResult } from '../platforms/github';
import { BaseDetector } from './base';
export declare class AzureDevOpsPipelinesDetector extends BaseDetector {
    detect(): AzureDevOpsDetectResult | GitHubDetectResult;
    detectAzureDevOps(): AzureDevOpsDetectResult;
    detectGitHub(): GitHubDetectResult;
}
