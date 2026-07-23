/**
 * Run Angular (ng serve) + Python getjobbox API proxy.
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const apiKey = String(process.env.JOBBOX_API_KEY || '').trim()
if (!apiKey) {
  console.error('Missing JOBBOX_API_KEY. Copy .env.example → .env and set your key.')
  process.exit(1)
}

const uiPort = String(process.env.PORT || '5178')
const apiHost = process.env.PYTHON_API_HOST || '127.0.0.1'
const apiPort = String(process.env.PYTHON_API_PORT || '5179')
const apiUrl = `http://${apiHost}:${apiPort}`

const proxyPath = path.join(root, 'proxy.python.conf.json')
writeFileSync(
  proxyPath,
  JSON.stringify(
    {
      '/api': {
        target: apiUrl,
        secure: false,
        changeOrigin: true,
        logLevel: 'silent',
      },
    },
    null,
    2
  )
)

const pythonBin = process.env.PYTHON || process.env.PYTHON_BIN || 'python3'
const children = []
let shuttingDown = false

function spawnChild(command, args, label, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[${label}] exited (code=${code}, signal=${signal})`)
    shutdown(code || 1)
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 200).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

spawnChild(pythonBin, ['server.py'], 'python-api', {
  PYTHON_API_HOST: apiHost,
  PYTHON_API_PORT: apiPort,
})

spawnChild(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'ng',
    'serve',
    '--host',
    '127.0.0.1',
    '--port',
    uiPort,
    '--proxy-config',
    'proxy.python.conf.json',
  ],
  'ng-serve'
)

console.log(`JobBox Angular jobs demo (Python SDK) → http://127.0.0.1:${uiPort}`)
console.log(`Python API proxy                      → ${apiUrl}`)
