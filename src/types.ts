import { ErrorHandler, Logger } from './util';

export type VCS = 'github' | 'gitlab' | 'azure-devops' | 'azure-devops-github';

export type TargetType = 'pr' | 'mr' | 'commit';

// Pull/merge request number or commit SHA
export type TargetReference = string | number;

export type Behavior = 'update' | 'new' | 'hide_and_new' | 'delete_and_new';

export type CommentHandlerOptions = {
  tag: string;
  logger?: Logger;
  errorHandler?: ErrorHandler;
};

export type DetectResult = {
  vcs: VCS;
  project: string;
  targetType: TargetType;
  targetRef: TargetReference;
};

export type DetectFunction = (
  logger?: Logger,
  errorHandler?: ErrorHandler
) => DetectResult | null;

export interface CommentHandler {
  updateComment(body: string): Promise<void>;
  newComment(body: string): Promise<void>;
  hideAndNewComment(body: string): Promise<void>;
  deleteAndNewComment(body: string): Promise<void>;
}
