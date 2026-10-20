import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

/**
 * Sert `dist/` sous `/titan-saillant/`, comme GitHub Pages.
 *
 * `vite preview` sert les fichiers à la racine tout en les annonçant sous le
 * base path : le build paraît bon et la page reste blanche. Ce serveur reproduit
 * le seul chemin qui compte, celui de la mise en ligne.
 */
const racine = join(process.cwd(), 'dist');
const base = '/titan-saillant';
const port = 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(`${base}/`) && pathname !== base) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const relatif = pathname.slice(base.length) || '/';
  const fichier = normalize(join(racine, relatif === '/' ? '/index.html' : relatif));
  if (!fichier.startsWith(`${racine}${sep}`) && fichier !== join(racine, 'index.html')) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const info = await stat(fichier);
    if (info.isDirectory()) throw new Error('dossier');
    const contenu = await readFile(fichier);
    response.writeHead(200, {
      'content-type': types[extname(fichier)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(contenu);
  } catch {
    // Repli SPA : une URL sans extension rend l'application, pas un 404.
    const contenu = await readFile(join(racine, 'index.html'));
    response.writeHead(200, { 'content-type': types['.html'], 'cache-control': 'no-store' });
    response.end(contenu);
  }
});

server.listen(port, '127.0.0.1', () => {
  // Volontairement sobre : Playwright attend la réponse HTTP, pas ce message.
  process.stdout.write(`E2E sur http://127.0.0.1:${port}${base}/\n`);
});
