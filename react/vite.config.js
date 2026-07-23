import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const demoSdk = env.JOBBOX_DEMO_SDK || process.env.JOBBOX_DEMO_SDK || 'node'
  const pythonApiUrl =
    env.PYTHON_API_URL || process.env.PYTHON_API_URL || 'http://127.0.0.1:5175'

  const server =
    demoSdk === 'python'
      ? {
          proxy: {
            '/api': {
              target: pythonApiUrl,
              changeOrigin: true,
            },
          },
        }
      : {
          middlewareMode: true,
        }

  return {
    plugins: [react()],
    appType: 'spa',
    server,
  }
})
