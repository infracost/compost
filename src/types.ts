import { ErrorHandler, Logger } from './util';

export type PlatformName =
  | 'github'
  | 'gitlab'
  | 'azure-devops'
  | 'azure-devops-github';

export type TargetType = 'pull-request' | 'merge-request' | 'commit';

// Pull/merge request number or commit SHA
export type TargetReference = string | number;

export type PostBehavior = 'update' | 'new' | 'hide-and-new' | 'delete-and-new';

export type GetBehavior = 'latest';

export type Behavior = PostBehavior | GetBehavior;

export type DetectorOptions = {
  logger?: Logger;
  targetType?: TargetType;
};

export type DetectResult =
  | {
      platform: PlatformName;
      project: string;
      targetType: TargetType;
      targetRef: TargetReference;
    }
  | null
  | never;

export interface Detector {
  detect(): DetectResult;
}

export interface Comment {
  body: string;
  ref(): string;
  isHidden(): boolean;
  sortKey(): string;
}

export type PlatformOptions = {
  logger?: Logger;
  errorHandler?: ErrorHandler;
};

export interface Platform {
  getHandler(): CommentHandler | never;
  getComment(behavior: GetBehavior): Promise<Comment | null>;
  postComment(behavior: PostBehavior, body: string): Promise<void>;
}

export type CommentHandlerOptions = PlatformOptions & {
  tag?: string;
  dryRun: boolean;
};

export interface CommentHandler {
  updateComment(body: string): Promise<void>;
  newComment(body: string): Promise<void>;
  hideAndNewComment(body: string): Promise<void>;
  deleteAndNewComment(body: string): Promise<void>;
  latestComment(): Promise<Comment | null>;
}
