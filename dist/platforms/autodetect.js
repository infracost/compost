"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autodetect = void 0;
const detect_1 = require("../detect");
const registry_1 = require("../detect/registry");
const util_1 = require("../util");
const azureDevOps_1 = require("./azureDevOps");
const github_1 = require("./github");
const gitlab_1 = require("./gitlab");
function autodetect(opts) {
    var _a, _b;
    const logger = (_a = opts === null || opts === void 0 ? void 0 : opts.logger) !== null && _a !== void 0 ? _a : new util_1.NullLogger();
    const errorHandler = (_b = opts === null || opts === void 0 ? void 0 : opts.errorHandler) !== null && _b !== void 0 ? _b : util_1.defaultErrorHandler;
    let detectResult = null;
    try {
        detectResult = detectEnvironment(logger, opts === null || opts === void 0 ? void 0 : opts.platform, opts === null || opts === void 0 ? void 0 : opts.targetType);
    }
    catch (err) {
        errorHandler(err);
        return null;
    }
    if (!detectResult) {
        errorHandler('Unable to detect current environment');
        return null;
    }
    const { platform, project, targetType, targetRef } = detectResult;
    switch (platform) {
        case 'github':
            return new github_1.GitHub(project, targetType, targetRef, detectResult.token, detectResult.apiUrl, opts);
        case 'gitlab':
            return new gitlab_1.GitLab(project, targetType, targetRef, detectResult.token, detectResult.serverUrl, opts);
        case 'azure-devops':
            return new azureDevOps_1.AzureDevOps(project, targetType, targetRef, detectResult.token, opts);
            break;
        default:
            errorHandler(`Unsupported platform: ${platform}`);
            return null;
    }
}
exports.autodetect = autodetect;
// Detect the current environment
// Checks all the detect functions and finds the first one that returns a result
function detectEnvironment(logger, platform, targetType) {
    for (const config of registry_1.detectorRegistry) {
        if (platform && !config.supportedPlatforms.includes(platform)) {
            continue;
        }
        const detector = config.factory({
            logger,
            targetType,
        });
        let result;
        try {
            result = detector.detect();
        }
        catch (err) {
            if (err.name === detect_1.DetectError.name) {
                logger.debug(err.message);
                continue;
            }
            throw err;
        }
        if (result) {
            logger.info(`Detected ${config.displayName}
  Platform: ${result.platform}
  Project: ${result.project}
  Target type: ${result.targetType}
  Target ref: ${result.targetRef}\n`);
            return result;
        }
    }
    return null;
}
