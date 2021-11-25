import { GitHubDetectResult } from '../platforms/github';
import { BaseDetector } from './base';
export declare class GitHubActionsDetector extends BaseDetector {
    detect(): GitHubDetectResult;
}
