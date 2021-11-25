#!/usr/bin/env node
"use strict";
/* eslint-disable no-console */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const github_1 = (0, tslib_1.__importStar)(require("./helpers/github"));
async function cleanup() {
    const env = (0, github_1.loadGitHubTestEnv)();
    const { repo, token } = env;
    const gh = new github_1.default(repo, token);
    console.log(`Cleaning up repo ${repo}`);
    await gh.closeAllPrs();
    await gh.deleteAllBranches();
    await gh.deleteRepoIfPossible();
    console.log(`Done`);
}
cleanup().catch((err) => {
    console.error(err);
    process.exit(1);
});
