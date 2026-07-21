/**
 * Emit a Vercel Build Output API v3 deployment:
 * - `.vercel/output/static` — Vite web build
 * - `.vercel/output/functions/api/[...route].func` — Node serverless catch-all
 * - `.vercel/output/config.json` — routes (filesystem → API → SPA)
 *
 * App code is bundled with esbuild; `@libsql/*` / `libsql` stay external (native
 * bindings) and are satisfied by copying `node_modules` from
 * `pnpm deploy --legacy` of `@telegraphic/api`.
 */
import * as esbuild from 'esbuild'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webDist = path.join(root, 'apps/web/dist')
const outputRoot = path.join(root, '.vercel', 'output')
const staticOut = path.join(outputRoot, 'static')
const funcDir = path.join(outputRoot, 'functions', 'api', '[...route].func')
const legacyApiDir = path.join(root, 'api')
const deployDir = path.join(os.tmpdir(), `telegraphic-api-deploy-${process.pid}`)

await rm(outputRoot, { recursive: true, force: true })
await rm(deployDir, { recursive: true, force: true })
await mkdir(staticOut, { recursive: true })
await mkdir(funcDir, { recursive: true })
await mkdir(legacyApiDir, { recursive: true })

await cp(webDist, staticOut, { recursive: true })

const deploy = spawnSync(
  'pnpm',
  ['--filter', '@telegraphic/api', 'deploy', '--prod', '--legacy', deployDir],
  { cwd: root, encoding: 'utf8', env: process.env },
)
if (deploy.status !== 0) {
  console.error(deploy.stdout)
  console.error(deploy.stderr)
  throw new Error(`pnpm deploy failed with status ${deploy.status}`)
}

const entry = path.join(root, 'apps/api/src/vercel.ts')
const funcOutfile = path.join(funcDir, 'index.js')
const legacyOutfile = path.join(legacyApiDir, '[...route].js')

await esbuild.build({
  entryPoints: [entry],
  outfile: funcOutfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  logLevel: 'info',
  // Native libsql bindings cannot be bundled; resolve from function node_modules.
  external: ['@libsql/*', 'libsql'],
  footer: {
    js: 'module.exports = module.exports.default || module.exports;',
  },
})

await cp(funcOutfile, legacyOutfile)

// Preserve relative pnpm symlinks inside the copied tree (Node's fs.cp would
// absolutize them to the temp deploy path, which we delete below).
const copyModules = spawnSync(
  'cp',
  ['-a', path.join(deployDir, 'node_modules'), path.join(funcDir, 'node_modules')],
  { encoding: 'utf8' },
)
if (copyModules.status !== 0) {
  console.error(copyModules.stderr)
  throw new Error(`cp node_modules failed with status ${copyModules.status}`)
}

await writeFile(
  path.join(funcDir, '.vc-config.json'),
  `${JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
    },
    null,
    2,
  )}\n`,
)

await writeFile(
  path.join(funcDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
)

await writeFile(
  path.join(legacyApiDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
)

await writeFile(
  path.join(outputRoot, 'config.json'),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '^/api(?:/.*)?$', dest: '/api/[...route]' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  )}\n`,
)

await rm(deployDir, { recursive: true, force: true })

console.log('Emitted Vercel Build Output → .vercel/output')
console.log(`  static:   ${path.relative(root, staticOut)}`)
console.log(`  function: ${path.relative(root, funcDir)}`)
console.log(`  legacy:   ${path.relative(root, legacyOutfile)}`)
