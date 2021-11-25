import { GitLabDetectResult } from '../platforms/gitlab';
import { BaseDetector } from './base';
export declare class GitLabCiDetector extends BaseDetector {
    detect(): GitLabDetectResult;
}
