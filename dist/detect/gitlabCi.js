"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabCiDetector = void 0;
const base_1 = require("./base");
const _1 = require(".");
class GitLabCiDetector extends base_1.BaseDetector {
    detect() {
        this.logger.debug('Checking for GitLab CI');
        this.checkEnvVarValue('GITLAB_CI', 'true');
        const token = this.checkEnvVarExists('GITLAB_TOKEN', true);
        const project = this.checkEnvVarExists('CI_PROJECT_PATH');
        const serverUrl = process.env.CI_SERVER_URL;
        let targetType;
        let targetRef;
        if (this.shouldDetectTargetType('pull-request') ||
            this.shouldDetectTargetType('merge-request')) {
            if (process.env.CI_MERGE_REQUEST_IID) {
                targetType = 'merge-request';
                targetRef = Number.parseInt(process.env.CI_MERGE_REQUEST_IID, 10);
                if (Number.isNaN(targetRef)) {
                    throw new _1.DetectError(`CI_MERGE_REQUEST_IID environment variable is not a valid number`);
                }
            }
        }
        if (!targetRef) {
            return null;
        }
        return {
            platform: 'gitlab',
            project,
            targetType,
            targetRef,
            token,
            serverUrl,
        };
    }
}
exports.GitLabCiDetector = GitLabCiDetector;
