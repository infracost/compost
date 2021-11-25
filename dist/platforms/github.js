"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubCommitHandler = exports.GitHubPrHandler = exports.GitHub = void 0;
const octokit_1 = require("octokit");
const plugin_retry_1 = require("@octokit/plugin-retry");
const base_1 = require("./base");
const OctokitWithRetries = octokit_1.Octokit.plugin(plugin_retry_1.retry);
class GitHubComment {
    constructor(globalId, id, body, createdAt, url, isMinimized) {
        this.globalId = globalId;
        this.id = id;
        this.body = body;
        this.createdAt = createdAt;
        this.url = url;
        this.isMinimized = isMinimized;
    }
    ref() {
        return this.url;
    }
    sortKey() {
        // Use ID as well if issues were posted in the same second
        return `${this.createdAt} ${this.id}`;
    }
    isHidden() {
        return this.isMinimized;
    }
}
class GitHub extends base_1.BasePlatform {
    constructor(project, targetType, targetRef, token, apiUrl, opts) {
        super(opts);
        if (targetType === 'commit') {
            this.handler = new GitHubCommitHandler(project, targetRef, token, apiUrl, opts);
        }
        else {
            this.handler = new GitHubPrHandler(project, targetRef, token, apiUrl, opts);
        }
    }
    getHandler() {
        return this.handler;
    }
}
exports.GitHub = GitHub;
class GitHubHandler extends base_1.BaseCommentHandler {
    constructor(project, token, apiUrl, opts) {
        super(opts);
        this.project = project;
        this.token = token;
        this.apiUrl = apiUrl;
        this.opts = opts;
        this.token || (this.token = process.env.GITHUB_TOKEN);
        if (!this.token) {
            this.errorHandler('GitHub token was not specified or could not be detected');
            return;
        }
        this.apiUrl || (this.apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com');
        this.octokit = new OctokitWithRetries({
            auth: this.token,
            baseUrl: this.apiUrl,
        });
        const projectParts = project.split('/', 2);
        if (projectParts.length !== 2) {
            this.errorHandler(`Invalid GitHub repository name: ${project}, expecting owner/repo`);
            return;
        }
        [this.owner, this.repo] = projectParts;
    }
}
class GitHubPrHandler extends GitHubHandler {
    constructor(project, prNumber, token, apiUrl, opts) {
        super(project, token, apiUrl, opts);
        this.prNumber = prNumber;
    }
    async callFindMatchingComments(tag) {
        var _a, _b, _c, _d, _e, _f;
        const allComments = [];
        let after = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const data = await this.octokit.graphql(`
        query($repo: String! $owner: String! $prNumber: Int! $after: String) {
          repository(name: $repo owner: $owner) {
            pullRequest(number: $prNumber) {
              comments(first: 100 after: $after) {
                nodes {
                  id
                  databaseId
                  url
                  createdAt
                  publishedAt
                  body
                  isMinimized
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
        `, {
                owner: this.owner,
                repo: this.repo,
                prNumber: this.prNumber,
                after,
            });
            after = (_b = (_a = data.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.comments.pageInfo.endCursor;
            hasNextPage = (_d = (_c = data.repository) === null || _c === void 0 ? void 0 : _c.pullRequest) === null || _d === void 0 ? void 0 : _d.comments.pageInfo.hasNextPage;
            const comments = (((_f = (_e = data.repository) === null || _e === void 0 ? void 0 : _e.pullRequest) === null || _f === void 0 ? void 0 : _f.comments.nodes) || []).map((c) => {
                var _a;
                return new GitHubComment(c.id, c.databaseId, c.body, (_a = c.publishedAt) !== null && _a !== void 0 ? _a : c.createdAt, c.url, c.isMinimized);
            });
            allComments.push(...comments);
        }
        const matchingComments = allComments.filter((c) => c.body.includes(tag));
        return matchingComments;
    }
    async callCreateComment(body) {
        // Use the REST API here. We'd have to do 2 requests for GraphQL to get the Pull Request ID as well
        const resp = await this.octokit.rest.issues.createComment({
            owner: this.owner,
            repo: this.repo,
            issue_number: this.prNumber,
            body,
        });
        return new GitHubComment(resp.data.node_id, resp.data.id, resp.data.body, resp.data.created_at, resp.data.html_url, false);
    }
    async callUpdateComment(comment, body) {
        await this.octokit.graphql(`
      mutation($input: UpdateIssueCommentInput!) {
        updateIssueComment(input: $input) {
          clientMutationId
        }
      }`, {
            input: {
                id: comment.globalId,
                body,
            },
        });
    }
    async callDeleteComment(comment) {
        await this.octokit.graphql(`
      mutation($input: DeleteIssueCommentInput!) { 
        deleteIssueComment(input: $input) {
          clientMutationId
        }
      }
      `, {
            input: {
                id: comment.globalId,
            },
        });
    }
    async callHideComment(comment) {
        await this.octokit.graphql(`
      mutation($input: MinimizeCommentInput!) { 
        minimizeComment(input: $input) {
          clientMutationId
        }
      }
      `, {
            input: {
                subjectId: comment.globalId,
                classifier: 'OUTDATED',
            },
        });
    }
}
exports.GitHubPrHandler = GitHubPrHandler;
// Commit comments aren't supported by the GraphQL API so this class uses the REST API
class GitHubCommitHandler extends GitHubHandler {
    constructor(project, commitSha, token, apiUrl, opts) {
        super(project, token, apiUrl, opts);
        this.commitSha = commitSha;
    }
    async callFindMatchingComments(tag) {
        var _a;
        const allComments = [];
        let after = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const data = await this.octokit.graphql(`
        query($repo: String! $owner: String! $commitSha: GitObjectID! $after: String) {
          repository(name: $repo owner: $owner) {
            object(oid: $commitSha) {
              ... on Commit {
                comments(first: 100 after: $after) {
                  nodes {
                    id
                    databaseId
                    url
                    createdAt
                    publishedAt
                    body
                    isMinimized
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }`, {
                owner: this.owner,
                repo: this.repo,
                commitSha: this.commitSha,
                after,
            });
            const commit = (_a = data.repository) === null || _a === void 0 ? void 0 : _a.object;
            after = commit === null || commit === void 0 ? void 0 : commit.comments.pageInfo.endCursor;
            hasNextPage = commit === null || commit === void 0 ? void 0 : commit.comments.pageInfo.hasNextPage;
            const comments = ((commit === null || commit === void 0 ? void 0 : commit.comments.nodes) || []).map((c) => {
                var _a;
                return new GitHubComment(c.id, c.databaseId, c.body, (_a = c.publishedAt) !== null && _a !== void 0 ? _a : c.createdAt, c.url, c.isMinimized);
            });
            allComments.push(...comments);
        }
        const matchingComments = allComments.filter((c) => c.body.includes(tag));
        return matchingComments;
    }
    async callCreateComment(body) {
        const resp = await this.octokit.rest.repos.createCommitComment({
            owner: this.owner,
            repo: this.repo,
            commit_sha: this.commitSha,
            body,
        });
        return new GitHubComment(resp.data.node_id, resp.data.id, resp.data.body, resp.data.created_at, resp.data.html_url, false);
    }
    async callUpdateComment(comment, body) {
        await this.octokit.rest.repos.updateCommitComment({
            owner: this.owner,
            repo: this.repo,
            comment_id: comment.id,
            body,
        });
    }
    async callDeleteComment(comment) {
        await this.octokit.rest.repos.deleteCommitComment({
            owner: this.owner,
            repo: this.repo,
            comment_id: comment.id,
        });
    }
    async callHideComment(comment) {
        await this.octokit.graphql(`
      mutation($input: MinimizeCommentInput!) { 
        minimizeComment(input: $input) {
          clientMutationId
        }
      }
      `, {
            input: {
                subjectId: comment.globalId,
                classifier: 'OUTDATED',
            },
        });
    }
}
exports.GitHubCommitHandler = GitHubCommitHandler;
