import { autodetect } from './platforms/autodetect';
import { AzureDevOps } from './platforms/azureDevOps';
import { GitHub } from './platforms/github';
import { GitLab } from './platforms/gitlab';
declare const _default: {
    autodetect: typeof autodetect;
    AzureDevOps: typeof AzureDevOps;
    GitHub: typeof GitHub;
    GitLab: typeof GitLab;
};
export default _default;
export * from './types';
