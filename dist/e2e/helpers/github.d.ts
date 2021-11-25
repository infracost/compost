import { CommitComment, IssueComment } from '@octokit/graphql-schema';
export declare function loadGitHubTestEnv(): {
    repo: string;
    token: string;
};
export default class GitHubHelper {
    private owner;
    private repo;
    private octokit;
    constructor(fullRepo: string, token: string);
    createRepoIfNotExists(): Promise<void>;
    createBranch(): Promise<[string, string]>;
    createPr(branch: string): Promise<number>;
    getPrComments(prNumber: number, keepMarkdownHeader?: boolean): Promise<IssueComment[]>;
    getCommitComments(commitSha: string, keepMarkdownHeader?: boolean): Promise<CommitComment[]>;
    closePr(prNumber: number): Promise<void>;
    deleteBranch(branch: string): Promise<void>;
    closeAllPrs(): Promise<void>;
    deleteAllBranches(): Promise<void>;
    deleteRepoIfPossible(): Promise<void>;
}
