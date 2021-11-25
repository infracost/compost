"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubActionsDetector = void 0;
const tslib_1 = require("tslib");
const fs = (0, tslib_1.__importStar)(require("fs"));
const base_1 = require("./base");
const _1 = require(".");
class GitHubActionsDetector extends base_1.BaseDetector {
    detect() {
        var _a, _b, _c;
        this.logger.debug('Checking for GitHub Actions');
        this.checkEnvVarValue('GITHUB_ACTIONS', 'true');
        const token = this.checkEnvVarExists('GITHUB_TOKEN', true);
        const project = this.checkEnvVarExists('GITHUB_REPOSITORY');
        const apiUrl = process.env.GITHUB_API_URL;
        let targetType;
        let targetRef;
        const eventPath = process.env.GITHUB_EVENT_PATH;
        let event;
        if (eventPath) {
            event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        }
        if (this.shouldDetectTargetType('pull-request') ||
            this.shouldDetectTargetType('merge-request')) {
            targetRef = (_a = event === null || event === void 0 ? void 0 : event.pull_request) === null || _a === void 0 ? void 0 : _a.number;
            if (targetRef) {
                targetType = 'pull-request';
                if (Number.isNaN(targetRef)) {
                    throw new _1.DetectError(`GITHUB_EVENT_PATH pull_request.number is not a valid number`);
                }
            }
        }
        if (!targetRef && this.shouldDetectTargetType('commit')) {
            targetType = 'commit';
            // If the event is a pull request, use the head commit SHA
            // since GITHUB_SHA is the last merge commit on ref branch
            targetRef = (_c = (_b = event === null || event === void 0 ? void 0 : event.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.sha;
            if (!targetRef) {
                targetRef = this.checkEnvVarExists('GITHUB_SHA');
            }
        }
        if (!targetRef) {
            return null;
        }
        return {
            platform: 'github',
            project,
            targetType,
            targetRef,
            token,
            apiUrl,
        };
    }
}
exports.GitHubActionsDetector = GitHubActionsDetector;
