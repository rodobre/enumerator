import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { promises as fs } from 'fs'
import { ProxyAgent } from 'proxy-agent'

interface Args {
  domain: string
  pathsFile: string
  concurrent: number
  delay: number
  status: string
  method:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'UPDATE'
    | 'DELETE'
    | 'HEAD'
    | 'TRACE'
  useProxy?: boolean
  customScriptFile?: string
  customScriptCode?: string
  proxyAgent?: ProxyAgent
}

const loadCustomScript = async (file: string) => {
  const code = (await fs.readFile(file)).toString('utf-8')
  const transpiler = new Bun.Transpiler({
    loader: 'ts',
  })
  return transpiler.transformSync(code)
}

const evalCustomScript = (customScriptCode: string, args: any) => {
  const parameters = '`' + JSON.stringify(args) + '`'
  return eval(`${customScriptCode};\n\n\ntransformRequest(${parameters})`)
}

async function main() {
  let argv = yargs(hideBin(process.argv))
    .option('domain', {
      alias: 'd',
      describe: 'The domain to enumerate',
      type: 'string',
      demandOption: true,
    })
    .option('pathsFile', {
      alias: 'p',
      describe: 'File path containing paths to check',
      type: 'string',
      demandOption: true,
    })
    .option('concurrent', {
      alias: 'c',
      describe: 'Number of concurrent requests',
      type: 'number',
      default: 5,
    })
    .option('delay', {
      alias: 't',
      describe: 'Delay between requests in milliseconds',
      type: 'number',
      default: 1000,
    })
    .option('status', {
      alias: 's',
      describe: 'Status codes to display results for',
      type: 'string',
      default: '200,204,301,302,307,401,403',
    })
    .option('method', {
      alias: 'm',
      describe: 'Use a custom method (POST, PUT, PATCH, UPDATE, DELETE, etc.)',
      type: 'string',
      default: 'HEAD',
    })
    .option('use-proxy', {
      alias: 'x',
      describe:
        'Use proxies ? (true/false, set `http_proxy` / `https_proxy` / `no_proxy` / etc)\nExample:\nhttp_proxy=http://127.0.0.1:8080 \\ https_proxy=http://127.0.0.1:8080 bun run index.ts ...',
      type: 'boolean',
    })
    .option('customScriptFile', {
      alias: 'f',
      describe: 'Custom script file which defines `transformRequest`',
      type: 'string',
    })
    .parseSync() as Args

  const { pathsFile, customScriptFile, useProxy } = argv

  try {
    const paths = await fs.readFile(pathsFile, 'utf-8')
    const pathList = paths.split('\n')

    if (customScriptFile) {
      console.log('Loading custom script file...')
      argv = {
        ...argv,
        customScriptCode: await loadCustomScript(customScriptFile),
      }
      console.log('Custom script file loaded')
    }

    if (useProxy) {
      argv = { ...argv, proxyAgent: new ProxyAgent() }
    }

    console.log('========= ENUMERATOR =========')
    console.log(
      `Starting enumeration job for domain [${argv.domain}] with [${argv.concurrent} requests, ${argv.delay}ms delay], using word list [${argv.pathsFile}]`
    )

    await enumerateDomain({ ...argv, paths: pathList })
  } catch (error) {
    console.error('Error:', error)
  }
}

async function enumerateDomain({
  domain,
  paths,
  concurrent,
  delay,
  status,
  method,
  customScriptFile,
  customScriptCode,
  proxyAgent,
}: Args & { paths: string[] }) {
  let activeRequests = 0
  let completedRequests = 0
  const totalRequests = paths.length
  const requestQueue: (() => Promise<void>)[] = []
  const acceptStatusCodes = status.split(',').map((status) => parseInt(status))

  // Function to update the status indicator
  const updateStatus = () => {
    const percentage = ((completedRequests / totalRequests) * 100).toFixed(2)
    process.stdout.write(
      `\rProgress: ${completedRequests}/${totalRequests} (${percentage}%)`
    )
  }

  paths.forEach((path) => {
    const request = async () => {
      activeRequests++
      try {
        let options = { method, ...(proxyAgent ? { agent: proxyAgent } : {}) }

        if (customScriptFile) {
          options = {
            ...options,
            ...evalCustomScript(customScriptCode || '', {
              domain,
              concurrent,
              delay,
              status,
              method,
              path,
            }),
          }
        }

        const url = `${domain}/${path[0] === '/' ? path.slice(1) : path}`
        const response = await fetch(url, options)

        if (acceptStatusCodes.includes(response.status)) {
          console.log(`\r\x1b[K[${response.status}] ${domain}/${path}`)
        }
      } catch (error) {
        console.error(`[ERROR] ${domain}/${path}: ${error}`)
      } finally {
        activeRequests--
        completedRequests++
        updateStatus()
        if (requestQueue.length > 0) {
          const nextRequest = requestQueue.shift()
          if (nextRequest) {
            nextRequest()
          }
        }
      }
    }

    if (activeRequests < concurrent) {
      request()
    } else {
      requestQueue.push(request)
    }
  })

  while (activeRequests > 0 || requestQueue.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}

main()
