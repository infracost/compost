"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectError = void 0;
class DetectError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.DetectError = DetectError;
