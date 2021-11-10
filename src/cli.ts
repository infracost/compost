#!/usr/bin/env node

import fs from "fs";
import yargs from "yargs";
import { postComment } from ".";
import { PostCommentOptions } from "./types";

async function parseArgs(): Promise<PostCommentOptions> {
  const argv = await yargs.options({
    platform: {
      describe: "Set the integration platform, if blank will try to autodetect",
      type: "string",
    },
    message: {
      describe:
        "Message to post in the comment, mutually exclusive with message-file",
      type: "string",
    },
    "message-file": {
      describe:
        "File containing the message to post in the comment, mutually exclusive with message",
      type: "string",
    },
    tag: {
      describe:
        "Used with upsert-latest to match the latest comment with the same tag",
      type: "string",
    },
    "upsert-latest": {
      describe: "Upsert the latest comment matching the match regex",
      type: "boolean",
    },
    "github-token": {
      describe: "GitHub token",
      type: "string",
    },
    "github-api-url": {
      describe: "GitHub API URL",
      type: "string",
    },
    "github-repository": {
      describe: "GitHub repository",
      type: "string",
    },
    "github-pull-request-number": {
      describe: "GitHub pull request number",
      type: "number",
    },
  }).argv;

  if (!argv.message && !argv["message-file"]) {
    throw new Error("message or message-file is required");
  }

  if (argv.message && argv["message-file"]) {
    throw new Error("message and message-file are mutually exclusive");
  }

  let { message } = argv;
  if (argv["message-file"]) {
    message = fs.readFileSync(argv["message-file"], "utf8");
  }

  return {
    platform: argv.platform,
    message,
    tag: argv.tag || "infracost-integration-comment",
    upsertLatest: argv["upsert-latest"],
    github: {
      token: argv["github-token"],
      apiUrl: argv["github-api-url"],
      repository: argv["github-repository"],
      pullRequestNumber: argv["github-pull-request-number"],
    },
  };
}

async function main() {
  const options = await parseArgs();
  await postComment(options);
}

main().catch((err) => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1);
});
