import { Comment, CommentHandler, CommentHandlerOptions, GetBehavior, Platform, PlatformOptions, PostBehavior } from '../types';
import { ErrorHandler, Logger } from '../util';
export declare const defaultTag = "compost-comment";
export declare abstract class BasePlatform implements Platform {
    protected logger: Logger;
    protected errorHandler: ErrorHandler;
    constructor(opts?: PlatformOptions);
    abstract getHandler(): CommentHandler | never;
    getComment(behavior: GetBehavior): Promise<Comment | null>;
    postComment(behavior: PostBehavior, body: string): Promise<void>;
}
export declare abstract class BaseCommentHandler<C extends Comment> implements CommentHandler {
    protected opts?: CommentHandlerOptions;
    protected tag: string;
    protected logger: Logger;
    protected errorHandler: ErrorHandler;
    constructor(opts?: CommentHandlerOptions);
    latestComment(): Promise<C | null>;
    updateComment(body: string): Promise<void>;
    newComment(body: string): Promise<void>;
    hideAndNewComment(body: string): Promise<void>;
    deleteAndNewComment(body: string): Promise<void>;
    private deleteComments;
    private hideComments;
    abstract callFindMatchingComments(tag: string): Promise<C[]>;
    abstract callCreateComment(body: string): Promise<C>;
    abstract callUpdateComment(comment: C, body: string): Promise<void>;
    abstract callHideComment(comment: C): Promise<void>;
    abstract callDeleteComment(comment: C): Promise<void>;
}
