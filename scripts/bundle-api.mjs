/**
 * Bundle the Hono app into a Vercel catch-all serverless function.
 */
import * as esbuild from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'api')

await mkdir(outDir, { recursive: true })

const outfile = path.join(outDir, '[[...route]].js')

await esbuild.build({
  entryPoints: [path.join(root, 'apps/api/src/vercel.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  logLevel: 'info',
})

await writeFile(
  path.join(outDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
)

console.log(`Bundled Vercel API entry → ${path.relative(root, outfile)}`)
