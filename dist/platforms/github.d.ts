import { Octokit } from 'octokit';
import { CommentHandlerOptions, Comment, DetectResult, TargetReference, TargetType } from '../types';
import { BaseCommentHandler, BasePlatform } from './base';
export declare type GitHubDetectResult = DetectResult & {
    token: string;
    apiUrl?: string;
};
declare class GitHubComment implements Comment {
    globalId: string;
    id: number;
    body: string;
    createdAt: string;
    url: string;
    isMinimized?: boolean;
    constructor(globalId: string, id: number, body: string, createdAt: string, url: string, isMinimized?: boolean);
    ref(): string;
    sortKey(): string;
    isHidden(): boolean;
}
export declare class GitHub extends BasePlatform {
    private handler;
    constructor(project: string, targetType: TargetType, targetRef: TargetReference, token?: string, apiUrl?: string, opts?: CommentHandlerOptions);
    getHandler(): GitHubHandler;
}
declare abstract class GitHubHandler extends BaseCommentHandler<GitHubComment> {
    protected project: string;
    private token?;
    private apiUrl?;
    protected opts?: CommentHandlerOptions;
    protected owner: string;
    protected repo: string;
    protected octokit: Octokit;
    constructor(project: string, token?: string, apiUrl?: string, opts?: CommentHandlerOptions);
}
export declare class GitHubPrHandler extends GitHubHandler {
    private prNumber;
    constructor(project: string, prNumber: number, token?: string, apiUrl?: string, opts?: CommentHandlerOptions);
    callFindMatchingComments(tag: string): Promise<GitHubComment[]>;
    callCreateComment(body: string): Promise<GitHubComment>;
    callUpdateComment(comment: GitHubComment, body: string): Promise<void>;
    callDeleteComment(comment: GitHubComment): Promise<void>;
    callHideComment(comment: GitHubComment): Promise<void>;
}
export declare class GitHubCommitHandler extends GitHubHandler {
    private commitSha;
    constructor(project: string, commitSha: string, token?: string, apiUrl?: string, opts?: CommentHandlerOptions);
    callFindMatchingComments(tag: string): Promise<GitHubComment[]>;
    callCreateComment(body: string): Promise<GitHubComment>;
    callUpdateComment(comment: GitHubComment, body: string): Promise<void>;
    callDeleteComment(comment: GitHubComment): Promise<void>;
    callHideComment(comment: GitHubComment): Promise<void>;
}
export {};
