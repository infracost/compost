import { ErrorHandler, Logger } from '../util';

export type CommentHandlerOptions = {
  tag: string;
  logger?: Logger;
  errorHandler?: ErrorHandler;
};

export interface CommentHandler {
  updateComment(body: string): Promise<void>;
  newComment(body: string): Promise<void>;
  hideAndNewComment(body: string): Promise<void>;
  deleteAndNewComment(body: string): Promise<void>;
}

export interface Comment {
  body: string;
  ref(): string;
  isHidden(): boolean;
  sortKey(): string;
}
