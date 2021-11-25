import { CommentHandlerOptions, Comment, DetectResult, TargetReference, TargetType } from '../types';
import { BaseCommentHandler, BasePlatform } from './base';
export declare type AzureDevOpsDetectResult = DetectResult & {
    token: string;
};
declare class AzureDevOpsComment implements Comment {
    selfHref: string;
    body: string;
    createdAt: string;
    constructor(selfHref: string, body: string, createdAt: string);
    ref(): string;
    sortKey(): string;
    isHidden(): boolean;
}
export declare class AzureDevOps extends BasePlatform {
    private handler;
    constructor(project: string, targetType: TargetType, targetRef: TargetReference, token?: string, opts?: CommentHandlerOptions);
    getHandler(): AzureDevOpsHandler;
}
declare abstract class AzureDevOpsHandler extends BaseCommentHandler<AzureDevOpsComment> {
    protected project: string;
    protected token?: string;
    protected repoUrl: string;
    protected repoApiUrl: string;
    constructor(project: string, token?: string, opts?: CommentHandlerOptions);
    static parseRepoApiUrl(repoUrl: string): string;
    protected authHeaders(): {
        Authorization: string;
    };
}
export declare class AzureDevOpsPrHandler extends AzureDevOpsHandler {
    private prNumber;
    constructor(project: string, prNumber: number, token?: string, opts?: CommentHandlerOptions);
    callFindMatchingComments(tag: string): Promise<AzureDevOpsComment[]>;
    callCreateComment(body: string): Promise<AzureDevOpsComment>;
    callUpdateComment(comment: AzureDevOpsComment, body: string): Promise<void>;
    callDeleteComment(comment: AzureDevOpsComment): Promise<void>;
    hideAndNewComment(body: string): Promise<void>;
    callHideComment(): Promise<void>;
}
export {};
