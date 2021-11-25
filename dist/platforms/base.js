"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommentHandler = exports.BasePlatform = exports.defaultTag = void 0;
const tslib_1 = require("tslib");
const chalk_1 = (0, tslib_1.__importDefault)(require("chalk"));
const util_1 = require("../util");
exports.defaultTag = 'compost-comment';
class BasePlatform {
    constructor(opts) {
        var _a, _b;
        this.logger = (_a = opts === null || opts === void 0 ? void 0 : opts.logger) !== null && _a !== void 0 ? _a : new util_1.NullLogger();
        this.errorHandler = (_b = opts === null || opts === void 0 ? void 0 : opts.errorHandler) !== null && _b !== void 0 ? _b : util_1.defaultErrorHandler;
    }
    async getComment(behavior) {
        const handler = this.getHandler();
        let comment = null;
        switch (behavior) {
            case 'latest':
                comment = await handler.latestComment();
                break;
            default:
                // This should never happen
                this.errorHandler(`Unknown behavior: ${behavior}`);
        }
        comment = Object.assign(Object.assign({}, comment), { body: (0, util_1.stripMarkdownTag)(comment.body) });
        return comment;
    }
    // Post a comment to the pull/merge request or commit
    async postComment(behavior, body) {
        const handler = this.getHandler();
        switch (behavior) {
            case 'update':
                await handler.updateComment(body);
                break;
            case 'new':
                await handler.newComment(body);
                break;
            case 'hide-and-new':
                await handler.hideAndNewComment(body);
                break;
            case 'delete-and-new':
                await handler.deleteAndNewComment(body);
                break;
            default:
                // This should never happen
                this.errorHandler(`Unknown behavior: ${behavior}`);
        }
    }
}
exports.BasePlatform = BasePlatform;
class BaseCommentHandler {
    constructor(opts) {
        var _a, _b;
        this.opts = opts;
        this.tag = opts.tag || exports.defaultTag;
        this.logger = (_a = opts === null || opts === void 0 ? void 0 : opts.logger) !== null && _a !== void 0 ? _a : new util_1.NullLogger();
        this.errorHandler = (_b = opts === null || opts === void 0 ? void 0 : opts.errorHandler) !== null && _b !== void 0 ? _b : util_1.defaultErrorHandler;
    }
    async latestComment() {
        var _a;
        this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
        const matchingComments = await this.callFindMatchingComments((0, util_1.markdownTag)(this.tag));
        this.logger.info(`Found ${matchingComments.length} matching comment${matchingComments.length === 1 ? '' : 's'}`);
        return ((_a = matchingComments.sort((a, b) => b.sortKey().localeCompare(a.sortKey()))[0]) !== null && _a !== void 0 ? _a : null);
    }
    async updateComment(body) {
        const bodyWithTag = (0, util_1.addMarkdownTag)(body, this.tag);
        const latestMatchingComment = await this.latestComment();
        if (latestMatchingComment) {
            if (bodyWithTag === latestMatchingComment.body) {
                this.logger.info(`Not updating comment since the latest one matches exactly: ${chalk_1.default.blueBright(latestMatchingComment.ref())}`);
                return;
            }
            this.logger.info(`Updating comment ${chalk_1.default.blueBright(latestMatchingComment.ref())}`);
            await this.callUpdateComment(latestMatchingComment, bodyWithTag);
        }
        else {
            this.logger.info('Creating new comment');
            const comment = await this.callCreateComment(bodyWithTag);
            this.logger.info(`Created new comment: ${chalk_1.default.blueBright(comment.ref())}`);
        }
    }
    async newComment(body) {
        const bodyWithTag = (0, util_1.addMarkdownTag)(body, this.tag);
        this.logger.info('Creating new comment');
        const comment = await this.callCreateComment(bodyWithTag);
        this.logger.info(`Created new comment: ${chalk_1.default.blueBright(comment.ref())}`);
    }
    async hideAndNewComment(body) {
        const bodyWithTag = (0, util_1.addMarkdownTag)(body, this.tag);
        this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
        const matchingComments = await this.callFindMatchingComments((0, util_1.markdownTag)(this.tag));
        this.logger.info(`Found ${matchingComments.length} matching comment${matchingComments.length === 1 ? '' : 's'}`);
        await this.hideComments(matchingComments);
        this.logger.info('Creating new comment');
        const comment = await this.callCreateComment(bodyWithTag);
        this.logger.info(`Created new comment: ${chalk_1.default.blueBright(comment.ref())}`);
    }
    async deleteAndNewComment(body) {
        const bodyWithTag = (0, util_1.addMarkdownTag)(body, this.tag);
        this.logger.info(`Finding matching comments for tag \`${this.tag}\``);
        const matchingComments = await this.callFindMatchingComments((0, util_1.markdownTag)(this.tag));
        this.logger.info(`Found ${matchingComments.length} matching comment${matchingComments.length === 1 ? '' : 's'}`);
        await this.deleteComments(matchingComments);
        this.logger.info('Creating new comment');
        const comment = await this.callCreateComment(bodyWithTag);
        this.logger.info(`Created new comment: ${chalk_1.default.blueBright(comment.ref())}`);
    }
    async deleteComments(comments) {
        this.logger.info(`Deleting ${comments.length} comment${comments.length === 1 ? '' : 's'}`);
        const promises = [];
        comments.forEach((comment) => {
            promises.push(new Promise((resolve) => {
                this.logger.info(`Deleting comment ${chalk_1.default.blueBright(comment.ref())}`);
                this.callDeleteComment(comment).then(resolve);
            }));
        });
        await Promise.all(promises);
    }
    async hideComments(comments) {
        const promises = [];
        const visibleComments = comments.filter((comment) => !comment.isHidden());
        if (visibleComments.length !== comments.length) {
            const hiddenCommentCount = comments.length - visibleComments.length;
            this.logger.info(`${hiddenCommentCount} comment${hiddenCommentCount === 1 ? ' is' : 's are'} already hidden`);
        }
        this.logger.info(`Hiding ${visibleComments.length} comment${visibleComments.length === 1 ? '' : 's'}`);
        visibleComments.forEach((comment) => {
            promises.push(new Promise((resolve) => {
                this.logger.info(`Hiding comment ${chalk_1.default.blueBright(comment.ref())}`);
                this.callHideComment(comment).then(resolve);
            }));
        });
        await Promise.all(promises);
    }
}
exports.BaseCommentHandler = BaseCommentHandler;
