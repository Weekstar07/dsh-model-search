/**
 * dsh-model-search 构建脚本
 * 使用 esbuild 将 TypeScript 源码编译为 DSH 客户端 bundle
 */

import * as esbuild from 'esbuild'
import * as fs from 'fs'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

async function build() {
  await esbuild.build({
    entryPoints: ['src/client/index.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'lib/client.js',
    platform: 'browser',
    target: 'es2022',
    external: [
      'react',
      'react-dom',
      '@deepseek-ai/*',
    ],
    banner: {
      js: `/**
 * dsh-model-search v${pkg.version}
 * Model selector search enhancement for DeepSeek Harness
 */
window.__ModuleLoader__.load({
  id: 'dsh-model-search',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
`,
    },
    footer: {
      js: `
    module.exports = { inject, apply };
    return module.exports;
  }
});`,
    },
  })
  console.log('✓ Built lib/client.js')
}

build().catch(console.error)