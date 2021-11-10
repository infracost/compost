export type GitHubOptions = {
  token: string;
  apiUrl: string;
  repository: string;
  pullRequestNumber: number;
};

export type PostCommentOptions = {
  platform?: string;
  message: string;
  tag: string;
  upsertLatest?: boolean;
  github?: GitHubOptions;
};

export interface Integration {
  name: string;
  isDetected(): boolean;
  processOpts(opts: PostCommentOptions): void;
  postComment(options: PostCommentOptions): Promise<void>;
}
