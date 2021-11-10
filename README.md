# WIP: Integration comments

## Build

```sh
npm run build
```

## Run CLI

Export test `GITHUB` env vars
```
export GITHUB_REPOSITORY=owner/repo
export GITHUB_PULL_REQUEST_NUMBER=1
export GITHUB_API_URL=https://api.github.com
export GITHUB_ACTIONS=true
export GITHUB_TOKEN=<TOKEN>
```

```sh
npm link
integration-comments --help
```

or 
```sh
ts-node src/cli.ts --help
```
