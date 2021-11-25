import { ErrorHandler, Logger } from './util';
export declare type PlatformName = 'github' | 'gitlab' | 'azure-devops' | 'azure-devops-github';
export declare type TargetType = 'pull-request' | 'merge-request' | 'commit';
export declare type TargetReference = string | number;
export declare type PostBehavior = 'update' | 'new' | 'hide-and-new' | 'delete-and-new';
export declare type GetBehavior = 'latest';
export declare type Behavior = PostBehavior | GetBehavior;
export declare type DetectorOptions = {
    logger?: Logger;
    targetType?: TargetType;
};
export declare type DetectResult = {
    platform: PlatformName;
    project: string;
    targetType: TargetType;
    targetRef: TargetReference;
} | null | never;
export interface Detector {
    detect(): DetectResult;
}
export interface Comment {
    body: string;
    ref(): string;
    isHidden(): boolean;
    sortKey(): string;
}
export declare type PlatformOptions = {
    logger?: Logger;
    errorHandler?: ErrorHandler;
};
export interface Platform {
    getHandler(): CommentHandler | never;
    getComment(behavior: GetBehavior): Promise<Comment | null>;
    postComment(behavior: PostBehavior, body: string): Promise<void>;
}
export declare type CommentHandlerOptions = PlatformOptions & {
    tag?: string;
};
export interface CommentHandler {
    updateComment(body: string): Promise<void>;
    newComment(body: string): Promise<void>;
    hideAndNewComment(body: string): Promise<void>;
    deleteAndNewComment(body: string): Promise<void>;
    latestComment(): Promise<Comment | null>;
}
