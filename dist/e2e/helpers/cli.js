"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureOutput = exports.suppressOutput = exports.OutputMock = void 0;
class OutputMock {
    constructor() {
        this.stdout = '';
        this.stderr = '';
    }
}
exports.OutputMock = OutputMock;
function suppressOutput() {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
}
exports.suppressOutput = suppressOutput;
/* eslint-disable no-param-reassign */
function captureOutput(out) {
    jest.spyOn(process.stdout, 'write').mockImplementation((v) => {
        out.stdout += v.toString();
        return true;
    });
    jest.spyOn(process.stderr, 'write').mockImplementation((v) => {
        out.stderr += v;
        return true;
    });
}
exports.captureOutput = captureOutput;
/* eslint-enable no-param-reassign */
