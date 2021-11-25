"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureDevOpsPipelinesDetector = void 0;
const base_1 = require("./base");
const _1 = require(".");
class AzureDevOpsPipelinesDetector extends base_1.BaseDetector {
    detect() {
        try {
            const result = this.detectAzureDevOps();
            if (result) {
                return result;
            }
        }
        catch (err) {
            if (err.name === _1.DetectError.name) {
                this.logger.debug(err.message);
            }
            else {
                throw err;
            }
        }
        try {
            const result = this.detectGitHub();
            if (result) {
                return result;
            }
        }
        catch (err) {
            if (err.name === _1.DetectError.name) {
                this.logger.debug(err.message);
            }
            else {
                throw err;
            }
        }
        return null;
    }
    detectAzureDevOps() {
        this.logger.debug('Checking for Azure DevOps Pipelines');
        this.checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'TfsGit');
        const token = this.checkEnvVarExists(process.env.SYSTEM_ACCESSTOKEN, true);
        const repo = this.checkEnvVarExists('BUILD_REPOSITORY_URI');
        let targetType;
        let targetRef;
        if (this.shouldDetectTargetType('pull-request') ||
            this.shouldDetectTargetType('merge-request')) {
            if (process.env.SYSTEM_PULLREQUEST_PULLREQUESTID) {
                targetType = 'pull-request';
                targetRef = Number.parseInt(process.env.SYSTEM_PULLREQUEST_PULLREQUESTID, 10);
                if (Number.isNaN(targetRef)) {
                    throw new _1.DetectError(`SYSTEM_PULLREQUEST_PULLREQUESTID environment variable is not a valid number`);
                }
            }
        }
        if (!targetRef) {
            return null;
        }
        return {
            platform: 'azure-devops',
            project: repo,
            targetType,
            targetRef,
            token,
        };
    }
    detectGitHub() {
        this.logger.debug('Checking for Azure DevOps Pipelines (GitHub)');
        this.checkEnvVarValue('BUILD_REPOSITORY_PROVIDER', 'GitHub');
        const token = this.checkEnvVarExists('GITHUB_TOKEN', true);
        const repo = this.checkEnvVarExists('BUILD_REPOSITORY_NAME');
        const apiUrl = process.env.GITHUB_API_URL;
        let targetType;
        let targetRef;
        if (this.shouldDetectTargetType('pull-request') ||
            this.shouldDetectTargetType('merge-request')) {
            if (process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER) {
                targetType = 'pull-request';
                targetRef = Number.parseInt(process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER, 10);
                if (Number.isNaN(targetRef)) {
                    throw new _1.DetectError(`SYSTEM_PULLREQUEST_PULLREQUESTNUMBER environment variable is not a valid number`);
                }
            }
        }
        if (!targetRef) {
            return null;
        }
        return {
            platform: 'azure-devops',
            project: repo,
            targetType,
            targetRef,
            token,
            apiUrl,
        };
    }
}
exports.AzureDevOpsPipelinesDetector = AzureDevOpsPipelinesDetector;