import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Files copied verbatim from public/ that the app shell needs offline. */
const PUBLIC_SHELL = ['manifest.json', 'icon-192.png', 'icon-512.png', 'favicon.png'];

/**
 * Emits dist/sw.js from sw-template.js with the real, hashed bundle filenames
 * precached. Without this the shell is cached but the assets are not, because
 * the worker only takes control after the first load has already fetched them.
 */
function serviceWorker(): Plugin {
  return {
    name: 'mattolisto-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const precache = [...new Set(['.', 'index.html', ...PUBLIC_SHELL, ...Object.keys(bundle)])];
      const list = JSON.stringify(precache.sort(), null, 2);
      const version = createHash('sha256').update(list).digest('hex').slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync('sw-template.js', 'utf8')
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', list),
      });
    },
  };
}

// Served from https://<user>.github.io/MattoListo/ in production, from the root
// in dev. Keyed off mode, not command, so `vite preview` also uses the subpath.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/MattoListo/' : '/',
  // Vite's default target assumes iOS 16.4; an older iPhone then fails to parse
  // the bundle and renders nothing at all. Transpile further down than that.
  build: { target: ['es2020', 'safari14', 'chrome87', 'firefox78'] },
  plugins: [react(), serviceWorker()],
}));
