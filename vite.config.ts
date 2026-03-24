import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import type { Plugin, Connect } from 'vite'

/** Inline Cesium plugin — serves Cesium static assets (Workers/Assets/Widgets) in dev */
function cesiumPlugin(): Plugin {
  let cesiumBuildPath = ''

  return {
    name: 'vite:cesium',
    config() {
      const require = createRequire(import.meta.url)
      const cesiumPkgPath = require.resolve('cesium/package.json')
      cesiumBuildPath = path.join(path.dirname(cesiumPkgPath), 'Build', 'Cesium')

      return {
        define: {
          CESIUM_BASE_URL: JSON.stringify('/cesium/'),
        },
      }
    },
    configureServer(server) {
      const mimeTypes: Record<string, string> = {
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.xml': 'application/xml',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
      }

      const handler: Connect.NextHandleFunction = (req, res, next) => {
        if (!req.url?.startsWith('/cesium/')) return next()
        const relativePath = req.url.replace('/cesium/', '')
        const filePath = path.join(cesiumBuildPath, relativePath)
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath)
            if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext])
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cache-Control', 'public, max-age=86400')
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        } catch {
          next()
        }
      }

      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [vue(), cesiumPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5180,
  },
})
