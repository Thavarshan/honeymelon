import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const root = import.meta.dirname;

async function publicFiles(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? publicFiles(
            path.join(directory, entry.name),
            `${prefix}${entry.name}/`,
          )
        : [`${prefix}${entry.name}`],
    ),
  );

  return files.flat();
}

/**
 * Emit `sw.js` with an explicit, versioned precache of this build's app shell.
 * The version hashes every precached byte, so any change installs a new cache.
 * Host configuration files are never precached.
 */
function serviceWorker(): Plugin {
  return {
    name: 'honeymelon-service-worker',
    apply: 'build',
    // Run after Vite's HTML plugin has emitted index.html into the bundle.
    enforce: 'post',
    async generateBundle(_options, bundle) {
      if (!bundle['index.html']) {
        throw new Error('index.html must be precached for offline start');
      }

      const hash = createHash('sha256');
      const urls: string[] = [];
      for (const [fileName, item] of Object.entries(bundle).sort()) {
        if (fileName.endsWith('.map')) {
          continue;
        }

        hash.update(fileName);
        hash.update(item.type === 'chunk' ? item.code : item.source);
        urls.push(fileName === 'index.html' ? '/' : `/${fileName}`);
      }

      const publicDirectory = path.join(root, 'public');
      for (const fileName of (await publicFiles(publicDirectory)).sort()) {
        if (['_headers', '_redirects', 'robots.txt'].includes(fileName)) {
          continue;
        }

        hash.update(fileName);
        hash.update(await readFile(path.join(publicDirectory, fileName)));
        urls.push(`/${fileName}`);
      }

      const template = await readFile(
        path.join(root, 'sw/service-worker.js'),
        'utf8',
      );
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace(
            "'__VERSION__'",
            JSON.stringify(hash.digest('hex').slice(0, 16)),
          )
          .replace("['__PRECACHE__']", JSON.stringify(urls.sort())),
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    serviceWorker(),
    {
      name: 'development-csp',
      transformIndexHtml(html, context) {
        // React refresh injects an inline preamble during development only.
        return context.server
          ? html.replace(
              "script-src 'self'",
              "script-src 'self' 'unsafe-inline'",
            )
          : html;
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __DESKTOP_URL__: JSON.stringify(
      process.env.HONEYMELON_SITE_URL
        ? new URL('/download/', process.env.HONEYMELON_SITE_URL).href
        : 'https://github.com/Thavarshan/honeymelon/releases',
    ),
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: false,
    // The polyfill is the only fetch() call; browsers preload natively.
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('externalized for browser')) {
          throw new Error(warning.message);
        }

        warn(warning);
      },
    },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
