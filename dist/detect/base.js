"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDetector = void 0;
const _1 = require(".");
const util_1 = require("../util");
class BaseDetector {
    constructor(opts) {
        var _a;
        this.targetType = opts === null || opts === void 0 ? void 0 : opts.targetType;
        this.logger = (_a = opts === null || opts === void 0 ? void 0 : opts.logger) !== null && _a !== void 0 ? _a : new util_1.NullLogger();
    }
    shouldDetectTargetType(targetType) {
        return !this.targetType || this.targetType === targetType;
    }
    static sanitizeValue(value, isSecret) {
        if (isSecret) {
            return '************';
        }
        return value;
    }
    // Checks and logs if the env variable exists and returns the value if it does
    checkEnvVarExists(name, isSecret) {
        const value = process.env[name];
        if (value === undefined) {
            throw new _1.DetectError(`${name} environment variable is not set`);
        }
        this.logger.debug(`${name} is set to ${BaseDetector.sanitizeValue(value, isSecret)}`);
        return value;
    }
    // Checks and logs if the env variable equals the expected value
    checkEnvVarValue(name, expected, isSecret) {
        const value = this.checkEnvVarExists(name);
        if (value !== expected) {
            throw new _1.DetectError(`${name} environment variable is set to ${BaseDetector.sanitizeValue(value, isSecret)}, not ${expected}`);
        }
    }
}
exports.BaseDetector = BaseDetector;
