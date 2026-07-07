import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf-8')

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  const png = resvg.render().asPng()
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png)
  console.log(`Generated icon-${size}.png (${png.length} bytes)`)
}
