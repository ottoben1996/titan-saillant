/**
 * Découpe une galerie de maquettes en une image par proposition.
 *
 * Outil de présentation : ouvre la galerie dans Chrome sans interface et
 * enregistre un PNG par bloc (numéroté de 1 à n), pour les présenter un par un.
 *
 * Utilisation : node tools/capture-maquettes.mjs <fichier.html> <dossier-de-sortie>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fichier = resolve(process.argv[2] ?? 'docs/ux-ui/maquettes-lots.html');
const sortie = resolve(process.argv[3] ?? 'docs/ux-ui/maquettes');
const navigateur = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const port = 9345;

mkdirSync(sortie, { recursive: true });
const profil = mkdtempSync(join(tmpdir(), 'maquettes-'));
const enfant = spawn(
  navigateur,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    // Largeur d'une colonne de la galerie, pour que chaque bloc se présente seul.
    '--window-size=460,1200',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function connecter() {
  for (let essai = 0; essai < 40; essai += 1) {
    try {
      const cibles = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      const page = cibles.find((cible) => cible.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.onopen = res;
          ws.onerror = rej;
        });
        let compteur = 0;
        const attentes = new Map();
        ws.onmessage = (message) => {
          const donnees = JSON.parse(message.data);
          const attente = attentes.get(donnees.id);
          if (attente) {
            attentes.delete(donnees.id);
            donnees.error ? attente.rej(new Error(JSON.stringify(donnees.error))) : attente.res(donnees.result);
          }
        };
        const envoyer = (method, params = {}) =>
          new Promise((res, rej) => {
            compteur += 1;
            attentes.set(compteur, { res, rej });
            ws.send(JSON.stringify({ id: compteur, method, params }));
          });
        return { envoyer, fermer: () => ws.close() };
      }
    } catch {
      /* pas encore prêt */
    }
    await dormir(250);
  }
  throw new Error('navigateur injoignable');
}

const cdp = await connecter();
await cdp.envoyer('Page.enable');
await cdp.envoyer('Runtime.enable');
await cdp.envoyer('Page.navigate', { url: pathToFileURL(fichier).href });
await dormir(2500);

const evaluer = async (expression) => {
  const resultat = await cdp.envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (resultat.exceptionDetails) throw new Error(resultat.exceptionDetails.exception?.description ?? 'erreur');
  return resultat.result?.value;
};

// Chaque bloc de la galerie est encadré par un article, dans l'ordre du document.
const blocs = JSON.parse(
  await evaluer(`JSON.stringify([...document.querySelectorAll('article.item')].map((bloc) => {
    const rect = bloc.getBoundingClientRect();
    return { numero: bloc.querySelector('.numero').textContent.trim(), x: rect.left + window.scrollX, y: rect.top + window.scrollY, largeur: rect.width, hauteur: rect.height };
  }))`),
);

for (const bloc of blocs) {
  const image = await cdp.envoyer('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: bloc.x, y: bloc.y, width: bloc.largeur, height: bloc.hauteur, scale: 2 },
  });
  const nom = `${String(bloc.numero).padStart(2, '0')}.png`;
  writeFileSync(join(sortie, nom), Buffer.from(image.data, 'base64'));
  console.log(`${nom}  ${Math.round(bloc.largeur)} x ${Math.round(bloc.hauteur)}`);
}

console.log(`\n${blocs.length} images écrites dans ${sortie}`);
cdp.fermer();
enfant.kill();
