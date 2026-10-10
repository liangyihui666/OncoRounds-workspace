import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

// Runs only as part of pnpm build. Output remains generated, never hand-maintained.
const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve('vite/package.json'))
const { build } = viteRequire('esbuild')
const output = resolve('dist/index.html')
let html = await readFile(output, 'utf8')
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)
if (!entry) throw new Error('Missing Vite module entry')
const result = await build({
  entryPoints: [resolve('dist', entry[1])], bundle: true, write: false,
  format: 'iife', platform: 'browser', target: 'es2020', minify: true,
})
const inline = '<script>' + result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script') + '</script>'
html = html.replace(entry[0], '')
// Unlike a module script, an inline classic script must run after #root exists.
html = html.replace('</body>', () => inline + '\n</body>')
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '')
await writeFile(output, html)
console.log('Offline HTML generated: classic bundled script + relative assets.')
