# enumerator

## How to use

```
Options:
      --help              Show help                                    [boolean]
      --version           Show version number                          [boolean]
  -d, --domain            The domain to enumerate            [string] [required]
  -p, --pathsFile         File path containing paths to check[string] [required]
  -c, --concurrent        Number of concurrent requests    [number] [default: 5]
  -t, --delay             Delay between requests in milliseconds
                                                        [number] [default: 1000]
  -s, --status            Status codes to display results for
                               [string] [default: "200,204,301,302,307,401,403"]
  -m, --method            Use a custom method (POST, PUT, PATCH, UPDATE, DELETE,
                          etc.)                       [string] [default: "HEAD"]
  -x, --use-proxy         Use proxies ? (true/false, set `http_proxy` /
                          `https_proxy` / `no_proxy` / etc)
                          Example:
                          http_proxy=http://127.0.0.1:8080 \
                          https_proxy=http://127.0.0.1:8080 bun run index.ts ...
                                                                       [boolean]
  -f, --customScriptFile  Custom script file which defines `transformRequest`
                                                                        [string]
```

An example of a custom script file is `randomIp.ts` where random values for `X-Forwarded-For` are provided.

Standard use would look like this (with lots of common parameters used):

`http_proxy=http://127.0.0.1:8080 https_proxy=http://127.0.0.1:8080 bun run index.ts -c 30 -d https://testtesttest.com -p ~/SecLists/Discovery/Web-Content/common.txt -f randomIp.ts`

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts --help
```

This project was created using `bun init` in bun v1.0.14. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
