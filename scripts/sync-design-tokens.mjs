import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')
const sourceArgument = process.argv.slice(2).find((argument) => argument !== '--check')
const source = resolve(repoRoot, sourceArgument ?? '../druks/frontend/src/tokens.css')
const target = resolve(repoRoot, 'src/styles/tokens.css')
const [sourceCss, currentCss] = await Promise.all([
  readFile(source, 'utf8'),
  readFile(target, 'utf8').catch(() => ''),
])

if (checkOnly) {
  if (sourceCss !== currentCss) {
    console.error(`Website token artifact is out of sync with ${source}`)
    process.exitCode = 1
  } else {
    console.log('Website token artifact matches the generated app token source.')
  }
} else {
  await writeFile(target, sourceCss)
  console.log(`Synced website tokens from ${source}`)
}
