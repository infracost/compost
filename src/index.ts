import { PostCommentOptions, Integration } from "./types";
import GitHubIntegration from "./github";

export const ALL_INTEGRATIONS: Integration[] = [new GitHubIntegration()];

export function getDetectedIntegrations(
  opts: PostCommentOptions
): Integration[] {
  return ALL_INTEGRATIONS.filter(
    (i) => opts.platform === i.name || (!opts.platform && i.isDetected())
  );
}

export function postComment(opts: PostCommentOptions): void {
  const integrations = getDetectedIntegrations(opts);

  for (const integration of integrations) {
    integration.processOpts(opts);
  }

  for (const integration of getDetectedIntegrations(opts)) {
    integration.postComment(opts);
  }
}
