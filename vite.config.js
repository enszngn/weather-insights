import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { cloudflare } from "@cloudflare/vite-plugin"

/**
 * Vite plugin: esToolkitCompatEsm
 *
 * Intercepts `es-toolkit/compat/<name>` imports from recharts and redirects them
 * to their ESM `.mjs` equivalents inside `dist/compat/`, generating a synthetic
 * module that re-exports both as named AND default.
 *
 * Why: Rolldown (Vite 8's bundler) has a scope-shadowing bug in its CJS wrapper
 * generator that causes `TypeError: t is not a function` at runtime when the
 * `compat/*.js` CJS shim files are processed. The `.mjs` files in `dist/compat/`
 * are pure ESM and bypass the broken pipeline entirely.
 */
function esToolkitCompatEsm() {
  const distCompat = path.resolve(__dirname, 'node_modules/es-toolkit/dist/compat')

  // Map each compat import specifier → { mjs path, export name }
  const moduleMap = {
    'es-toolkit/compat/range':         { file: path.join(distCompat, 'math/range.mjs'),           name: 'range' },
    'es-toolkit/compat/get':           { file: path.join(distCompat, 'object/get.mjs'),           name: 'get' },
    'es-toolkit/compat/omit':          { file: path.join(distCompat, 'object/omit.mjs'),          name: 'omit' },
    'es-toolkit/compat/maxBy':         { file: path.join(distCompat, 'math/maxBy.mjs'),           name: 'maxBy' },
    'es-toolkit/compat/sumBy':         { file: path.join(distCompat, 'math/sumBy.mjs'),           name: 'sumBy' },
    'es-toolkit/compat/sortBy':        { file: path.join(distCompat, 'array/sortBy.mjs'),         name: 'sortBy' },
    'es-toolkit/compat/throttle':      { file: path.join(distCompat, 'function/throttle.mjs'),    name: 'throttle' },
    'es-toolkit/compat/minBy':         { file: path.join(distCompat, 'math/minBy.mjs'),           name: 'minBy' },
    'es-toolkit/compat/last':          { file: path.join(distCompat, 'array/last.mjs'),           name: 'last' },
    'es-toolkit/compat/isPlainObject': { file: path.join(distCompat, 'predicate/isPlainObject.mjs'), name: 'isPlainObject' },
    'es-toolkit/compat/uniqBy':        { file: path.join(distCompat, 'array/uniqBy.mjs'),         name: 'uniqBy' },
  }

  const VIRTUAL_PREFIX = '\0estkcompat:'

  return {
    name: 'vite-plugin-es-toolkit-compat-esm',
    enforce: 'pre',

    resolveId(id) {
      if (moduleMap[id]) {
        // Return a virtual module ID so Rolldown never touches the CJS shim
        return VIRTUAL_PREFIX + id
      }
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return
      const original = id.slice(VIRTUAL_PREFIX.length)
      const { file, name } = moduleMap[original]

      // Synthetic ESM: re-export the named function AND expose it as default.
      // Recharts uses default imports; some other code may use named imports.
      return `
import { ${name} } from ${JSON.stringify(file)};
export { ${name} };
export default ${name};
`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    esToolkitCompatEsm(), // must come before react() so it intercepts first
    react(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})