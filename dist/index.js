"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const autodetect_1 = require("./platforms/autodetect");
const azureDevOps_1 = require("./platforms/azureDevOps");
const github_1 = require("./platforms/github");
const gitlab_1 = require("./platforms/gitlab");
exports.default = {
    autodetect: autodetect_1.autodetect,
    AzureDevOps: azureDevOps_1.AzureDevOps,
    GitHub: github_1.GitHub,
    GitLab: gitlab_1.GitLab,
};
(0, tslib_1.__exportStar)(require("./types"), exports);
