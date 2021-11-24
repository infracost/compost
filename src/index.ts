import { autodetect } from './platforms/autodetect';
import { AzureDevOps } from './platforms/azureDevOps';
import { GitHub } from './platforms/github';
import { GitLab } from './platforms/gitlab';

export default {
  autodetect,
  GitHub,
  GitLab,
  AzureDevOps,
};
