/* =============================================================================
   PARCOURS — marche automatisée dans l'application.
   -----------------------------------------------------------------------------
   Fichier de contrôle, jamais publié (copié dans dist/ à côté du harnais).

   Il pilote l'application comme un doigt : il reconnaît l'écran affiché, agit,
   et relève à chaque pas ce qui ne devrait pas être là — erreur JavaScript,
   débordement horizontal, texte coupé, cible tactile trop petite, élément caché
   derrière la barre d'action.

   Il couvre les chemins qu'une marche manuelle oublie toujours : la saisie du
   samedi, le bilan imprimable, la pause du cycle, les feuilles et les modales,
   et le même parcours aux deux largeurs de téléphone.

   Résultat dans `window.RAPPORT`, et le détail dans la console.
   ========================================================================== */

(() => {
  const RAPPORT = {
    pas: 0,
    ecrans: {},
    soucis: [],
    erreursJs: [],
    termine: false,
  };
  window.RAPPORT = RAPPORT;

  const note = (quoi, detail) => {
    const ligne = detail ? `${quoi} → ${detail}` : quoi;
    if (!RAPPORT.soucis.includes(ligne)) RAPPORT.soucis.push(ligne);
  };

  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Le document de l'écran à piloter : 390 px par défaut, 430 si demandé. */
  function ecran(cadreId) {
    const cadre = document.getElementById(cadreId || 'narrow');
    return cadre?.contentWindow ?? null;
  }

  function visible(element) {
    return element.offsetHeight > 0 || element.offsetWidth > 0;
  }

  function bouton(d, motif, portee) {
    const zone = portee ?? d;
    return [...zone.querySelectorAll('button')].filter(visible).find((b) => motif.test(b.textContent.trim()));
  }

  /** Ce que l'écran affiche, réduit à un mot. */
  function etat(d) {
    if (!d.querySelector('.app-shell')) return 'hors-app';
    if (d.querySelector('.profile-screen')) return 'profil';
    if (d.querySelector('.energy-modal')) return 'energie';
    if (d.querySelector('.tutorial-modal')) return 'tuto';
    if (d.querySelector('[role="alertdialog"]')) return 'dialogue';
    if (d.querySelector('.sheet-content')) return 'feuille';
    if (d.querySelector('.rest-cockpit-container')) return 'repos';
    if (d.querySelector('.action-bar')) return 'serie';
    if (/SEMAINE COMPL|Beau travail|Comment s’est passée|Comment s'est passée/i.test(d.body.innerText)) return 'fin-de-seance';
    if (d.querySelector('.bottom-nav')) return 'accueil';
    return 'inconnu';
  }

  /** Un relevé de santé sur l'écran courant. */
  function ausculter(d, ou) {
    RAPPORT.pas++;
    RAPPORT.ecrans[ou] = (RAPPORT.ecrans[ou] || 0) + 1;

    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 2) {
      note('débordement horizontal', ou);
    }

    // Un texte coupé : le contenu plus large que la boîte, et une troncature
    // déclarée. Les éléments masqués aux lecteurs d'écran sont exclus.
    for (const e of d.querySelectorAll('h1,h2,h3,strong,span,p')) {
      if (!visible(e) || e.closest('.sr-only') || e.classList.contains('sr-only')) continue;
      const style = getComputedStyle(e);
      const coupe = e.scrollWidth > e.clientWidth + 2 && style.overflow !== 'visible';
      if (coupe && style.textOverflow === 'ellipsis') {
        note('texte tronqué', `${ou} : « ${(e.textContent || '').trim().slice(0, 26)} »`);
      }
    }

    // Une cible tactile sous 44 px, hors liens en ligne et éléments décoratifs.
    for (const b of d.querySelectorAll('button')) {
      if (!visible(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) {
        note('cible tactile', `${ou} : ${Math.round(r.width)}x${Math.round(r.height)} « ${b.textContent.trim().slice(0, 22)} »`);
      }
    }

    // La barre d'action doit rester dans la vue et rien ne doit la recouvrir.
    const barre = d.querySelector('.action-bar');
    if (barre) {
      const r = barre.getBoundingClientRect();
      const hautVue = d.defaultView.innerHeight;
      if (r.bottom > hautVue + 1 || r.top < 0) {
        note('barre hors de la vue', `${ou} : bas ${Math.round(r.bottom)} pour ${hautVue}`);
      }
      const dessus = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (dessus && dessus !== barre && !barre.contains(dessus)) {
        note('barre recouverte', `${ou} : ${dessus.tagName}.${String(dessus.className).slice(0, 24)}`);
      }
    }
  }

  /** Joue un pas : reconnaît l'écran, agit, ausculte. */
  async function pas(d, nom) {
    const avant = etat(d);
    const s = (ms) => attendre(ms);

    if (avant === 'profil') bouton(d, /Ottman/)?.click();
    else if (avant === 'tuto') bouton(d, /Terminer|Compris|Suivant|Passer/)?.click();
    else if (avant === 'energie') [...d.querySelectorAll('.energy-modal button')].find((b) => /Démarrer/.test(b.textContent))?.click();
    else if (avant === 'dialogue') bouton(d, /Continuer|Reprendre|Fermer|Retour|Annuler la séance/)?.click();
    else if (avant === 'feuille') bouton(d, /Fermer|Plus tard|Annuler/)?.click();
    else if (avant === 'repos') [...d.querySelectorAll('.rest-actions button')].find((b) => /Passer/.test(b.textContent))?.click();
    else if (avant === 'serie') {
      bouton(d, /^Passer$/)?.click();
      await s(90);
      d.querySelector('.action-bar')?.click();
    } else if (avant === 'fin-de-seance') {
      const choix = [...d.querySelectorAll('button')].find((b) => /Correct|Facile|Difficile|Bien|Valider|Terminer|Enregistrer/i.test(b.textContent));
      choix?.click();
      await s(400);
      bouton(d, /Terminer|Enregistrer|Valider|Fermer/)?.click();
    } else if (avant === 'accueil') {
      // D'abord la tuile du jour, sinon la reprise, sinon rien : on laisse la
      // marche suivre son chemin sans forcer.
      bouton(d, /^Démarrer$/)?.click();
    }

    await s(380);
    ausculter(d, nom ?? avant);
    return etat(d);
  }

  /* ---------------------------------------------------------- les parcours -- */

  async function marcher(cadreId, nom, tours, options = {}) {
    const w = ecran(cadreId);
    if (!w) {
      note('cadre introuvable', cadreId);
      return;
    }
    const d = w.document;
    w.addEventListener('error', (e) => {
      const ligne = `erreur JS : ${e.message}`;
      if (!RAPPORT.erreursJs.includes(ligne)) RAPPORT.erreursJs.push(ligne);
    });

    let precedent = null;
    let immobile = 0;
    for (let i = 0; i < tours; i++) {
      const courant = await pas(d, nom);
      if (courant === precedent) immobile++;
      else immobile = 0;
      precedent = courant;
      if (immobile > 10) {
        note('état immobile', `${nom} : bloqué en « ${courant} »`);
        break;
      }
      if (options.arret && options.arret(d)) break;
    }
  }

  /** Ce qui se visite sans jouer de séance : chaque onglet, chaque réglage. */
  async function visiter(d, nom) {
    const s = (ms) => attendre(ms);
    const onglets = [
      ['Historique', /Historique/],
      ['Progression', /Progression/],
      ['Réglages', /Profil/],
      ['Accueil', /Séances/],
    ];
    for (const [libelle, motif] of onglets) {
      bouton(d, motif, d.querySelector('.bottom-nav'))?.click();
      await s(1100);
      ausculter(d, `${nom}/${libelle}`);
    }

    // Le point du samedi et le bilan, depuis la progression.
    bouton(d, /Progression/, d.querySelector('.bottom-nav'))?.click();
    await s(1000);
    const versPoint = bouton(d, /[Pp]oint du samedi|[Ss]aisir|[Bb]ilan/);
    if (versPoint) {
      versPoint.click();
      await s(1300);
      ausculter(d, `${nom}/point-du-samedi`);
      const champ = [...d.querySelectorAll('input[type="number"],input[type="text"],input:not([type])')].filter(visible);
      for (const c of champ.slice(0, 6)) {
        if (!c.value) {
          c.value = /poids|kg/i.test(c.getAttribute('aria-label') || '') ? '104.6' : '60';
          c.dispatchEvent(new Event('input', { bubbles: true }));
          c.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      await s(400);
      bouton(d, /Enregistrer|Valider|Suivant/)?.click();
      await s(1400);
      ausculter(d, `${nom}/point-enregistre`);
      // Le bilan imprimable.
      // Surtout pas « Imprimer » : la boîte de dialogue du navigateur bloque la
      // marche et l'automate s'y arrête sans rien dire.
      const versBilan = [...d.querySelectorAll('button')]
        .filter(visible)
        .find((b) => /[Bb]ilan|Voir le bilan/i.test(b.textContent) && !/[Ii]mprimer/.test(b.textContent));
      versBilan?.click();
      await s(1600);
      ausculter(d, `${nom}/bilan`);
      const document_ = d.querySelector('.bilan-document, .bilan-page, [class*="bilan"]');
      if (!document_) note('bilan absent', `${nom} : aucun document imprimable`);
      bouton(d, /Retour|Fermer/)?.click();
      await s(900);
    } else {
      note('point du samedi introuvable', nom);
    }

    // Le cycle en pause : le bandeau doit apparaître, puis disparaître.
    bouton(d, /Profil/, d.querySelector('.bottom-nav'))?.click();
    await s(1000);
    const pause = bouton(d, /[Pp]ause du cycle|Mettre le cycle en pause|Reprendre le cycle/);
    if (pause) {
      pause.click();
      await s(1200);
      ausculter(d, `${nom}/cycle-en-pause`);
      const bandeau = [...d.querySelectorAll('*')].find((e) => visible(e) && /courbes gelées|cycle en pause/i.test(e.textContent || ''));
      if (!bandeau) note('bandeau de pause absent', nom);
      bouton(d, /[Rr]eprendre le cycle|Pause du cycle/)?.click();
      await s(900);
    } else {
      note('réglage de pause introuvable', nom);
    }
  }

  /* --------------------------------------------------------------- départ -- */

  (async () => {
    try {
      // 1. Largeur 390 : une séance complète, puis la visite des écrans.
      await marcher('narrow', '390', 90);
      const w390 = ecran('narrow');
      if (w390) await visiter(w390.document, '390');

      // 2. Largeur 430 : le même parcours, pour la mise en page large.
      await marcher('wide', '430', 60);
      const w430 = ecran('wide');
      if (w430) await visiter(w430.document, '430');

      // 3. Écran court 390x620 : le proxy du clavier ouvert, qui rogne la
      //    hauteur visible. La barre d'action doit rester atteignable.
      await marcher('short', '390x620', 60);

      RAPPORT.termine = true;
      console.log('PARCOURS TERMINE', JSON.stringify(RAPPORT));
    } catch (erreur) {
      RAPPORT.soucis.push(`arrêt sur erreur : ${erreur?.message ?? erreur}`);
      RAPPORT.termine = true;
      console.log('PARCOURS INTERROMPU', JSON.stringify(RAPPORT));
    }
  })();
})();
