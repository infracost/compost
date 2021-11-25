"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureDevOpsPrHandler = exports.AzureDevOps = void 0;
const tslib_1 = require("tslib");
const axios_1 = (0, tslib_1.__importDefault)(require("axios"));
const base_1 = require("./base");
const patTokenLength = 52;
class AzureDevOpsComment {
    constructor(selfHref, body, createdAt) {
        this.selfHref = selfHref;
        this.body = body;
        this.createdAt = createdAt;
    }
    // Azure DevOps doesn't allow you to have comment links in the browser
    ref() {
        return this.selfHref;
    }
    sortKey() {
        return this.createdAt;
    }
    // eslint-disable-next-line class-methods-use-this
    isHidden() {
        return false;
    }
}
class AzureDevOps extends base_1.BasePlatform {
    constructor(project, targetType, targetRef, token, opts) {
        super(opts);
        if (targetType === 'commit') {
            this.errorHandler(`Commit target type is not supported by Azure DevOps`);
        }
        else {
            this.handler = new AzureDevOpsPrHandler(project, targetRef, token, opts);
        }
    }
    getHandler() {
        return this.handler;
    }
}
exports.AzureDevOps = AzureDevOps;
class AzureDevOpsHandler extends base_1.BaseCommentHandler {
    constructor(project, token, opts) {
        super(opts);
        this.project = project;
        this.token = token;
        this.token || (this.token = process.env.AZURE_DEVOPS_EXT_PAT);
        if (!this.token) {
            this.errorHandler('Azure DevOps token was not specified or could not be detected');
        }
        try {
            this.repoApiUrl = AzureDevOpsHandler.parseRepoApiUrl(project);
        }
        catch (err) {
            this.errorHandler(err.message);
        }
    }
    // Convert the Azure DevOps repo URL to an API URL
    static parseRepoApiUrl(repoUrl) {
        const parts = repoUrl.split('_git/');
        if (parts.length !== 2) {
            throw new Error(`Invalid repo URL format ${repoUrl}. Expected https://dev.azure.com/org/project/_git/repo/.`);
        }
        let url = `${parts[0]}_apis/git/repositories/${parts[1]}`;
        if (!url.endsWith('/')) {
            url += '/';
        }
        return url;
    }
    authHeaders() {
        let val = `Bearer ${this.token}`;
        const isPat = this.token.length === patTokenLength;
        if (isPat) {
            val = `Basic ${Buffer.from(`:${this.token}`).toString('base64')}`;
        }
        return {
            Authorization: val,
        };
    }
}
class AzureDevOpsPrHandler extends AzureDevOpsHandler {
    constructor(project, prNumber, token, opts) {
        super(project, token, opts);
        this.prNumber = prNumber;
    }
    async callFindMatchingComments(tag) {
        const resp = await axios_1.default.get(`${this.repoApiUrl}pullRequests/${this.prNumber}/threads?api-version=6.0`, {
            headers: this.authHeaders(),
        });
        // This plugin only creates comments at the top-level of threads,
        // so we can always just pull the first comment in the thread
        const topLevelComments = [];
        for (const thread of resp.data.value) {
            if (thread.isDeleted) {
                continue;
            }
            for (const comment of thread.comments) {
                if (comment.isDeleted) {
                    continue;
                }
                topLevelComments.push(new AzureDevOpsComment(comment._links.self.href, // eslint-disable-line no-underscore-dangle
                comment.content, comment.publishedDate));
                break;
            }
        }
        const matchingComments = topLevelComments.filter((c) => c.body.includes(tag));
        return matchingComments;
    }
    async callCreateComment(body) {
        const resp = await axios_1.default.post(`${this.repoApiUrl}pullRequests/${this.prNumber}/threads?api-version=6.0`, {
            comments: [
                {
                    content: body,
                    parentCommentId: 0,
                    commentType: 1,
                },
            ],
            status: 4,
        }, {
            headers: this.authHeaders(),
        });
        if (resp.data.comments.length === 0) {
            // This error should never happen because we are creating the thread with a comment
            const err = 'Failed to create new thread: empty comment list';
            this.errorHandler(err);
            throw err;
        }
        const firstComment = resp.data.comments[0];
        return new AzureDevOpsComment(firstComment._links.self.href, // eslint-disable-line no-underscore-dangle
        firstComment.content, firstComment.publishedDate);
    }
    async callUpdateComment(comment, body) {
        await axios_1.default.patch(`${comment.selfHref}?api-version=6.0`, {
            content: body,
            parentCommentId: 0,
            commentType: 1,
        }, {
            headers: this.authHeaders(),
        });
    }
    async callDeleteComment(comment) {
        await axios_1.default.delete(`${comment.selfHref}?api-version=6.0`, {
            headers: this.authHeaders(),
        });
    }
    async hideAndNewComment(body) {
        this.logger.warn('Hiding comments is not supported by GitLab');
        await this.newComment(body);
    }
    async callHideComment() {
        // Shouldn't get here
        this.errorHandler('Not implemented');
    }
}
exports.AzureDevOpsPrHandler = AzureDevOpsPrHandler;
