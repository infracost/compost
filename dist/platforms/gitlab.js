"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabMrHandler = exports.GitLab = void 0;
const tslib_1 = require("tslib");
const axios_1 = (0, tslib_1.__importDefault)(require("axios"));
const base_1 = require("./base");
class GitLabComment {
    constructor(id, body, createdAt, url) {
        this.id = id;
        this.body = body;
        this.createdAt = createdAt;
        this.url = url;
    }
    ref() {
        return this.url;
    }
    sortKey() {
        return this.createdAt;
    }
    // eslint-disable-next-line class-methods-use-this
    isHidden() {
        return false;
    }
}
class GitLab extends base_1.BasePlatform {
    constructor(project, targetType, targetRef, token, serverUrl, opts) {
        super(opts);
        if (targetType === 'commit') {
            this.errorHandler(`Commit target type is not supported for GitLab yet`);
        }
        else {
            this.handler = new GitLabMrHandler(project, targetRef, token, serverUrl, opts);
        }
    }
    getHandler() {
        return this.handler;
    }
}
exports.GitLab = GitLab;
class GitLabHandler extends base_1.BaseCommentHandler {
    constructor(project, token, serverUrl, opts) {
        super(opts);
        this.project = project;
        this.token = token;
        this.serverUrl = serverUrl;
        this.token || (this.token = process.env.GITLAB_TOKEN);
        if (!this.token) {
            this.errorHandler('GitLab token was not specified or could not be detected');
            return;
        }
        this.serverUrl || (this.serverUrl = process.env.CI_SERVER_URL || 'https://gitlab.com');
    }
}
class GitLabMrHandler extends GitLabHandler {
    constructor(project, mrNumber, token, gitlabApiUrl, opts) {
        super(project, token, gitlabApiUrl, opts);
        this.mrNumber = mrNumber;
    }
    async callFindMatchingComments(tag) {
        var _a, _b, _c, _d, _e, _f;
        const allComments = [];
        let after = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const query = `
        query($project: ID!, $mrNumber: String!, $after: String) {
          project(fullPath: $project) {
            mergeRequest(iid: $mrNumber) {
              notes(first: 100, after: $after) {
                nodes {
                  id
                  url
                  createdAt
                  body
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }`;
            const variables = {
                project: this.project,
                mrNumber: this.mrNumber.toString(),
                after,
            };
            const resp = await axios_1.default.post(`${this.serverUrl}/api/graphql`, { query, variables }, { headers: { Authorization: `Bearer ${this.token}` } });
            if (resp.data.errors) {
                this.errorHandler(`Failed to fetch comments: ${JSON.stringify(resp.data.errors)}`);
            }
            const { data } = resp.data;
            after = (_b = (_a = data.project) === null || _a === void 0 ? void 0 : _a.mergeRequest) === null || _b === void 0 ? void 0 : _b.notes.pageInfo.endCursor;
            hasNextPage = (_d = (_c = data.project) === null || _c === void 0 ? void 0 : _c.mergeRequest) === null || _d === void 0 ? void 0 : _d.notes.pageInfo.hasNextPage;
            const comments = (((_f = (_e = data.project) === null || _e === void 0 ? void 0 : _e.mergeRequest) === null || _f === void 0 ? void 0 : _f.notes.nodes) || []).map((c) => new GitLabComment(c.id, c.body, c.createdAt, c.url));
            allComments.push(...comments);
        }
        const matchingComments = allComments.filter((c) => c.body.includes(tag));
        return matchingComments;
    }
    async callCreateComment(body) {
        // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Merge Request ID as well
        const resp = await axios_1.default.post(`${this.serverUrl}/api/v4/projects/${encodeURIComponent(this.project)}/merge_requests/${this.mrNumber}/notes`, { body }, { headers: { Authorization: `Bearer ${this.token}` } });
        const url = `${this.serverUrl}/${this.project}/-/merge_requests/${this.mrNumber}#note_${resp.data.id}`;
        return new GitLabComment(resp.data.id, resp.data.body, resp.data.created_at, url);
    }
    async callUpdateComment(comment, body) {
        const query = `
      mutation($input: UpdateNoteInput!) {
        updateNote(input: $input) {
          clientMutationId
        }
      }`;
        const variables = {
            input: {
                id: comment.id,
                body,
            },
        };
        const resp = await axios_1.default.post(`${this.serverUrl}/api/graphql`, { query, variables }, { headers: { Authorization: `Bearer ${this.token}` } });
        if (resp.data.errors) {
            this.errorHandler(`Failed to update comment: ${JSON.stringify(resp.data.errors)}`);
        }
    }
    async callDeleteComment(comment) {
        const query = `
      mutation($input: DestroyNoteInput!) {
        destroyNote(input: $input) {
          clientMutationId
        }
      }`;
        const variables = {
            input: {
                id: comment.id,
            },
        };
        const resp = await axios_1.default.post(`${this.serverUrl}/api/graphql`, { query, variables }, { headers: { Authorization: `Bearer ${this.token}` } });
        if (resp.data.errors) {
            this.errorHandler(`Failed to delete comment: ${JSON.stringify(resp.data.errors)}`);
        }
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
exports.GitLabMrHandler = GitLabMrHandler;
