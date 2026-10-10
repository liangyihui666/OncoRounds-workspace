const fs = require('node:fs')

const [templatePath, cssPath, jsPath, outputPath] = process.argv.slice(2)

if (!templatePath || !cssPath || !jsPath || !outputPath) {
  throw new Error('Usage: node build-offline.cjs <template> <css> <js> <output>')
}

const template = fs.readFileSync(templatePath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const js = fs.readFileSync(jsPath, 'utf8')

const withCss = template.replace(
  /<style>([\s\S]*?)<\/style>/,
  () => `<style>${css}</style>`,
)
const withJs = withCss.replace(
  /<script>([\s\S]*?)<\/script>/,
  () => `<script>${js}</script>`,
)
const output = withJs.replace(
  /lung-treatment-response\.css\?v=[^"']+/,
  'lung-treatment-response.css?v=20260817-14',
)

if (output === template) {
  throw new Error('Offline template was not updated')
}

fs.writeFileSync(outputPath, output)
