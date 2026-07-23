/**
 * Run Express API proxy + Angular CLI (ng serve) with /api proxy.
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const apiKey = String(process.env.JOBBOX_API_KEY || '').trim()
if (!apiKey) {
  console.error('Missing JOBBOX_API_KEY. Copy .env.example → .env and set your key.')
  process.exit(1)
}

const uiPort = String(process.env.PORT || '5178')
const apiPort = String(process.env.API_PORT || process.env.ANGULAR_API_PORT || '5179')

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

spawnChild(process.execPath, ['server.mjs'], 'api', {
  API_PORT: apiPort,
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
    'proxy.conf.json',
  ],
  'ng-serve',
  {
    API_PORT: apiPort,
  }
)

console.log(`JobBox Angular jobs demo → http://127.0.0.1:${uiPort}`)
console.log(`API proxy                → http://127.0.0.1:${apiPort}`)
