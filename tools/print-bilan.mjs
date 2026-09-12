/**
 * Génère le PDF du bilan hebdomadaire, tel qu'il sortira de l'application.
 *
 * Outil de contrôle : il pilote Chrome sans interface, remplit la base locale
 * avec deux séances et un point du samedi, ouvre le bilan et imprime la page
 * avec la feuille de style d'impression — exactement ce que fait le bouton
 * « Imprimer / Enregistrer en PDF » sur le téléphone.
 *
 * Utilisation :  node tools/print-bilan.mjs http://localhost:4510/ sortie.pdf
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4510/';
const sortie = process.argv[3] ?? 'bilan.pdf';
const navigateur = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const port = 9333;

const profil = mkdtempSync(join(tmpdir(), 'bilan-'));
const enfant = spawn(
  navigateur,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ouvre une connexion de mise au point et rend une fonction d'appel. */
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
      /* le navigateur n'écoute pas encore */
    }
    await dormir(250);
  }
  throw new Error('navigateur injoignable');
}

/** Évalue du code dans la page et renvoie la valeur. */
const evaluer = async (cdp, expression) => {
  const resultat = await cdp.envoyer('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (resultat.exceptionDetails) {
    throw new Error(resultat.exceptionDetails.exception?.description ?? 'erreur dans la page');
  }
  return resultat.result?.value;
};

const cdp = await connecter();
await cdp.envoyer('Page.enable');
await cdp.envoyer('Runtime.enable');

await cdp.envoyer('Page.navigate', { url });
await dormir(3500);

// Deux séances réelles, avec leur ressenti, et le point du samedi de la semaine 3.
await evaluer(
  cdp,
  `(async () => {
    // L'application crée elle-même sa base au démarrage : on attend qu'elle soit
    // prête plutôt que d'ouvrir avant elle, ce qui créerait une base vide.
    const ouvrir = () => new Promise((res, rej) => {
      const requete = indexedDB.open('coach-ottman-laura');
      requete.onsuccess = () => res(requete.result);
      requete.onerror = () => rej(requete.error);
    });
    let db;
    for (let essai = 0; essai < 40; essai += 1) {
      db = await ouvrir();
      if (db.objectStoreNames.contains('sessions') && db.objectStoreNames.contains('measurements')) break;
      db.close();
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!db.objectStoreNames.contains('measurements')) throw new Error('base applicative non prête');
    const maintenant = new Date().toISOString();
    const charge = (exerciseId, repetitions, actualLoadKg) => ({ exerciseId, setIndex: 0, actualRepetitions: repetitions, actualLoadKg, completedAt: maintenant });
    const seances = [
      { id: 'seance-a', profileId: 'ottman', dayId: 'full-body-a', sequenceVersion: 2, startedAt: maintenant, updatedAt: maintenant, completedAt: maintenant, currentExerciseIndex: 0, currentSetIndex: 0,
        loggedSets: [charge('presse-cuisses-inclinee', 10, 110), charge('leg-curl-allonge', 12, 50), charge('chest-press', 12, 45), charge('tirage-horizontal', 12, 45)],
        perceivedExertion: 8, energy: 5, pain: 'Gêne légère', painLocation: 'épaule droite', loadConsigne: 'increase', notes: 'bonne forme' },
      { id: 'seance-b', profileId: 'ottman', dayId: 'full-body-b', sequenceVersion: 2, startedAt: maintenant, updatedAt: maintenant, completedAt: maintenant, currentExerciseIndex: 0, currentSetIndex: 0,
        loggedSets: [charge('squat-smith', 10, 30), charge('leg-extension', 15, 45), charge('developpe-couche-machine', 10, 60), charge('tirage-vertical', 12, 45)],
        perceivedExertion: 9, energy: 1, pain: 'Douleur', painLocation: 'genou gauche', loadConsigne: 'decrease' },
    ];
    // Semaines 1 et 2 telles qu'elles figurent dans la feuille de suivi, semaine 3
    // relevée le jour du point. Le tour de taille de la semaine 1 est écarté : la
    // valeur de la feuille était invraisemblable.
    const points = [
      { id: 'ottman-c1-s1', profileId: 'ottman', cycle: 1, week: 1, weightKg: 104.7, chestCm: 112, armRightCm: 35, armLeftCm: 32.5, thighRightCm: 61, thighLeftCm: 60, excluded: ['waistCm'] },
      { id: 'ottman-c1-s2', profileId: 'ottman', cycle: 1, week: 2, weightKg: 104.1, waistCm: 117.5, chestCm: 109, armRightCm: 35.5, armLeftCm: 34, thighRightCm: 62.5, thighLeftCm: 62 },
      { id: 'ottman-c1-s3', profileId: 'ottman', cycle: 1, week: 3, measuredOn: maintenant, weightKg: 103.8, waistCm: 116, chestCm: 108.5, armRightCm: 36, armLeftCm: 34.5, thighRightCm: 62.5, thighLeftCm: 62, neckCm: 42 },
    ];
    await new Promise((res, rej) => {
      const tx = db.transaction(['sessions', 'measurements'], 'readwrite');
      seances.forEach((s) => tx.objectStore('sessions').put(s));
      points.forEach((p) => tx.objectStore('measurements').put(p));
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    localStorage.setItem('coach-active-profile', 'ottman');
    return 'donnees pretes';
  })()`,
);

await cdp.envoyer('Page.navigate', { url: `${url}?impression=1` });
await dormir(4000);

// Parcours réel : profil, progression, point du samedi, bilan.
const parcours = await evaluer(
  cdp,
  `(async () => {
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const bouton = (motif) => [...document.querySelectorAll('button')].find((b) => motif.test(b.textContent));
    await attendre(1200);
    bouton(/Ottman/)?.click();
    await attendre(1400);
    bouton(/Progression/)?.click();
    await attendre(1500);
    document.querySelector('.followup-cta')?.click();
    await attendre(1500);
    const ligne = [...document.querySelectorAll('.followup-row')].find((r) => /S3/.test(r.textContent));
    const bilan = ligne ? [...ligne.querySelectorAll('button')].find((b) => /Bilan/.test(b.textContent)) : null;
    bilan?.click();
    await attendre(2000);
    return document.querySelector('.bilan-doc') ? 'bilan ouvert' : 'bilan introuvable';
  })()`,
);
console.log('parcours :', parcours);

// Largeur utile d'une A4 avec marges de 12 mm : 210 - 24 = 186 mm, soit 703 px
// à 96 ppp. Sans ce cadrage, la page est mise en forme à la largeur de la
// fenêtre et le tableau déborde de la zone imprimable.
await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
  width: 703,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp.envoyer('Emulation.setEmulatedMedia', { media: 'print' });
const pdf = await cdp.envoyer('Page.printToPDF', {
  printBackground: true,
  paperWidth: 8.27,
  paperHeight: 11.69,
  marginTop: 0.47,
  marginBottom: 0.47,
  marginLeft: 0.47,
  marginRight: 0.47,
});
writeFileSync(sortie, Buffer.from(pdf.data, 'base64'));
console.log('PDF écrit :', sortie);

const image = await cdp.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(sortie.replace(/\.pdf$/, '.png'), Buffer.from(image.data, 'base64'));
console.log('Aperçu écrit :', sortie.replace(/\.pdf$/, '.png'));

cdp.fermer();
enfant.kill();
