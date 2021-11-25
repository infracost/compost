"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMarkdownTag = exports.markdownTag = exports.stripMarkdownTag = exports.defaultErrorHandler = exports.NullLogger = void 0;
class NullLogger {
    debug() { } // eslint-disable-line class-methods-use-this
    info() { } // eslint-disable-line class-methods-use-this
    warn() { } // eslint-disable-line class-methods-use-this
}
exports.NullLogger = NullLogger;
function defaultErrorHandler(err) {
    throw err;
}
exports.defaultErrorHandler = defaultErrorHandler;
function stripMarkdownTag(body) {
    return body.replace(/^(\[\/\/\]:.*\n)/, '');
}
exports.stripMarkdownTag = stripMarkdownTag;
function markdownTag(s) {
    return `[//]: <> (${s})`;
}
exports.markdownTag = markdownTag;
function addMarkdownTag(s, tag) {
    let comment = s;
    if (tag) {
        comment = `${markdownTag(tag)}\n${comment}`;
    }
    return comment;
}
exports.addMarkdownTag = addMarkdownTag;
