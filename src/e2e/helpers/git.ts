/* eslint-disable no-console */

import path from 'path';
import os from 'os';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git/promise';

export const templateRepo =
  'git://github.com/infracost/compost-e2e-tests-template.git';
export const branchPrefix = 'e2e-test-';

function generateRandomBranchName(): string {
  return `${branchPrefix}${Math.random().toString(36).substring(7)}`;
}

export default class GitHelper {
  private gitDir: string;

  private git: SimpleGit;

  constructor(
    private repoUrl: string,
    private username: string,
    private token: string
  ) {
    this.gitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compost-e2e-'));
    this.git = simpleGit(this.gitDir);
  }

  async cloneTemplateRepo() {
    console.log(`Cloning ${templateRepo} to ${this.gitDir}`);

    await this.git.clone(templateRepo, this.gitDir, {
      '--origin': 'github',
    });

    this.git.addConfig('user.name', 'Compost E2E tests');
    this.git.addConfig('user.email', 'dev@infracost.io');

    const remoteUrl = new URL(this.repoUrl);
    remoteUrl.username = this.username;
    remoteUrl.password = this.token;

    console.log(`Pushing repo to ${this.repoUrl}`);

    await this.git.addRemote('origin', `${remoteUrl.toString()}`);
    await this.git.push('origin', 'master');
  }

  async createBranch(): Promise<[string, string]> {
    const branch = generateRandomBranchName();

    await this.git.checkoutBranch(branch, 'origin/master');

    fs.writeFileSync(
      path.join(this.gitDir, 'new_file.txt'),
      `Test file for branch ${branch}`
    );
    await this.git.add('new_file.txt');
    await this.git.commit(`Add test file to branch ${branch}`);
    const commit = await this.git.revparse('HEAD');

    await this.git.push('origin', branch);

    return [branch, commit];
  }

  async deleteBranch(branch: string): Promise<void> {
    console.log(`Deleting branch ${branch}`);

    await this.git.checkout('master');
    await this.git.deleteLocalBranch(branch, true);
  }

  async deleteAllBranches(): Promise<void> {
    console.log(`Deleting all test branches`);

    const { branches } = await this.git.branch([
      '--remote',
      '--list',
      'origin/*',
    ]);

    for (const branch of Object.keys(branches)) {
      if (branch.startsWith(branchPrefix)) {
        await this.git.push('origin', branch, ['--delete']);
      }
    }
  }

  async cleanupRepo() {
    console.log(`Deleting ${this.gitDir}`);

    fs.rmSync(this.gitDir, { recursive: true });
  }
}
