# Compost

**WIP**

Compost (WIP name) is for tools that run in CI pipelines and want to post results as pull request/commit comments.

It currently detects the following CI environments:
* GitHub Actions
* GitLab CI (merge requests only)
* Azure DevOps (TFS)
* Azure DevOps (GitHub)

Coming soon:
* GitLab CI (commits)
* BitBucket
* Circle CI (GitHub)
* CircleCI (BitBucket)

## Install

```sh
git clone git@github.com:infracost/compost.git
npm install
npm link
```

## Examples

Detect the current CI environment and update the previously posted comment. If a previous comment hasn't been posted, then this creates a new comment:

```sh
compost autodetect update --body="my comment"
```

Post a new comment:

```sh
compost autodetect new --body="my new comment"
```

Delete the previous posted comments and post a new comment:

```sh
compost autodetect delete_and_new --body="my new comment"
```

Hide the previous posted comments and post a new comment (**Note:** Currently only supported for GitHub):

```sh
compost autodetect hide_and_new --body="my new comment"
```

Post a comment to a specific GitHub pull request:

```sh
compost github infracost/compost-example pr 3 --body="my PR comment"
```

Post a comment to a specific GitHub commit SHA:

```sh
compost github infracost/compost-example commit 2ca7182 --body="my commit comment"
```

## Flags

| Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|-|-|
| `--body` | Specify the comment body content.
| `--body-file` | Specify a path to a file containing the comment body. Mutually exclusive with `--body`.
| `--tag` | Customize the comment tag. This is added to the comment as a markdown comment to detect the previously posted comments. |
| `--target-type` | Options: `pr`, `mr`, `commit`. Only supported by `autodetect` command. Limit the auto-detection to add the comment to either pull/merge requests or commits. |

