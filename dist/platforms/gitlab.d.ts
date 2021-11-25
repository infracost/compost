import { CommentHandlerOptions, Comment, DetectResult, TargetReference, TargetType } from '../types';
import { BaseCommentHandler, BasePlatform } from './base';
export declare type GitLabDetectResult = DetectResult & {
    token: string;
    serverUrl: string;
};
declare class GitLabComment implements Comment {
    id: string;
    body: string;
    createdAt: string;
    url: string;
    constructor(id: string, body: string, createdAt: string, url: string);
    ref(): string;
    sortKey(): string;
    isHidden(): boolean;
}
export declare class GitLab extends BasePlatform {
    private handler;
    constructor(project: string, targetType: TargetType, targetRef: TargetReference, token?: string, serverUrl?: string, opts?: CommentHandlerOptions);
    getHandler(): GitLabHandler;
}
declare abstract class GitLabHandler extends BaseCommentHandler<GitLabComment> {
    protected project: string;
    protected token?: string;
    protected serverUrl?: string;
    constructor(project: string, token?: string, serverUrl?: string, opts?: CommentHandlerOptions);
}
export declare class GitLabMrHandler extends GitLabHandler {
    private mrNumber;
    constructor(project: string, mrNumber: number, token?: string, gitlabApiUrl?: string, opts?: CommentHandlerOptions);
    callFindMatchingComments(tag: string): Promise<GitLabComment[]>;
    callCreateComment(body: string): Promise<GitLabComment>;
    callUpdateComment(comment: GitLabComment, body: string): Promise<void>;
    callDeleteComment(comment: GitLabComment): Promise<void>;
    hideAndNewComment(body: string): Promise<void>;
    callHideComment(): Promise<void>;
}
export {};
