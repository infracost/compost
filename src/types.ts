import { ErrorHandler, Logger } from './util';

export type Platform =
  | 'github'
  | 'gitlab'
  | 'azure-devops'
  | 'azure-devops-github';

export type TargetType = 'pr' | 'mr' | 'commit';

// Pull/merge request number or commit SHA
export type TargetReference = string | number;

export type Behavior = 'update' | 'new' | 'hide_and_new' | 'delete_and_new';

export type DetectorOptions = {
  targetTypes: TargetType[];
  logger?: Logger;
};

export type DetectResult =
  | {
      platform: Platform;
      project: string;
      targetType: TargetType;
      targetRef: TargetReference;
    }
  | null
  | never;

export interface Detector {
  detect(): DetectResult;
}

export type CommentHandlerOptions = {
  tag?: string;
  logger?: Logger;
  errorHandler?: ErrorHandler;
};

export interface CommentHandler {
  updateComment(body: string): Promise<void>;
  newComment(body: string): Promise<void>;
  hideAndNewComment(body: string): Promise<void>;
  deleteAndNewComment(body: string): Promise<void>;
}
