# Compost

**WIP**

Compost is for tools that run in CI pipelines and want to post results as pull request/commit comments.

It currently detects the following CI environments:
* GitHub Actions
* GitLab CI
* Azure DevOps (TFS)

Coming soon:
* Azure DevOps (GitHub)
* BitBucket
* Circle CI (GitHub)
* CircleCI (BitBucket)

## Install

```sh
npm install -g git://github.com/infracost/compost.git
```

## Examples

Detect the current CI environment and update the previously posted comment. If a previous comment hasn't been posted, then this creates a new comment.

```sh
compost autodetect update --body="my comment"
```

Detect the current CI environment and post a new comment.

```sh
compost autodetect new --body="my new comment"
```

Detect the current CI environment, delete the previous posted comments and post a new comment.

```sh
compost autodetect delete_and_new --body="my new comment"
```

Detect the current CI environment, hide the previous posted comments and post a new comment.
**Note:** Currently only supported for GitHub.

```sh
compost autodetect hide_and_new --body="my new comment"
```

Post a comment to a specific GitHub pull request

```sh
compost github infracost/compost-example pr 3 --body="my PR comment"
```

Post a comment to a specific GitHub commit SHA

```sh
compose github infracost/compost-example commit 2ce7122 --body="my commit comment"
```

## Flags

| Name | Description |
|-|-|
| `--body` | Specify the comment body content.
| `--body-file` | Specify a path to a file containing the comment body. Mutually exclusive with `--body`.
| `--tag` | Customize the comment tag. This is added to the comment as a markdown comment to detect the previously posted comments. |
| `--target-type` | Options: `pr`, `mr`, `commit`. Only supported by `autodetect` command. Limit the auto-detection to add the comment to either pull/merge requests or commits. |




