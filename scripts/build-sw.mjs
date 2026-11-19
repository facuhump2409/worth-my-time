import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dir = 'dist'
const files = (await readdir(dir, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'sw.js')
  .map(entry => join(entry.parentPath, entry.name).slice(dir.length))
  .sort()
const hash = createHash('sha256')
for (const file of files) hash.update(file).update(await readFile(`${dir}${file}`))
const template = await readFile(new URL('./worker.js', import.meta.url), 'utf8')
hash.update(template)
await writeFile(join(dir, 'sw.js'), template
  .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 16))
  .replace('__PRECACHE_FILES__', JSON.stringify(files)))
