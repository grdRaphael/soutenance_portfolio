(function () {
  const SLIDE_W = 1920;
  const SLIDE_H = 1080;

  const stage = document.getElementById('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  // Les annexes (data-annex) sont rangées après le déroulé principal : hors du fil, on n'y accède que par la vue d'ensemble (G)
  const nbPrincipales = slides.filter((s) => !s.hasAttribute('data-annex')).length;
  const estAnnexe = (i) => i >= nbPrincipales;
  const numberEl = document.getElementById('slide-number');
  const live = document.getElementById('live');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = -1;
  let etape = 0;          // étape en cours dans une diapositive à étapes (0 sinon)
  let animation = null;

  // Les plugins de GSAP 3.13 (gratuits) : découpe du texte, texte qui se décode, tracés SVG
  if (window.gsap) {
    gsap.registerPlugin(...[window.SplitText, window.ScrambleTextPlugin, window.DrawSVGPlugin, window.TextPlugin].filter(Boolean));
  }

  /* ---------- Découpage des titres en lettres (data-split) ---------- */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((word, i) => {
      if (i > 0) el.append(' ');
      const mot = document.createElement('span');
      mot.className = 'mot';
      mot.setAttribute('aria-hidden', 'true');
      for (const char of word) {
        const lettre = document.createElement('span');
        lettre.className = 'lettre';
        lettre.textContent = char;
        mot.append(lettre);
      }
      el.append(mot);
    });
  });

  /* ---------- L'heure de La Réunion, comme dans le Hero du portfolio ---------- */
  const formatHeure = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Reunion',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  function majHorloges() {
    const maintenant = new Date();
    document.querySelectorAll('[data-horloge]').forEach((el) => {
      el.textContent = formatHeure.format(maintenant);
      el.setAttribute('datetime', maintenant.toISOString());
    });
  }
  majHorloges();
  setInterval(majHorloges, 1000);

  /* ---------- Le fond : les lueurs dérivent lentement, sous toutes les diapositives ----------
     Chaque lueur a sa propre durée : leurs mouvements ne se synchronisent jamais,
     et le verre posé dessus change doucement de couleur. */
  function animerFond() {
    if (!window.gsap || reduceMotion.matches) return;
    const vague = { ease: 'sine.inOut', yoyo: true, repeat: -1 };
    gsap.to('.lueur--rouge', { x: 220, y: 120, scale: 1.12, duration: 17, ...vague });
    gsap.to('.lueur--orange', { x: 260, y: -90, scale: 1.25, duration: 13, ...vague });
    gsap.to('.lueur--bleue', { x: -240, y: -110, scale: 1.1, duration: 19, ...vague });
  }

  /* ---------- Diapositives en étapes ----------
     Chaque diapositive à étapes a une timeline avec un repère par étape (e1, e2…).
     → joue jusqu'au repère suivant, ← rembobine plus vite jusqu'au précédent. */
  function controleurEtapes(construire) {
    let tl = null;
    let deplacement = null;
    const repere = (n) => (n === 0 ? 'debut' : `e${n}`);

    return {
      // Arrivée sur la diapositive : à l'étape 1 on joue l'entrée, sinon on se place directement
      entrer(n) {
        if (!window.gsap) return;
        if (!tl) tl = construire();
        if (deplacement) deplacement.kill();
        if (reduceMotion.matches || n !== 1) {
          tl.pause(repere(n));
          return;
        }
        tl.pause(0);
        deplacement = tl.tweenTo('e1');
      },
      aller(n, depuis) {
        if (!window.gsap || !tl) return;
        if (deplacement) deplacement.kill();
        if (reduceMotion.matches) {
          tl.pause(repere(n));
          return;
        }
        deplacement = n > depuis
          ? tl.tweenTo(repere(n))
          : tl.tweenTo(repere(n), { duration: 0.7, ease: 'power2.inOut' });
      },
      // Se placer à une étape sans animation (vue d'ensemble)
      placer(n) {
        if (!window.gsap) return;
        if (!tl) tl = construire();
        if (deplacement) deplacement.kill();
        tl.pause(repere(n));
      }
    };
  }

  /* ---------- Outils partagés par les diapositives à étapes ---------- */

  // Le texte qui se décode (ScrambleText) : il part vide et révèle son data-texte (ou le texte donné)
  const decoder = (el, duree, texte = el.dataset.texte) => gsap.to(el, {
    duration: duree,
    scrambleText: { text: texte, chars: /^[\d\s]+$/.test(texte) ? '0123456789' : 'upperCase', revealDelay: 0.25, speed: 0.6 },
    ease: 'none'
  });

  // Découper un texte (SplitText) avec un masque par morceau : les morceaux montent de sous leur ligne.
  // Les masques reçoivent de la marge, pour ne couper ni les accents ni les jambages (le « j »)
  const decouper = (el, type) => {
    const decoupe = new SplitText(el, { type, mask: type });
    decoupe[type].forEach((morceau) => morceau.parentElement.classList.add('masque'));
    return decoupe;
  };

  // La position d'un élément dans un repère, en pixels de scène (la scène est mise à l'échelle)
  const positionDans = (el, repere) => {
    const echelle = stage.getBoundingClientRect().width / SLIDE_W;
    const r = el.getBoundingClientRect();
    const o = repere.getBoundingClientRect();
    return { x: (r.left - o.left) / echelle, y: (r.top - o.top) / echelle, w: r.width / echelle, h: r.height / echelle };
  };

  /* Diapositive 2 : le déroulé. Une lueur file le long d'une route et allume six stations.
     Une étape par phrase du script : e1 le titre, la route fantôme et la lueur au départ ;
     e2 à e7 les six parties, chacune à l'arrivée de la lueur sur sa station. */
  function construireDeroule() {
    const slide = document.getElementById('slide-02');
    const chemin = slide.querySelector('.deroule__trace');
    const lueur = slide.querySelector('.deroule__lueur');
    const stations = Array.from(slide.querySelectorAll('.station'));
    const L = chemin.getTotalLength();

    // La longueur de route parcourue au droit de chaque station
    const longueurs = stations.map((st) => {
      const cx = Number(st.dataset.x);
      const cy = Number(st.dataset.y);
      let meilleure = 0;
      let ecart = Infinity;
      for (let l = 0; l <= L; l += 2) {
        const p = chemin.getPointAtLength(l);
        const e = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        if (e < ecart) { ecart = e; meilleure = l; }
      }
      return meilleure;
    });

    // La lueur avance sur la route, et la trace lumineuse s'allonge derrière elle
    chemin.style.strokeDasharray = L;
    const curseur = { l: 0 };
    const suivre = () => {
      const p = chemin.getPointAtLength(curseur.l);
      gsap.set(lueur, { x: p.x, y: p.y });
      chemin.style.strokeDashoffset = L - curseur.l;
    };
    suivre();

    const titre = decouper(slide.querySelector('.deroule__titre'), 'chars');
    const libelles = stations.map((st) => decouper(st.querySelectorAll('.station__nom, .station__detail'), 'words'));

    // L'arrivée de la lueur sur une station
    const arrivee = (i) => {
      const st = stations[i];
      const t = gsap.timeline()
        .fromTo(st.querySelector('.station__onde'), { scale: 0.6, autoAlpha: 0.9 }, { scale: 2.8, autoAlpha: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 0)
        .fromTo(st.querySelector('.station__disque'), { scale: 0.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0)
        .fromTo(st.querySelectorAll('.station__icone > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.08, ease: 'power2.inOut' }, 0.08)
        .add(decoder(st.querySelector('.station__numero'), 0.5), 0.05)
        .from(libelles[i].words, { yPercent: 115, duration: 0.55, stagger: 0.025, ease: 'expo.out' }, 0.08);
      // La station précédente passe au second plan
      if (i > 0) t.to(stations[i - 1].querySelector('.station__textes'), { opacity: 0.45, duration: 0.4 }, 0);
      return t;
    };

    const tl = gsap.timeline({ paused: true })
      .addLabel('debut', 0)
      .add(decoder(slide.querySelector('.deroule__kicker'), 0.9), 0)
      .from(titre.chars, { yPercent: 110, duration: 1, stagger: 0.04, ease: 'expo.out' }, 0.1)
      .fromTo(slide.querySelector('.deroule__fantome'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' }, 0.3)
      .fromTo(lueur, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2)' }, 1.1)
      .addLabel('e1');

    stations.forEach((st, i) => {
      tl.fromTo(curseur,
        { l: i === 0 ? 0 : longueurs[i - 1] },
        { l: longueurs[i], duration: i === 0 ? 0.45 : 0.65, ease: 'power2.inOut', onUpdate: suivre, immediateRender: false })
        .add(arrivee(i), '-=0.15')
        .addLabel(`e${i + 2}`);
    });
    return tl;
  }

  /* Diapositive 3 : qui je suis. Une étape par phrase du script :
     e1 « Je commence par me présenter » : l'en-tête et le fil vide ;
     e2 full-stack : un pont de React (l'interface) à Node.js (l'API) ;
     e3 le sport : deux postes, l'un au-dessus de l'autre, et l'épingle de La Réunion ;
     e4 les tâches répétitives qui s'empilent, puis le code Apps Script qui s'écrit ;
     e5 l'exemple : l'e-mail d'inscription arrive, seul, au centre ;
     e6 le script range : l'e-mail monte, le tableau Google Sheets apparaît, les valeurs volent
     jusqu'à leurs cellules, le numéro se remet en forme ;
     e7 le déclic : « perdre du temps » entouré, une flèche vers le développement.
     À chaque étape, un mot-clé s'ajoute au fil, à gauche. */
  function construireQui() {
    const slide = document.getElementById('slide-03');
    const scenes = Array.from(slide.querySelectorAll('.scene'));
    const [stack, sport, taches, exemple, declic] = scenes;
    const etapesFil = Array.from(slide.querySelectorAll('.fil__etape'));

    // Les copies volantes de l'exemple : mesurées avant toute animation, quand rien n'est encore décalé
    const valeurs = Array.from(exemple.querySelectorAll('.mail__val'));
    const cellules = Array.from(exemple.querySelectorAll('.feuille__cellule'));
    const vols = valeurs.map((val, i) => {
      const vol = document.createElement('span');
      vol.className = 'vol';
      vol.setAttribute('aria-hidden', 'true');
      vol.textContent = val.textContent;
      exemple.append(vol);
      const depart = positionDans(val, exemple);
      const cellule = positionDans(cellules[i], exemple);
      return { vol, depart, arrivee: { x: cellule.x + 10, y: cellule.y + (cellule.h - depart.h) / 2 } };
    });
    vols.forEach(({ vol, depart }) => gsap.set(vol, { x: depart.x, y: depart.y, autoAlpha: 0 }));

    const titre = decouper(slide.querySelector('.qui__titre'), 'chars');
    const motsFil = etapesFil.map((li) => decouper(li.querySelector('.fil__mot'), 'words'));
    const nom = decouper(stack.querySelector('.stack__nom'), 'chars');
    // Seul le début de la phrase est découpé : la fin porte le cercle tracé (un SVG), animée à part
    const phrase = decouper(declic.querySelector('.declic__debut'), 'words');
    gsap.set(slide.querySelector('.fil__trace'), { drawSVG: '0% 0%' });
    const dev = decouper(declic.querySelector('.declic__dev'), 'chars');

    // Le fil : la ligne descend jusqu'au point de l'étape, qui s'allume ; le mot-clé monte
    const avancerFil = (k) => {
      const li = etapesFil[k];
      const t = gsap.timeline()
        .fromTo(slide.querySelector('.fil__trace'), { drawSVG: `0% ${Math.max(0, k - 1) * 25}%` }, { drawSVG: `0% ${k * 25}%`, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, 0)
        .to(li.querySelector('.fil__point'), { backgroundColor: '#e8692e', borderColor: '#ffd9c2', boxShadow: '0 0 22px 6px rgba(232,105,46,.6)', scale: 1.25, duration: 0.4 }, k ? 0.45 : 0)
        .from(motsFil[k].words, { yPercent: 110, duration: 0.7, stagger: 0.05, ease: 'expo.out' }, k ? 0.5 : 0.05);
      if (k > 0) {
        t.to(etapesFil[k - 1].querySelector('.fil__point'), { backgroundColor: '#ffffff', borderColor: '#ffffff', boxShadow: '0 0 0 0 rgba(232,105,46,0)', scale: 0.8, duration: 0.4 }, 0)
          .to(etapesFil[k - 1].querySelector('.fil__mot'), { opacity: 0.45, duration: 0.5 }, 0);
      }
      return t;
    };

    // Changer de scène : la précédente s'efface vers le haut, la nouvelle devient visible
    const changerScene = (k) => {
      const t = gsap.timeline();
      if (k > 0) t.to(scenes[k - 1], { autoAlpha: 0, y: -40, scale: 0.97, duration: 0.45, ease: 'power2.in' }, 0);
      t.set(scenes[k], { autoAlpha: 1 }, k > 0 ? 0.4 : 0);
      return t;
    };

    // 1. Full-stack : le nom, le métier qui se décode, puis le pont de React à Node.js
    const sceneStack = () => {
      const liaison = stack.querySelector('.stack__trait');
      const impulsion = stack.querySelector('.stack__impulsion');
      const [front, back] = stack.querySelectorAll('.stack__bout');
      return gsap.timeline()
        .from(nom.chars, { yPercent: 110, duration: 0.9, stagger: 0.03, ease: 'expo.out' }, 0)
        .add(decoder(stack.querySelector('.stack__metier'), 1), 0.35)
        .from(front.querySelector('.stack__tuile'), { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)' }, 0.7)
        .from(front.querySelectorAll('p'), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.9)
        .from(stack.querySelector('.stack__fantome'), { autoAlpha: 0, duration: 0.4 }, 1)
        // L'impulsion part de React et trace le pont jusqu'à Node.js
        .fromTo(impulsion, { autoAlpha: 0, x: 0 }, { autoAlpha: 1, duration: 0.2 }, 1.1)
        .fromTo(liaison, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut' }, 1.15)
        .to(impulsion, { x: 680, duration: 1.1, ease: 'power2.inOut' }, 1.15)
        .to(impulsion, { autoAlpha: 0, scale: 2.2, duration: 0.4 }, 2.25)
        .from(back.querySelector('.stack__tuile'), { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)' }, 2.1)
        .from(back.querySelectorAll('p'), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 2.3)
        // En soignant l'accessibilité et les performances
        .from(stack.querySelectorAll('.qualite'), { y: -50, autoAlpha: 0, duration: 0.8, stagger: 0.18, ease: 'bounce.out' }, 2.6)
        .from(stack.querySelectorAll('.qualite__coche'), { scale: 0, duration: 0.4, stagger: 0.18, ease: 'back.out(3)' }, 3.1);
    };

    // 2. Le sport : le disque d'haltère, le premier poste, puis le second au-dessus, et La Réunion
    const sceneSport = () => gsap.timeline()
      .from(sport.querySelector('.sport__disque'), { scale: 0.3, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.8)' }, 0)
      .fromTo(sport.querySelectorAll('.sport__icone > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, stagger: 0.1, ease: 'power2.inOut' }, 0.2)
      .from(sport.querySelector('.poste--1'), { x: 120, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 0.4)
      .fromTo(sport.querySelector('.sport__montee path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out' }, 1.1)
      .from(sport.querySelector('.poste--2'), { y: 60, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, 1.4)
      .to(sport.querySelector('.poste--1'), { opacity: 0.55, duration: 0.6 }, 1.5)
      .from(sport.querySelector('.sport__lieu'), { y: -70, autoAlpha: 0, duration: 0.9, ease: 'bounce.out' }, 2)
      .fromTo(sport.querySelectorAll('.sport__epingle > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, stagger: 0.15 }, 2.3);

    // 3. Les tâches s'empilent et tournent en boucle ; puis la flèche, et le code s'écrit
    const sceneTaches = () => {
      const t = gsap.timeline()
        .from(taches.querySelectorAll('.tache__carte'), { x: -80, autoAlpha: 0, duration: 0.7, stagger: 0.18, ease: 'power3.out' }, 0);
      // Répétitives : chaque tâche laisse derrière elle des copies d'elle-même, et sa boucle tourne
      taches.querySelectorAll('.tache').forEach((tache, i) => {
        const [f1, f2] = tache.querySelectorAll('.tache__fantome');
        t.fromTo(f1, { x: 0, y: 0, autoAlpha: 0 }, { x: 12, y: 12, autoAlpha: 0.8, duration: 0.5, ease: 'power2.out' }, 0.7 + i * 0.15)
          .fromTo(f2, { x: 0, y: 0, autoAlpha: 0 }, { x: 24, y: 24, autoAlpha: 0.5, duration: 0.5, ease: 'power2.out' }, 0.8 + i * 0.15)
          .fromTo(tache.querySelector('.tache__boucle'), { rotation: 0 }, { rotation: 360, duration: 1, ease: 'power2.inOut' }, 0.7 + i * 0.15);
      });
      t.fromTo(taches.querySelector('.taches__fleche path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out' }, 1.7)
        .from(taches.querySelector('.code'), { x: 60, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 1.9);
      // Les lignes de code se tapent l'une après l'autre
      let debut = 2.4;
      taches.querySelectorAll('.code__ligne').forEach((ligne) => {
        const texte = ligne.dataset.ligne;
        const duree = texte.length * 0.022;
        t.to(ligne, { text: { value: texte }, duration: duree, ease: 'none' }, debut);
        debut += duree + 0.1;
      });
      return t.from(taches.querySelectorAll('.outil'), { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.15, ease: 'back.out(2)' }, debut);
    };

    // 4. L'exemple, en deux temps. D'abord l'e-mail seul, centré dans la scène
    const mail = exemple.querySelector('.mail');
    const centrage = (700 - positionDans(mail, exemple).h) / 2;
    const sceneExemple = () => gsap.timeline()
      .fromTo(mail, { x: -60, y: centrage, autoAlpha: 0 }, { x: 0, y: centrage, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, 0);

    // Puis le script range : l'e-mail monte, le tableau arrive, les valeurs se sélectionnent et volent jusqu'à leurs cellules
    const rangerExemple = () => {
      const t = gsap.timeline()
        .to(mail, { y: 0, duration: 0.7, ease: 'power3.inOut' }, 0)
        .from(exemple.querySelector('.feuille'), { y: 80, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
        .from(exemple.querySelector('.feuille__appli'), { scale: 0.4, autoAlpha: 0, duration: 0.6, ease: 'back.out(2.5)' }, 0.55);
      vols.forEach(({ vol, depart, arrivee }, i) => {
        const debut = 1 + i * 0.45;
        t.to(valeurs[i], { backgroundColor: 'rgba(232,105,46,0.35)', duration: 0.25 }, debut)
          .set(vol, { autoAlpha: 1 }, debut + 0.2)
          // Un arc : l'axe horizontal glisse régulièrement, l'axe vertical monte puis redescend
          .to(vol, { x: arrivee.x, duration: 0.9, ease: 'power2.inOut' }, debut + 0.2)
          .to(vol, { y: Math.min(depart.y, arrivee.y) - 70, duration: 0.45, ease: 'power2.out' }, debut + 0.2)
          .to(vol, { y: arrivee.y, duration: 0.45, ease: 'power2.in' }, debut + 0.65)
          .to(vol, { backgroundColor: 'rgba(232,105,46,0)', boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.4 }, debut + 1.1)
          .to(valeurs[i], { backgroundColor: 'rgba(232,105,46,0)', opacity: 0.5, duration: 0.4 }, debut + 0.9);
      });
      // Le script retire l'indicatif +262 et espace le numéro restant.
      // Attendre l'arrivée des quatre valeurs avant de valider la ligne.
      return t.add(decoder(vols[1].vol, 0.9, '06 92 12 34 56'), 3.85)
        .add(decoder(exemple.querySelector('.exemple__note'), 0.9), 3.9)
        .from(exemple.querySelector('.feuille__ok'), { scale: 0, rotation: -30, duration: 0.6, ease: 'back.out(3)' }, 4.45);
    };

    // 5. Le déclic : la phrase monte, « perdre du temps » s'entoure, la flèche mène au développement
    const sceneDeclic = () => gsap.timeline()
      .from(phrase.words, { yPercent: 110, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, 0)
      .from(declic.querySelector('.declic__cible'), { y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 0.35)
      .fromTo(declic.querySelector('.declic__rature path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, ease: 'power2.inOut' }, 0.9)
      .from(declic.querySelector('.declic__qui'), { y: 20, autoAlpha: 0, duration: 0.7 }, 1.5)
      .fromTo(declic.querySelector('.declic__fleche path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }, 2.1)
      .from(dev.chars, { yPercent: 110, duration: 0.9, stagger: 0.035, ease: 'expo.out' }, 2.6);

    const tl = gsap.timeline({ paused: true })
      .addLabel('debut', 0)
      .from(slide.querySelector('.qui__pastille'), { scale: 0.3, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)' }, 0)
      .fromTo(slide.querySelectorAll('.qui__icone > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, stagger: 0.12 }, 0.2)
      .add(decoder(slide.querySelector('.qui__kicker'), 0.9), 0.1)
      .from(titre.chars, { yPercent: 110, duration: 1, stagger: 0.04, ease: 'expo.out' }, 0.2)
      .fromTo(slide.querySelector('.fil__fantome'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }, 0.5)
      .from(slide.querySelectorAll('.fil__point'), { scale: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(2)' }, 0.8)
      .addLabel('e1');

    let etape = 2;
    [sceneStack, sceneSport, sceneTaches, sceneExemple, sceneDeclic].forEach((scene, k) => {
      tl.add(changerScene(k))
        .add(avancerFil(k), '<')
        .add(scene(), k > 0 ? '<0.4' : '<')
        .addLabel(`e${etape++}`);
      // L'exemple se joue en deux étapes, sur la même scène et le même mot-clé du fil
      if (scene === sceneExemple) tl.add(rangerExemple()).addLabel(`e${etape++}`);
    });
    return tl;
  }

  /* ---------- Diapositives 4 à 8 : la suite du pitch, une idée par écran ---------- */

  // L'en-tête des slides du pitch : la pastille, « 01 — Mon pitch » qui se décode, le titre. Rapide.
  const entreeTete = (slide) => {
    const titre = decouper(slide.querySelector('.qui__titre'), 'chars');
    return gsap.timeline()
      .from(slide.querySelector('.qui__pastille'), { scale: 0.4, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, 0)
      .fromTo(slide.querySelectorAll('.qui__icone > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5 }, 0.1)
      .add(decoder(slide.querySelector('.qui__kicker'), 0.6), 0)
      .from(titre.chars, { yPercent: 110, duration: 0.7, stagger: 0.02, ease: 'expo.out' }, 0.05);
  };

  // Une valeur qui défile, affichée au fil de l'animation
  const compter = (el, de, a, duree, ecrire) => {
    const v = { n: de };
    return gsap.fromTo(v, { n: de }, { n: a, duration: duree, ease: 'power2.out', immediateRender: false, onUpdate: () => { el.textContent = ecrire(v.n); } });
  };

  // Un texte qui se tape (TextPlugin), à partir de son data-ligne
  const taper = (el, vitesse = 0.03) => gsap.to(el, { text: { value: el.dataset.ligne }, duration: el.dataset.ligne.length * vitesse, ease: 'none' });

  // Ajouter les étapes à une timeline : e1 pour la première, puis e2, e3…
  const enEtapes = (tl, etapes) => {
    etapes.forEach((etape, k) => tl.add(etape(), k === 0 ? 0 : undefined).addLabel(`e${k + 1}`));
    return tl;
  };

  /* Diapositive 4 : ma formation.
     e1 « Je termine aujourd'hui la formation » : l'anneau de progression se ferme autour du diplôme ;
     e2 le front-end : un navigateur, JavaScript et React ; e3 le back-end : un paquet part du navigateur,
     le serveur s'allume ; e4 l'Agile : les cartes du Kanban avancent d'une colonne à l'autre. */
  function construireFormation() {
    const slide = document.getElementById('slide-04');
    const nom = decouper(slide.querySelector('.diplome__nom'), 'chars');
    const [front, back, agile] = slide.querySelectorAll('.brique');
    const textes = (brique) => brique.querySelectorAll('.brique__nom, .brique__detail');
    const cartes = slide.querySelectorAll('.kanban__carte');
    const colonne = 152; // largeur d'une colonne du Kanban, espace compris

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(slide.querySelector('.diplome__disque'), { scale: 0.5, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, 0.1)
        .fromTo(slide.querySelectorAll('.diplome__icone > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, stagger: 0.1 }, 0.2)
        .from(slide.querySelector('.diplome__label'), { y: 20, autoAlpha: 0, duration: 0.5 }, 0.2)
        .from(nom.chars, { yPercent: 110, duration: 0.8, stagger: 0.03, ease: 'expo.out' }, 0.25)
        // « Je termine » : l'anneau se ferme, puis passe au vert
        .fromTo(slide.querySelector('.diplome__arc'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut' }, 0.3)
        .to(slide.querySelector('.diplome__arc'), { stroke: '#4ade80', duration: 0.4 }, 1.7),

      () => gsap.timeline()
        .from(front.querySelector('.navigateur'), { y: 50, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0)
        .from(front.querySelectorAll('.navigateur__barre i'), { scale: 0, duration: 0.3, stagger: 0.06, ease: 'back.out(3)' }, 0.3)
        .from(front.querySelector('.logo-js'), { scale: 0, rotation: -20, duration: 0.6, ease: 'back.out(2)' }, 0.35)
        .from(front.querySelector('.navigateur__react'), { scale: 0, rotation: -240, duration: 0.9, ease: 'back.out(1.6)' }, 0.5)
        .from(textes(front), { y: 20, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.3),

      () => {
        const paquet = slide.querySelector('.briques__paquet');
        return gsap.timeline()
          .fromTo(slide.querySelector('.briques__lien path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.4 }, 0)
          .from(back.querySelectorAll('.serveur__unite'), { x: 50, autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.1)
          .from(textes(back), { y: 20, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.3)
          // Une requête part du navigateur, le serveur s'allume, la réponse revient
          .fromTo(paquet, { x: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.5)
          .to(paquet, { x: 104, duration: 0.5, ease: 'power1.inOut' }, 0.55)
          .to(back.querySelectorAll('.serveur__voyant'), { backgroundColor: '#4ade80', boxShadow: '0 0 12px 3px rgba(74,222,128,.7)', duration: 0.2, stagger: 0.12 }, 1)
          .to(paquet, { x: 0, duration: 0.5, ease: 'power1.inOut' }, 1.4)
          .to(paquet, { autoAlpha: 0, duration: 0.2 }, 1.9);
      },

      () => gsap.timeline()
        .from(agile.querySelector('.kanban'), { y: 50, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0)
        .from(cartes, { scale: 0.6, autoAlpha: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(2)' }, 0.3)
        .from(textes(agile), { y: 20, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.3)
        // Les cartes avancent : une jusqu'à « Terminé », une jusqu'à « En cours »
        .to(cartes[0], { x: colonne, duration: 0.45, ease: 'power2.inOut' }, 0.8)
        .to(cartes[0], { x: colonne * 2, duration: 0.45, ease: 'power2.inOut' }, 1.3)
        .to(cartes[0], { backgroundColor: '#4ade80', duration: 0.3 }, 1.7)
        .to(cartes[1], { x: colonne, duration: 0.45, ease: 'power2.inOut' }, 1.5)
    ]);
  }

  /* Diapositive 5 : Sophie Bluel.
     e1 l'écran du projet se dévoile, le nom monte ; e2 « d'abord en JavaScript » ; e3 « puis en React + TypeScript,
     de ma propre initiative » ; e4 « mis en ligne » : l'adresse se tape dans la barre ; e5 le poids des images fond ;
     e6 « des garde-fous » : un voile de verre recouvre le site, le bouclier tombe dessus et s'y trace ;
     e7 à e9 un garde-fou par clic, chacun avec son geste : l'aiguille des envois limités, le cadre de l'image vérifiée,
     la flèche de la démo restaurée. */
  function construireBluel() {
    const slide = document.getElementById('slide-05');
    const nom = decouper(slide.querySelector('.bluel__nom'), 'chars');
    const jalons = slide.querySelectorAll('.jalon');
    const fil = slide.querySelector('.jalons__fil path');
    gsap.set(fil, { drawSVG: '0% 0%' });
    const jalon = (li, extra) => {
      const t = gsap.timeline()
        .from(li.querySelector('.jalon__marque'), { scale: 0, rotation: -90, duration: 0.6, ease: 'back.out(2)' }, 0)
        .from(li.querySelector('.jalon__texte'), { x: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.1);
      if (extra) extra(t);
      return t;
    };

    // Un garde-fou : sa carte glisse sous la précédente, son détail suit, puis son geste
    const gardeFou = (i, geste) => {
      const item = slide.querySelectorAll('.garde__item')[i];
      const t = gsap.timeline()
        .from(item, { y: -40, scaleY: 0.6, autoAlpha: 0, duration: 0.5, ease: 'back.out(1.8)', transformOrigin: '50% 0%' }, 0)
        .from(item.querySelector('.garde__detail'), { x: 20, autoAlpha: 0, duration: 0.4 }, 0.25);
      geste(t, item);
      return t;
    };

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .fromTo(slide.querySelector('.ecran'), { clipPath: 'inset(0% 100% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1, ease: 'power3.inOut' }, 0.1)
        .from(slide.querySelector('.ecran__image img'), { scale: 1.3, duration: 1.6, ease: 'power3.out' }, 0.1)
        .from(nom.chars, { yPercent: 110, duration: 0.8, stagger: 0.03, ease: 'expo.out' }, 0.3),
      () => jalon(jalons[0]),
      () => jalon(jalons[1], (t) => t
        .fromTo(fil, { drawSVG: '0% 0%' }, { drawSVG: '0% 48%', duration: 0.5, immediateRender: false }, 0)
        .from(jalons[1].querySelector('.jalon__marque img'), { rotation: -360, duration: 1, ease: 'power2.out' }, 0)
        .from(jalons[1].querySelector('.jalon__initiative'), { y: 14, autoAlpha: 0, duration: 0.5 }, 0.5)),
      () => jalon(jalons[2], (t) => t
        .fromTo(fil, { drawSVG: '0% 48%' }, { drawSVG: '0% 100%', duration: 0.5, immediateRender: false }, 0)
        .add(taper(slide.querySelector('.ecran__url'), 0.025), 0.3)),
      () => {
        const poids = slide.querySelector('.poids');
        return gsap.timeline()
          .from(poids.querySelectorAll('.poids__avant, .poids__fleche, .poids__apres'), { y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0)
          .from(poids.querySelector('.poids__barre'), { autoAlpha: 0, duration: 0.3 }, 0.1)
          .from(poids.querySelector('.poids__label'), { y: 14, autoAlpha: 0, duration: 0.4 }, 0.2)
          .add(compter(poids.querySelector('.poids__apres'), 10400, 534, 1.5, (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} Mo` : `${Math.round(n)} Ko`)), 0.3)
          .fromTo(poids.querySelector('.poids__barre span'), { scaleX: 1 }, { scaleX: 534 / 10400, duration: 1.5, ease: 'power2.out', immediateRender: false }, 0.3)
          .from(poids.querySelector('.poids__badge'), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 1.6);
      },
      () => {
        const garde = slide.querySelector('.garde');
        const bouclier = garde.querySelector('.garde__bouclier');
        return gsap.timeline()
          .from(garde.querySelector('.garde__voile'), { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0)
          .to(slide.querySelector('.ecran__image img'), { scale: 1.06, duration: 0.8, ease: 'power2.out' }, 0)
          .to(slide.querySelector('.bluel'), { opacity: 0.4, duration: 0.6 }, 0)
          // Le bouclier tombe de haut, s'écrase sur le voile et lâche une onde
          .from(bouclier, { scale: 2.6, autoAlpha: 0, duration: 0.55, ease: 'power4.in' }, 0.1)
          .to(bouclier, { scaleX: 1.12, scaleY: 0.9, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.out' }, 0.65)
          .fromTo(garde.querySelector('.garde__onde'), { scale: 1, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 0.65)
          .fromTo(garde.querySelectorAll('.garde__icone path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.25, ease: 'power2.inOut' }, 0.6)
          .add(decoder(garde.querySelector('.garde__titre'), 0.7), 0.7)
          .from(garde.querySelector('.garde__but'), { y: 16, autoAlpha: 0, duration: 0.5 }, 1);
      },
      // Chaque garde-fou a son geste : l'aiguille de la jauge retombe, le cadre de l'image se trace, la flèche revient en arrière
      () => gardeFou(0, (t, item) => t
        .from(item.querySelector('.garde__aiguille'), { rotation: 90, svgOrigin: '12 14', duration: 0.8, ease: 'elastic.out(1, 0.45)' }, 0.15)),
      () => gardeFou(1, (t, item) => t
        .fromTo(item.querySelectorAll('.garde__picto > *'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.1, ease: 'power2.inOut' }, 0.1)),
      () => gardeFou(2, (t, item) => t
        .from(item.querySelector('.garde__picto'), { rotation: 360, transformOrigin: '50% 50%', duration: 0.9, ease: 'power3.out' }, 0.1))
    ]);
  }

  /* Diapositive 6 : ma façon de travailler, illustrée par Sophie Bluel. Un principe à gauche, son exemple à droite.
     e1 comprendre : le principe seul ; e2 Kasa, mon seul projet React, puis Sophie Bluel réécrit ;
     e3 Kasa lit un fichier, pas d'API ; e4 Sophie Bluel reçoit ses données d'une API : le code arrive, le useEffect et l'appel à l'API s'éclairent ;
     e5 soigner les détails : la fenêtre d'ajout de Sophie Bluel, un double clic sur « Valider » crée deux projets ;
     e6 le bouton passe à « Envoi en cours… » et y reste, le second clic est ignoré ; e7 le cahier de bord s'écrit. */
  function construireFacon() {
    const slide = document.getElementById('slide-06');
    const principes = slide.querySelectorAll('.principe');
    const [loupe, details, journal] = slide.querySelectorAll('.scene');
    const mots = Array.from(principes).map((p) => decouper(p.querySelector('.principe__mot'), 'words'));

    const principe = (k) => {
      const p = principes[k];
      const t = gsap.timeline()
        .from(p.querySelector('.principe__num'), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 0)
        .from(mots[k].words, { yPercent: 110, duration: 0.7, stagger: 0.05, ease: 'expo.out' }, 0.05)
        .from(p.querySelector('.principe__detail'), { y: 16, autoAlpha: 0, duration: 0.5 }, 0.25);
      if (k > 0) t.to(principes[k - 1], { opacity: 0.4, duration: 0.4 }, 0);
      return t;
    };
    const changerScene = (avant, apres) => {
      const t = gsap.timeline();
      if (avant) t.to(avant, { autoAlpha: 0, y: -30, duration: 0.35, ease: 'power2.in' }, 0);
      return t.set(apres, { autoAlpha: 1 }, avant ? 0.3 : 0);
    };

    // Kasa et Sophie Bluel : les cartes, puis la source de leurs données
    const cartesProjet = loupe.querySelectorAll('.pratique__carte');
    const [donneesKasa, donneesBluel] = loupe.querySelectorAll('.pratique__donnees');
    gsap.set(cartesProjet, { autoAlpha: 0, y: 30 });
    gsap.set([donneesKasa, donneesBluel], { autoAlpha: 0, scale: 0.6, transformOrigin: '0% 50%' });

    // Le code qui charge les projets : ses deux lignes clés et leurs explications
    const lignes = loupe.querySelectorAll('.loupe__ligne');
    const notes = loupe.querySelectorAll('.loupe__note');
    gsap.set(notes, { autoAlpha: 0, x: 20 });

    // Kasa, seul projet React ; puis Sophie Bluel, réécrit pour pratiquer
    const sceneProjets = () => gsap.timeline()
      .to(cartesProjet[0], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0)
      .to(cartesProjet[1], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.7);

    const sourceDonnees = (puce) => gsap.to(puce, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' });

    // L'API : la puce de Sophie Bluel, le code arrive net ; les deux lignes clés s'éclairent
    // avec leur explication, les autres s'effacent
    const sceneApi = () => gsap.timeline()
      .add(sourceDonnees(donneesBluel), 0)
      .from(loupe.querySelector('.loupe'), { y: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
      .to([lignes[1], lignes[3], lignes[4], lignes[5], lignes[6]], { opacity: 0.45, duration: 0.4 }, 0.7)
      .to([lignes[0], lignes[2]], { backgroundColor: 'rgba(255, 176, 138, 0.16)', boxShadow: 'inset 4px 0 0 rgba(255, 176, 138, 1)', duration: 0.4, stagger: 0.5 }, 0.7)
      .to(notes, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.5, ease: 'power3.out' }, 0.75);

    // Changer le texte du bouton en fondu : l'ancien glisse vers le haut, le nouveau arrive par le bas
    const changerTexte = (el, texte) => gsap.timeline()
      .to(el, { y: -14, autoAlpha: 0, duration: 0.18, ease: 'power2.in' })
      .set(el, { text: texte })
      .fromTo(el, { y: 14 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: 'power2.out', immediateRender: false });

    // La fenêtre d'ajout de Sophie Bluel : le curseur, l'onde de chaque clic, le bouton « Valider »
    const fenetre = details.querySelector('.sbm');
    const bouton = details.querySelector('.sbm__bouton');
    const texte = details.querySelector('.sbm__texte');
    const curseur = details.querySelector('.sbm__curseur');
    const onde = details.querySelector('.sbm__onde');
    const refus = details.querySelector('.sbm__refus');
    const [noteDouble, noteCorrige] = details.querySelectorAll('.sbm__note');
    gsap.set(curseur, { x: 260, y: -160, autoAlpha: 0 });
    gsap.set([onde, refus, noteDouble, noteCorrige], { autoAlpha: 0 });
    gsap.set([noteDouble, noteCorrige], { x: -20 });

    const cliquer = (t, a) => t
      .to(curseur, { scale: 0.82, transformOrigin: '15% 8%', duration: 0.08, yoyo: true, repeat: 1 }, a)
      .fromTo(onde, { scale: 0.3, autoAlpha: 0.9 }, { scale: 2, autoAlpha: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, a);

    // La fenêtre arrive, le curseur va sur « Valider » : deux clics à la suite, deux projets identiques
    const sceneDoubleClic = () => {
      const t = gsap.timeline()
        .add(changerScene(loupe, details), 0)
        .from(fenetre, { y: 60, scale: 0.94, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
        .to(curseur, { x: 0, y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.8);
      cliquer(t, 1.5);
      cliquer(t, 1.85);
      return t.to(noteDouble, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 2.1);
    };

    // La correction : au clic, le bouton passe à « Envoi en cours… » et y reste ; le second clic est ignoré
    const sceneCorrige = () => {
      const t = gsap.timeline()
        .to(noteDouble, { autoAlpha: 0, duration: 0.3 }, 0);
      cliquer(t, 0.35);
      cliquer(t, 0.9);
      return t
        .add(changerTexte(texte, 'Envoi en cours…'), 0.4)
        .to(bouton, { opacity: 0.7, duration: 0.3 }, 0.4)
        .fromTo(refus, { y: 10 }, { y: 0, autoAlpha: 1, duration: 0.3, immediateRender: false }, 0.95)
        .to(noteCorrige, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 1.2);
    };

    // Le cahier de bord de Sophie Bluel : ses entrées s'écrivent, les deux premières sont celles qu'on vient de voir
    const sceneJournal = () => {
      const t = gsap.timeline()
        .add(changerScene(details, journal), 0)
        .from(journal.querySelector('.journal'), { y: 60, rotation: -3, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.35)
        .from(journal.querySelector('.journal__titre'), { y: 20, autoAlpha: 0, duration: 0.5 }, 0.6);
      let debut = 0.9;
      journal.querySelectorAll('.journal__entrees li').forEach((li) => {
        const tape = taper(li.querySelector('.journal__texte'), 0.028);
        t.add(tape, debut).from(li.querySelector('.journal__coche'), { scale: 0, duration: 0.3, ease: 'back.out(3)' }, debut + tape.duration());
        debut += tape.duration() + 0.15;
      });
      return t.from(journal.querySelector('.journal__pourquoi'), { y: 14, autoAlpha: 0, duration: 0.5 }, debut);
    };

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline().add(entreeTete(slide), 0).add(principe(0), 0.15).add(changerScene(null, loupe), 0.2),
      () => sceneProjets(),
      () => sourceDonnees(donneesKasa),
      () => sceneApi(),
      () => gsap.timeline().add(principe(1), 0).add(sceneDoubleClic(), 0),
      () => sceneCorrige(),
      () => gsap.timeline().add(principe(2), 0).add(sceneJournal(), 0)
    ]);
  }

  /* Diapositive 7 : ce que je cherche.
     e1 la cible se verrouille, le poste se décode ; e2 une équipe à taille humaine se rassemble ;
     e3 je gravis les marches, aux côtés des développeurs expérimentés. */
  function construireCherche() {
    const slide = document.getElementById('slide-07');
    const marches = slide.querySelector('.progres__marches path');
    const moi = slide.querySelector('.progres__moi');
    const L = marches.getTotalLength();
    const curseur = { l: 0 };
    const grimper = () => {
      const p = marches.getPointAtLength(curseur.l);
      gsap.set(moi, { x: p.x, y: p.y - 26 });
    };
    grimper();
    const nomEquipe = decouper(slide.querySelector('.equipe__nom'), 'words');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(slide.querySelectorAll('.cible__anneau'), { scale: 2.4, autoAlpha: 0, svgOrigin: '60 60', duration: 0.8, stagger: 0.12, ease: 'power3.out' }, 0.1)
        .fromTo(slide.querySelector('.cible__viseur'), { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.6, ease: 'power2.out' }, 0.5)
        .from(slide.querySelector('.cible__centre'), { scale: 0, svgOrigin: '60 60', duration: 0.5, ease: 'back.out(4)' }, 0.8)
        .to(slide.querySelectorAll('.cible__anneau'), { stroke: '#ffb08a', duration: 0.3, stagger: 0.05 }, 0.9)
        .from(slide.querySelector('.recherche__label'), { y: 20, autoAlpha: 0, duration: 0.5 }, 0.3)
        .add(decoder(slide.querySelectorAll('.cible__ligne')[0], 0.6), 0.4)
        .add(decoder(slide.querySelectorAll('.cible__ligne')[1], 0.8), 0.7),
      () => gsap.timeline()
        .from(slide.querySelectorAll('.avatar'), { scale: 0, y: 40, duration: 0.6, stagger: 0.08, ease: 'back.out(2)' }, 0)
        .from(nomEquipe.words, { yPercent: 110, duration: 0.7, stagger: 0.04, ease: 'expo.out' }, 0.3)
        .from(slide.querySelectorAll('.equipe .puce'), { y: 30, scale: 0.8, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(2)' }, 0.6),
      () => gsap.timeline()
        .fromTo(marches, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 0)
        .from(slide.querySelectorAll('.progres__senior'), { scale: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(2)' }, 0.5)
        .from(slide.querySelector('.progres__texte'), { y: 20, autoAlpha: 0, duration: 0.6 }, 0.3)
        .to(moi, { opacity: 1, duration: 0.3 }, 0.8)
        .fromTo(curseur, { l: 0 }, { l: L * 0.86, duration: 1.6, ease: 'power1.inOut', onUpdate: grimper, immediateRender: false }, 0.9)
    ]);
  }

  /* Diapositive 8 : ce que je veux approfondir.
     e1 TypeScript : la carte prend de la profondeur ; e2 l'architecture back-end, idem, et son schéma se trace ;
     e3 le mobile : le téléphone de GymTracker monte ; e4 le signal de la démo : tout s'efface, une barre de
     navigateur saisit l'adresse du portfolio et la page charge. */
  function construireApprofondir() {
    const slide = document.getElementById('slide-08');
    const [ts, archi] = slide.querySelectorAll('.profond');
    const suite = slide.querySelector('.suite');
    const titreSuite = decouper(suite.querySelector('.suite__titre'), 'words');

    // Approfondir : la face arrive, puis ses calques s'écartent derrière elle, comme une pile qui se creuse
    const creuser = (carte) => {
      const [c1, c2] = carte.querySelectorAll('.profond__calque');
      return gsap.timeline()
        .from(carte.querySelector('.profond__face'), { scale: 0.85, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0)
        .fromTo(c1, { x: 0, y: 0, autoAlpha: 0 }, { x: 22, y: 22, autoAlpha: 0.7, duration: 0.6, ease: 'power2.out' }, 0.4)
        .fromTo(c2, { x: 0, y: 0, autoAlpha: 0 }, { x: 44, y: 44, autoAlpha: 0.4, duration: 0.6, ease: 'power2.out' }, 0.5)
        .from(carte.querySelector('.profond__nom'), { y: 20, autoAlpha: 0, duration: 0.5 }, 0.3);
    };

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .add(creuser(ts), 0.15)
        .from(ts.querySelector('.ts'), { rotation: -15, scale: 0.6, duration: 0.7, ease: 'back.out(2)' }, 0.25),
      () => gsap.timeline()
        .add(creuser(archi), 0)
        .fromTo(archi.querySelectorAll('.archi rect'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.15 }, 0.2)
        .fromTo(archi.querySelector('.archi path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5 }, 0.6)
        .from(archi.querySelectorAll('.archi text'), { autoAlpha: 0, duration: 0.4, stagger: 0.12 }, 0.5),
      () => gsap.timeline()
        .from(slide.querySelector('.telephone'), { y: 160, rotation: 6, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, 0)
        .from(slide.querySelectorAll('.mobile .profond__nom, .mobile__detail'), { y: 20, autoAlpha: 0, duration: 0.5, stagger: 0.1 }, 0.4)
        .from(slide.querySelector('.mobile__detail svg'), { rotation: -180, scale: 0, duration: 0.8, ease: 'back.out(2)' }, 0.6),
      // « Passons à la visite, sur le navigateur » : l'adresse se tape, la page charge
      () => gsap.timeline()
        .to(slide.querySelector('.approf'), { autoAlpha: 0, scale: 0.94, duration: 0.5, ease: 'power2.inOut' }, 0)
        .set(suite, { visibility: 'inherit' }, 0.2)
        .from(suite.querySelector('.suite__fenetre'), { y: 40, scale: 0.9, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.2)
        .add(taper(suite.querySelector('.suite__url'), 0.025), 0.5)
        .fromTo(suite.querySelector('.suite__chargement'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 1.4)
        .add(decoder(suite.querySelector('.suite__kicker'), 0.7), 0.4)
        .from(titreSuite.words, { yPercent: 110, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, 0.5)
    ]);
  }

  /* ---------- Diapositives 9 à 12 : la construction du site ---------- */

  // Une copie qui vole d'un élément à un autre, en arc (mesurée avant toute animation)
  const preparerVol = (classe, texte, depart, arrivee, repere) => {
    const vol = document.createElement('span');
    vol.className = classe;
    vol.setAttribute('aria-hidden', 'true');
    vol.textContent = texte;
    repere.append(vol);
    const d = positionDans(depart, repere);
    const a = positionDans(arrivee, repere);
    gsap.set(vol, { x: d.x, y: d.y, autoAlpha: 0 });
    return { vol, d, a };
  };
  const voler = ({ vol, d, a }, duree = 0.9, hauteur = 70) => gsap.timeline()
    .set(vol, { autoAlpha: 1 })
    .to(vol, { x: a.x, duration: duree, ease: 'power2.inOut' }, 0)
    .to(vol, { y: Math.min(d.y, a.y) - hauteur, duration: duree / 2, ease: 'power2.out' }, 0)
    .to(vol, { y: a.y, duration: duree / 2, ease: 'power2.in' }, duree / 2);

  /* Diapositive 9 : les données des projets. Le fichier JSON à gauche, la liste et la fiche à droite.
     e1 « les projets sont rangés dans un fichier JSON » : le fichier, puis la liste et la fiche Kasa ;
     e2 map : chaque objet du fichier crée sa ligne dans la liste, l'un après l'autre ;
     e3 une seule page pour toutes les fiches : la fiche passe d'un projet à l'autre ;
     e4 elle lit l'identifiant : « kasa » dans l'adresse, la fiche attend ses données ;
     e5 find : la recherche parcourt le fichier, s'arrête sur Kasa, la fiche se remplit ;
     e6 un projet ajouté au fichier : sa ligne dans la liste, et sa propre fiche. */
  function construireDonnees() {
    const slide = document.getElementById('slide-09');
    const json = slide.querySelector('.jd__json');
    const lignes = json.querySelectorAll('.vsc__ligne');
    const objets = [1, 2, 3, 4].map((i) => lignes[i]);
    const nouvelle = slide.querySelector('.jd__nouvelle');
    const rangs = slide.querySelectorAll('.jd__rang');
    const contenus = {};
    slide.querySelectorAll('.jd__contenu').forEach((c) => { contenus[c.dataset.id] = c; });
    const id = slide.querySelector('.jd__id');

    // Une ligne du fichier qui s'allume : ambre pendant la lecture, vert quand c'est la bonne
    const allumer = (ligne, couleur = '254,188,46') => ({ backgroundColor: `rgba(${couleur},0.18)`, borderLeftColor: `rgba(${couleur},1)`, duration: 0.2 });
    const eteindre = { backgroundColor: 'rgba(254,188,46,0)', borderLeftColor: 'rgba(254,188,46,0)', duration: 0.25 };
    // Le contenu de la fiche change : l'ancien monte et s'efface, le nouveau arrive par le bas
    const montrer = (c) => gsap.fromTo(c, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out', immediateRender: false });
    const cacher = (c) => gsap.to(c, { autoAlpha: 0, y: -24, duration: 0.3, ease: 'power2.in' });
    const changerFiche = (de, vers) => gsap.timeline()
      .add(cacher(contenus[de]), 0)
      .to(id, { text: vers, duration: 0.3 }, 0)
      .add(montrer(contenus[vers]), 0.2);

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      // « Les projets sont rangés dans un fichier JSON » : le fichier d'abord, puis les pages qu'il alimente
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(json, { x: -60, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
        .from(lignes, { x: -20, autoAlpha: 0, duration: 0.35, stagger: 0.06 }, 0.35)
        .from(slide.querySelector('.jd__accueil'), { x: 40, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0.8)
        .from([rangs[0], rangs[1], rangs[2], rangs[3]], { x: 20, autoAlpha: 0, duration: 0.4, stagger: 0.06 }, 1)
        .from(slide.querySelector('.jd__fiche'), { x: 40, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0.95)
        .add(montrer(contenus.kasa), 1.2),

      // map : un objet du fichier, une ligne dans la liste
      () => {
        const t = gsap.timeline()
          .fromTo(slide.querySelector('.jd__fleche-map'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' }, 0)
          .from(slide.querySelector('.jd__pilule--map'), { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.5)' }, 0.3)
          .to([rangs[0], rangs[1], rangs[2], rangs[3]], { autoAlpha: 0, duration: 0.2 }, 0.2);
        objets.forEach((objet, k) => {
          const debut = 0.6 + k * 0.45;
          t.to(objet, allumer(objet), debut)
            .fromTo(rangs[k], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, debut + 0.12)
            .to(objet, eteindre, debut + 0.4);
        });
        return t;
      },

      // Une seule page pour toutes les fiches : elle passe d'un projet à l'autre
      () => gsap.timeline()
        .from(slide.querySelector('.jd__composant'), { y: 14, autoAlpha: 0, duration: 0.4 }, 0)
        .add(changerFiche('kasa', 'sophie-bluel'), 0.3)
        .add(changerFiche('sophie-bluel', 'mon-vieux-grimoire'), 0.9)
        .add(changerFiche('mon-vieux-grimoire', 'gym-tracker'), 1.5),

      // Elle lit l'identifiant dans l'adresse : la fiche se vide, en attente de ses données
      () => gsap.timeline()
        .add(cacher(contenus['gym-tracker']), 0)
        .to(id, { text: 'kasa', duration: 0.3 }, 0)
        .to(id, { backgroundColor: '#bf4f1c', duration: 0.3 }, 0.3)
        .from(slide.querySelector('.jd__note'), { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.out(3)' }, 0.4),

      // find : la recherche parcourt le fichier et s'arrête sur Kasa ; la fiche se remplit
      () => gsap.timeline()
        .fromTo(slide.querySelector('.jd__fleche-find'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' }, 0)
        .from(slide.querySelector('.jd__pilule--find'), { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.5)' }, 0.3)
        .to(objets[0], allumer(objets[0]), 0.6)
        .to(objets[0], eteindre, 0.85)
        .to(objets[1], allumer(objets[1], '74,222,128'), 0.9)
        .add(montrer(contenus.kasa), 1.2),

      // Un projet de plus dans le fichier : sa ligne, et sa fiche
      () => gsap.timeline()
        .to(objets[1], eteindre, 0)
        .to(nouvelle, { height: 42, duration: 0.4, ease: 'power2.out' }, 0.1)
        .to(slide.querySelector('.jd__num-fin'), { text: '7', duration: 0.1 }, 0.1)
        .to(nouvelle, allumer(nouvelle, '74,222,128'), 0.3)
        .fromTo(nouvelle.querySelector('code'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'steps(28)' }, 0.4)
        .to(slide.querySelectorAll('.jd__fleches path'), { stroke: '#4ade80', duration: 0.3 }, 1.1)
        .fromTo(rangs[4], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, 1.25)
        .to(rangs[4], { backgroundColor: 'rgba(74,222,128,0.16)', duration: 0.3 }, 1.4)
        .add(changerFiche('kasa', 'nouveau-projet'), 1.45)
    ]);
  }

  /* Diapositive 10 : le mood board.
     e1 « Voyons maintenant le design system » : l'en-tête ; e2 le glassmorphisme, démontré : un fond coloré,
     puis un panneau de verre qui glisse dessus en se floutant ; e3 le mood board : les images tombent et
     s'épinglent ; e4 la pipette prélève les couleurs et le grain, la palette se compose ;
     e5 la typographie et l'étoile, entourées sur l'image, puis reprises à droite. */
  function construireMoodboard() {
    const slide = document.getElementById('slide-10');
    const demo = slide.querySelector('.mb__demo');
    const photos = slide.querySelectorAll('.mb__photo');
    const teintes = slide.querySelectorAll('.mb__teinte');
    const pipette = (nom) => slide.querySelector(`.mb__pipette--${nom}`);
    // Une pipette par teinte, dans l'ordre de la palette : bleu nuit, rouge, orange, bleu, grain
    const prelevements = ['nuit', 'rouge', 'orange', 'bleue', 'grain'].map(pipette);
    const aa = decouper(slide.querySelector('.mb__aa'), 'chars');

    // Le survol : un élément du mood board et son équivalent à droite (même data-lien) avancent ensemble
    const mb = slide.querySelector('.mb');
    slide.querySelectorAll('[data-lien]').forEach((el) => {
      const lies = Array.from(slide.querySelectorAll(`[data-lien="${el.dataset.lien}"]`));
      // Pas de survol tant que l'étape n'a pas montré la paire (le titre à droite, ou l'élément lui-même)
      const montre = () => lies.every((l) => getComputedStyle(l.querySelector('.mb__sous-titre') ?? l).visibility !== 'hidden');
      el.addEventListener('mouseenter', () => {
        if (!montre()) return;
        lies.forEach((l) => l.classList.add('est-survole'));
        mb.classList.add('a-survol');
      });
      el.addEventListener('mouseleave', () => {
        slide.querySelectorAll('.est-survole').forEach((l) => l.classList.remove('est-survole'));
        mb.classList.remove('a-survol');
      });
    });

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline().add(entreeTete(slide), 0),

      // Le glassmorphisme : un fond coloré, puis du verre dépoli posé dessus
      () => gsap.timeline()
        .from(demo, { y: 30, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0)
        .from(slide.querySelectorAll('.mb__tache'), { scale: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.6)' }, 0.2)
        .from(slide.querySelectorAll('.mb__legende li')[0], { y: 16, autoAlpha: 0, duration: 0.4 }, 0.5)
        .fromTo(slide.querySelector('.mb__verre'), { x: -620, '--flou': '0px' }, { x: 0, '--flou': '24px', duration: 1.2, ease: 'power3.out' }, 0.9)
        .from(slide.querySelectorAll('.mb__legende li')[1], { y: 16, autoAlpha: 0, duration: 0.4 }, 1.3),

      // Le mood board : la démonstration s'efface, les images tombent et s'épinglent
      () => gsap.timeline()
        .to(demo, { autoAlpha: 0, scale: 0.92, y: -20, duration: 0.4, ease: 'power2.in' }, 0)
        .from(slide.querySelector('.mb__titre-board'), { y: -10, autoAlpha: 0, duration: 0.4 }, 0.3)
        .from(photos, { y: -140, rotation: '+=10', autoAlpha: 0, duration: 0.8, stagger: 0.22, ease: 'back.out(1.4)' }, 0.35)
        .from(slide.querySelectorAll('.mb__punaise'), { scale: 0, y: -20, duration: 0.35, stagger: 0.22, ease: 'back.out(3)' }, 0.95),

      // La palette : la pipette prélève chaque couleur sur les images
      () => {
        const t = gsap.timeline().from(slide.querySelector('.mb__palette .mb__sous-titre'), { y: 14, autoAlpha: 0, duration: 0.4 }, 0);
        prelevements.forEach((p, k) => {
          t.from(p, { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.out(3)' }, 0.2 + k * 0.32)
            .from(teintes[k], { y: 30, scale: 0.6, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, 0.35 + k * 0.32);
        });
        return t;
      },

      // La typographie et l'étoile : entourées sur l'image, puis reprises
      () => gsap.timeline()
        .fromTo(slide.querySelector('.mb__entoure--type'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' }, 0)
        .from(slide.querySelector('.mb__typo .mb__sous-titre'), { y: 14, autoAlpha: 0, duration: 0.4 }, 0.3)
        .from(aa.chars, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.35)
        .from(slide.querySelector('.mb__police'), { y: 14, autoAlpha: 0, duration: 0.4 }, 0.6)
        .fromTo(slide.querySelector('.mb__entoure--etoile'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' }, 0.8)
        .from(slide.querySelector('.mb__etoile .mb__sous-titre'), { y: 14, autoAlpha: 0, duration: 0.4 }, 1)
        .fromTo(slide.querySelectorAll('.mb__etoile path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.12, ease: 'power2.inOut' }, 1.05)
    ]);
  }

  /* Diapositive 11 : le design system en Sass.
     e1 les variables, groupe par groupe : couleurs, verre, arrondis ; e2 on change deux couleurs dans le code,
     le mini-site se recolore, et aucun composant n'est touché ; e3 le mixin du verre remplace les variables ;
     e4 ses quatre @include : l'en-tête, le Hero, les filtres et le champ passent en verre, un par un. */
  function construireSass() {
    const slide = document.getElementById('slide-11');
    const variables = slide.querySelector('.ds__variables');
    const mixin = slide.querySelector('.ds__mixin');
    const apercu = slide.querySelector('.ds__apercu');
    const composants = slide.querySelectorAll('.ds__comp');
    const valeurs = slide.querySelectorAll('.ds__valeur');
    const includes = slide.querySelectorAll('.ds__include');
    const lignesMixin = Array.from(mixin.querySelectorAll('.vsc__ligne')).filter((l) => !l.classList.contains('ds__include'));
    const noteComposants = slide.querySelector('.ds__note--composants');

    const allumer = { backgroundColor: 'rgba(254,188,46,0.18)', borderLeftColor: 'rgba(254,188,46,1)', duration: 0.2 };
    const eteindre = { backgroundColor: 'rgba(254,188,46,0)', borderLeftColor: 'rgba(254,188,46,0)', duration: 0.25 };
    const groupe = (nom) => slide.querySelectorAll(`.ds__groupe--${nom}`);
    // Une valeur change dans le code : son texte, la pastille de couleur devant elle
    const changerValeur = (el, couleur) => gsap.timeline()
      .to(el, { text: couleur, duration: 0.4, ease: 'none' }, 0)
      .to(el.previousElementSibling, { backgroundColor: couleur, duration: 0.3 }, 0.2);

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      // Les variables, groupe par groupe
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(variables, { x: -60, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
        .from(variables.querySelectorAll('.vsc__ligne'), { x: -16, autoAlpha: 0, duration: 0.3, stagger: 0.04 }, 0.3)
        .to(groupe('couleurs'), allumer, 1)
        .to(groupe('couleurs'), eteindre, 1.5)
        .to(groupe('verre'), allumer, 1.5)
        .to(groupe('verre'), eteindre, 2)
        .to(groupe('arrondis'), allumer, 2)
        .to(groupe('arrondis'), eteindre, 2.5),

      // Changer la palette : deux valeurs changent dans le code, le site se recolore, les composants ne bougent pas
      () => gsap.timeline()
        .from(apercu, { x: 60, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0)
        .from(composants, { y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.08 }, 0.3)
        .to(valeurs[0].closest('.vsc__ligne'), allumer, 1)
        .add(changerValeur(valeurs[0], valeurs[0].dataset.nouvelle), 1.05)
        .to(apercu, { '--rouge': valeurs[0].dataset.nouvelle, duration: 0.6 }, 1.3)
        .to(valeurs[1].closest('.vsc__ligne'), allumer, 1.5)
        .add(changerValeur(valeurs[1], valeurs[1].dataset.nouvelle), 1.55)
        .to(apercu, { '--nuit': valeurs[1].dataset.nouvelle, duration: 0.6 }, 1.8)
        .from(noteComposants, { y: 14, autoAlpha: 0, duration: 0.4 }, 2.2),

      // Le mixin du verre : on revient à la vraie palette, les variables laissent la place au mixin
      () => gsap.timeline()
        .to([valeurs[0].closest('.vsc__ligne'), valeurs[1].closest('.vsc__ligne')], eteindre, 0)
        .add(changerValeur(valeurs[0], '#c42d1a'), 0)
        .add(changerValeur(valeurs[1], '#0b1a4a'), 0)
        .to(apercu, { '--rouge': '#c42d1a', '--nuit': '#0b1a4a', duration: 0.4 }, 0.1)
        .to(noteComposants, { autoAlpha: 0, duration: 0.3 }, 0)
        .to(variables, { x: -40, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0.3)
        .set(mixin, { visibility: 'inherit' }, 0.6)
        .from(mixin, { x: 40, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0.6)
        .from(lignesMixin, { x: -16, autoAlpha: 0, duration: 0.3, stagger: 0.07 }, 0.8)
        .from(slide.querySelector('.ds__note--mixin'), { y: 14, autoAlpha: 0, duration: 0.4 }, 1.4),

      // Le mixin réutilisé partout : chaque @include change son composant en verre
      () => {
        const t = gsap.timeline();
        includes.forEach((ligne, k) => {
          const debut = k * 0.6;
          t.from(ligne, { x: -16, autoAlpha: 0, duration: 0.3 }, debut)
            .to(ligne, allumer, debut + 0.1)
            .to(composants[k], { backgroundColor: 'rgba(10,20,64,0.2)', borderColor: 'rgba(255,255,255,0.4)', '--flou': '22px', duration: 0.5 }, debut + 0.2)
            .to(composants[k].querySelector('.ds__etiquette'), { opacity: 1, duration: 0.3 }, debut + 0.25)
            .to(ligne, eteindre, debut + 0.55);
        });
        return t;
      }
    ]);
  }

  /* Diapositive 12 : l'en-tête, puis les cinq [→] du script.
     Timelines finies et réversibles : les retours, D et la vue d'ensemble
     réutilisent le contrôleur du deck sans modifier la navigation. */
  function construireVerre() {
    const slide = document.getElementById('slide-12');
    const q = (s) => slide.querySelector(s);
    const probleme = q('.lv__probleme');
    const exemples = slide.querySelectorAll('.lv__exemple');
    const couleurs = q('.lv__couleurs');
    const comparaison = q('.lv__comparaison');
    const echantillons = slide.querySelectorAll('.lv__echantillon');
    const preference = q('.lv__preference');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline().add(entreeTete(slide), 0),
      // Premier clic : le fond uni seul, centré. Le verre attend le clic suivant.
      () => gsap.timeline()
        .from(probleme, { autoAlpha: 0, y: 24, duration: 0.5, ease: 'power3.out' }, 0)
        .fromTo(exemples[0], { x: 434, y: 30, autoAlpha: 0 }, { x: 434, y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 0.1),
      // Deuxième clic : le verre apparaît sur bleu nuit, puis la lueur trop claire
      // glisse sous le texte. Elle s'arrête au centre jusqu'au prochain clic.
      () => gsap.timeline()
        .to(exemples[0], { x: 0, duration: 0.7, ease: 'power3.inOut' }, 0)
        .to(q('.lv__probleme .lv__accroche'), { text: 'Avec du verre, le contraste dépend du fond', duration: 0.4, ease: 'none' }, 0)
        .from(exemples[1], { x: 30, autoAlpha: 0, duration: 0.65, ease: 'power3.out' }, 0.2)
        .to(q('.lv__lueur-mobile'), { x: 896, duration: 2.8, ease: 'sine.inOut' }, 1.1),
      // La palette et le seuil annoncé dans le script.
      () => gsap.timeline()
        .to(probleme, { autoAlpha: 0, y: -20, duration: 0.35 }, 0)
        .from(couleurs, { autoAlpha: 0, duration: 0.45 }, 0.3)
        .from(slide.querySelectorAll('.lv__palette span'), { y: 45, scale: 0.85, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, 0.35)
        .from(q('.lv__mesure'), { x: 45, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.55),
      // Même fond et même texte pour comparer uniquement les niveaux de verre.
      () => gsap.timeline()
        .to(couleurs, { autoAlpha: 0, y: -20, duration: 0.35 }, 0)
        .from(comparaison, { autoAlpha: 0, duration: 0.4 }, 0.3)
        .from([echantillons[0], echantillons[1]], { y: 42, autoAlpha: 0, duration: 0.65, stagger: 0.24, ease: 'power3.out' }, 0.35),
      // Le réglage du système s'allume et le troisième verre devient opaque.
      () => gsap.timeline()
        .from(preference, { y: 20, autoAlpha: 0, duration: 0.45 }, 0)
        .to(q('.lv__interrupteur'), { backgroundColor: '#27864e', duration: 0.35 }, 0.25)
        .to(q('.lv__interrupteur i'), { x: 32, duration: 0.35, ease: 'power2.inOut' }, 0.25)
        .from(echantillons[2], { y: 42, autoAlpha: 0, duration: 0.65, ease: 'power3.out' }, 0.4)
        .from(q('.lv__echantillon--contraste .lv__vitre'), { backgroundColor: 'rgba(10,20,64,0.2)', borderColor: 'rgba(255,255,255,0.28)', duration: 0.8 }, 0.65)
    ]);
  }

  /* Diapositive 13 : six clics, synchronisés avec le script.
     Aucun vrai focus ni formulaire à soumettre : les démonstrations ne capturent
     pas le clavier du présentateur. Tout est rembobinable par la timeline. */
  function construireAccessibilite() {
    const slide = document.getElementById('slide-13');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const navigation = q('.ac13__navigation');
    const formulaire = q('.ac13__formulaire');
    const focus = q('.ac13__focus');
    const reperes = ['entete', 'menu', 'contenu', 'pied'].map(n => q(`.ac13__${n}`));
    const lignes = qa('.ac13__liste li');
    const video = q('.ac13__video');
    const lecture = { temps: 0 };
    // La vidéo reste en pause. GSAP parcourt un court extrait et peut le rembobiner ;
    // aucune lecture autonome ne persiste en quittant la diapositive.
    const cadrerVideo = () => {
      if (video.readyState >= 1 && Math.abs(video.currentTime - lecture.temps) > 0.06) {
        video.currentTime = lecture.temps;
      }
    };
    // Un serveur statique simple peut ne pas gérer les requêtes Range : le média
    // chargé en Blob reste seekable, même dans ce cas. En file://, garder la source native.
    if (/^https?:$/.test(location.protocol)) {
      fetch(video.src).then(response => {
        if (!response.ok) throw new Error('Vidéo indisponible');
        return response.blob();
      }).then(blob => {
        video.src = URL.createObjectURL(blob);
        video.addEventListener('loadeddata', cadrerVideo, { once: true });
        video.load();
      }).catch(() => { /* La source locale et son poster restent disponibles. */ });
    }
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const entrer = (el) => gsap.from(el, { autoAlpha: 0, y: 24, duration: 0.55, ease: 'power3.out' });

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline().add(entreeTete(slide), 0),

      // Tab : le premier lien devient visible avec son contour de focus.
      () => gsap.timeline()
        .add(entrer(navigation), 0)
        .add(entrer(q('.ac13__texte--tab')), 0.15)
        .from(q('.ac13__evitement'), { y: -70, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.4)
        .from(focus, { autoAlpha: 0, scale: 1.08, duration: 0.45, ease: 'power2.out' }, 0.65),

      // Entrée : un trajet contourne le menu et rejoint le premier lien du contenu.
      () => gsap.timeline()
        .add(sortir(q('.ac13__texte--tab')), 0)
        .add(entrer(q('.ac13__texte--saut')), 0.3)
        .to(q('.ac13__evitement'), { autoAlpha: 0, y: -30, duration: 0.35 }, 0.25)
        .fromTo(q('.ac13__trajet path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 0.25)
        .to(focus, { left: 64, top: 414, width: 262, height: 66, duration: 0.9, ease: 'power3.inOut' }, 0.25),

      // La page devient une carte : les quatre balises se révèlent et sont parcourues.
      () => {
        const t = gsap.timeline()
          .add(sortir(q('.ac13__texte--saut')), 0)
          .to([focus, q('.ac13__trajet')], { autoAlpha: 0, duration: 0.3 }, 0)
          .add(entrer(q('.ac13__texte--reperes')), 0.25)
          .to(q('.ac13__menu'), { paddingRight: 125, gap: 18, fontSize: 18, duration: 0.4 }, 0.2);
        reperes.forEach((repere, i) => {
          const debut = 0.35 + i * 0.55;
          t.from(repere.querySelector(':scope > .ac13__balise'), { autoAlpha: 0, y: -12, duration: 0.4 }, debut)
            .from(lignes[i], { autoAlpha: 0, x: 25, duration: 0.4 }, debut)
            .to(repere, { borderColor: '#ffb08a', duration: 0.25 }, debut)
            .to(repere, { borderColor: 'rgba(255,255,255,0.55)', duration: 0.35 }, debut + 0.4);
        });
        return t;
      },

      // Deux champs invalides, chacun avec son propre message associé.
      () => gsap.timeline()
        .add(sortir(navigation), 0)
        .add(entrer(formulaire), 0.3)
        .add(entrer(q('.ac13__texte--erreurs')), 0.35)
        .to(qa('.ac13__saisie'), { borderColor: '#ffd2c4', duration: 0.4 }, 0.65)
        .from(qa('.ac13__erreur'), { autoAlpha: 0, y: -10, duration: 0.45, stagger: 0.2 }, 0.7)
        .from(q('.ac13__lien-erreur'), { scaleY: 0, transformOrigin: 'top', autoAlpha: 0, duration: 0.6 }, 0.9),

      // Le contour rejoint le premier champ. Les trois signaux sont distingués.
      () => gsap.timeline()
        .add(sortir(q('.ac13__texte--erreurs')), 0)
        .to(q('.ac13__lien-erreur'), { autoAlpha: 0, duration: 0.3 }, 0)
        .add(entrer(q('.ac13__texte--correction')), 0.3)
        .from(q('.ac13__focus-form'), { autoAlpha: 0, duration: 0.2 }, 0)
        .to(q('.ac13__focus-form'), {
          top: () => q('.ac13__champ--nom').offsetTop + q('.ac13__saisie--nom').offsetTop - 6,
          width: 774, height: 78, borderRadius: 18, duration: 0.85, ease: 'power3.inOut'
        }, 0.15)
        .from(q('.ac13__curseur'), { autoAlpha: 0, duration: 0.25 }, 0.85)
        .from(qa('.ac13__signaux p'), { autoAlpha: 0, x: 25, duration: 0.45, stagger: 0.25 }, 0.65),

      // Le réglage s'active : étoile immobilisée, vidéo remplacée par l'image du site,
      // défilement doux vers « Projets » remplacé par un saut direct.
      () => gsap.timeline()
        .add(sortir(formulaire), 0)
        .add(entrer(q('.ac13__mouvement')), 0.3)
        .fromTo(q('.ac13__etoile'), { rotation: 0 }, { rotation: 150, duration: 2.2, ease: 'none' }, 0.5)
        .fromTo(lecture, { temps: 0 }, { temps: 2.2, duration: 2.2, ease: 'none', onUpdate: cadrerVideo }, 0.5)
        .to(q('.ac13__toggle'), { backgroundColor: '#27864e', duration: 0.35 }, 2.35)
        .to(q('.ac13__toggle i'), { x: 38, duration: 0.35, ease: 'power2.inOut' }, 2.35)
        .from(q('.ac13__etat'), { autoAlpha: 0, duration: 0.3 }, 2.5)
        .to(video, { autoAlpha: 0, duration: 0.35 }, 2.7)
        .fromTo(q('.ac13__clic'), { scale: 1 }, { scale: 0.88, duration: 0.12, yoyo: true, repeat: 1 }, 0.6)
        .fromTo(q('.ac13__piste'), { y: 0 }, { y: -312, duration: 1.3, ease: 'power2.inOut' }, 0.75)
        .set(q('.ac13__piste'), { y: 0 }, 2.75)
        .fromTo(q('.ac13__clic'), { scale: 1 }, { scale: 0.88, duration: 0.12, yoyo: true, repeat: 1, immediateRender: false }, 2.9)
        .set(q('.ac13__piste'), { y: -312 }, 3.02)
        .from([q('.ac13__immobile'), q('.ac13__image-fixe'), q('.ac13__saut')], { autoAlpha: 0, y: 10, duration: 0.4 }, 2.7)
        .from(q('.ac13__confort'), { autoAlpha: 0, y: 18, duration: 0.5 }, 3)
    ]);
  }

  /* Diapositive 14 : un outil par scène ; l'exemple TypeScript et le build Vite
     ont chacun leur clic. Les extraits sont volontairement réduits pour l'oral. */
  function construireStack() {
    const slide = document.getElementById('slide-14');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const outils = qa('.st14__outils li');
    const scenes = ['react', 'typescript', 'vite', 'sass', 'router'].map(n => q(`.st14__${n}`));
    const entrer = (el) => gsap.from(el, { autoAlpha: 0, y: 26, duration: 0.55, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const allumer = (i) => {
      const t = gsap.timeline().to(outils[i], { borderTopColor: '#ffb08a', color: '#ffffff', duration: 0.4 }, 0)
        .from(outils[i].querySelector('img'), { scale: 0.8, duration: 0.5, ease: 'back.out(2)' }, 0);
      if (i > 0) t.to(outils[i - 1], { borderTopColor: 'rgba(255,255,255,0.25)', color: '#e0e5f5', duration: 0.4 }, 0);
      return t;
    };
    const changer = (i) => gsap.timeline()
      .add(sortir(i === 0 ? q('.st14__intro') : scenes[i - 1]), 0)
      .add(entrer(scenes[i]), 0.25)
      .add(allumer(i), 0.1);

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .add(entrer(q('.st14__intro')), 0.15)
        .from(outils, { autoAlpha: 0, y: 20, duration: 0.45, stagger: 0.08 }, 0.3),

      () => changer(0)
        .from(q('.st14__react-logo'), { scale: 0.8, autoAlpha: 0, duration: 0.65, ease: 'back.out(1.4)' }, 0.3)
        .from(q('.st14__react-logo img'), { rotation: -45, duration: 1, ease: 'power3.out' }, 0.3)
        .fromTo(q('.st14__pont path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }, 0.5)
        .from([q('.st14__react-origine'), q('.st14__react-cible')], { autoAlpha: 0, y: 20, duration: 0.5, stagger: 0.25 }, 0.5),

      // D'abord le type seul, centré. L'exemple de données attend le clic suivant.
      () => changer(1)
        .fromTo(q('.st14__type'), { x: 500, autoAlpha: 0 }, { x: 500, autoAlpha: 1, duration: 0.6 }, 0.3)
        .fromTo(q('.st14__contrat'), { x: 500, autoAlpha: 0 }, { x: 500, autoAlpha: 1, duration: 0.5 }, 0.6),

      // On omet title dans les données ; le diagnostic apparaît à l'affectation typée.
      () => gsap.timeline()
        .to(q('.st14__type'), { x: 0, duration: 0.65, ease: 'power3.inOut' }, 0)
        .add(sortir(q('.st14__contrat')), 0)
        .add(entrer(q('.st14__json')), 0.25)
        .add(entrer(q('.st14__verification')), 0.45)
        .to(q('.st14__json-title'), { autoAlpha: 0, x: 60, duration: 0.5, ease: 'power2.in' }, 0.85)
        .to(q('.st14__type-title'), { backgroundColor: 'rgba(255,176,138,0.18)', duration: 0.35 }, 1)
        .from(q('.st14__manquant'), { autoAlpha: 0, x: -15, duration: 0.4 }, 1.25)
        .to(q('.st14__affectation'), { textDecorationColor: '#ff8c8c', duration: 0.3 }, 1.35)
        .from(q('.st14__diagnostic'), { autoAlpha: 0, y: 12, duration: 0.5 }, 1.4),

      // Le serveur de développement : aucune durée fictive n'est affichée.
      () => changer(2)
        .add(entrer(q('.st14__terminal')), 0.3)
        .from(q('.st14__commande'), { text: '', duration: 0.55, ease: 'none' }, 0.4)
        .from([q('.st14__pret'), q('.st14__local')], { autoAlpha: 0, y: 12, duration: 0.35, stagger: 0.1 }, 0.95)
        .fromTo(q('.st14__flux path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5 }, 1.05)
        .add(entrer(q('.st14__dev-apercu')), 1.15),

      // Un clic distinct pour le build et les fichiers produits.
      () => gsap.timeline()
        .to(q('.st14__commande'), { text: 'npm run build', duration: 0.45, ease: 'none' }, 0)
        .to(q('.st14__vite-raison'), { text: 'Construire une version optimisée', duration: 0.45 }, 0)
        .to([q('.st14__pret'), q('.st14__local'), q('.st14__dev-apercu')], { autoAlpha: 0, duration: 0.35 }, 0)
        .add(entrer(q('.st14__production')), 0.4)
        .from(qa('.st14__fichiers > div'), { autoAlpha: 0, y: 35, duration: 0.5, stagger: 0.18, ease: 'power3.out' }, 0.65)
        .from([q('.st14__build-pret'), q('.st14__dist')], { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.1 }, 0.6)
        .from(q('.st14__livrable'), { autoAlpha: 0, y: 14, duration: 0.4 }, 1.15)
        .from(qa('.st14__optimisations li'), { autoAlpha: 0, x: -20, duration: 0.4, stagger: 0.2, ease: 'power3.out' }, 1.4),

      () => changer(3)
        .add(entrer(q('.st14__sass-code')), 0.3)
        .fromTo(q('.st14__distribution path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, ease: 'power2.inOut' }, 0.5)
        .from(qa('.st14__composant'), { autoAlpha: 0, x: 30, duration: 0.45, stagger: 0.22 }, 0.6)
        .to(qa('.st14__composant'), { backgroundColor: 'rgba(10,20,64,0.65)', borderColor: 'rgba(255,255,255,0.4)', '--flou': '22px', duration: 0.6, stagger: 0.22 }, 0.85),

      () => changer(4)
        .from(q('.st14__route'), { autoAlpha: 0, y: -15, duration: 0.5 }, 0.3)
        .fromTo(q('.st14__routes path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }, 0.55)
        .from(qa('.st14__fiche'), { autoAlpha: 0, y: 30, duration: 0.65, stagger: 0.2, ease: 'power3.out' }, 0.75)
    ]);
  }

  /* Diapositive 15 : une scène par idée. Le déploiement (GitHub → Vercel → le site),
     vercel.json et la 404 sans lui, Formspree puis la balance, l'absence de bibliothèque,
     les animations en CSS, le texte circulaire, et le principe avec les dépendances.
     Le repère du bas suit les trois sujets. */
  function construireHebergement() {
    const slide = document.getElementById('slide-15');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const rail = qa('.hb15__rail li');
    const scene = (n) => q(`.hb15__${n}`);
    const entrer = (el, duree = 0.55) => gsap.from(el, { autoAlpha: 0, y: 26, duration: duree, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const tracer = (el, duree = 0.6) => gsap.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: duree, ease: 'power2.inOut' });
    const surligner = { backgroundColor: 'rgba(232,105,46,0.16)', borderLeftColor: '#e8692e', duration: 0.3 };
    const eteindre = { backgroundColor: 'rgba(232,105,46,0)', borderLeftColor: 'rgba(232,105,46,0)', duration: 0.3 };
    const allumer = (i) => {
      const t = gsap.timeline().to(rail[i], { borderTopColor: '#ffb08a', color: '#ffffff', duration: 0.4 }, 0)
        .from(rail[i].querySelector('svg'), { scale: 0.7, duration: 0.5, ease: 'back.out(2)' }, 0);
      if (i > 0) t.to(rail[i - 1], { borderTopColor: 'rgba(255,255,255,0.25)', color: '#e0e5f5', duration: 0.4 }, 0);
      return t;
    };
    // La balance : le fléau tourne de θ, chaque plateau monte ou descend d'autant (demi-fléau de 500 px)
    // et se rapproche un peu du pied, comme le bout du fléau
    const pencher = (degres, duree = 0.8) => {
      const dy = 500 * Math.sin(degres * Math.PI / 180);
      const dx = 500 * (1 - Math.cos(degres * Math.PI / 180));
      return gsap.timeline()
        .to(q('.hb15__fleau'), { rotation: degres, duration: duree, ease: 'elastic.out(1, 0.55)' }, 0)
        .to(q('.hb15__plateau--gauche'), { x: dx, y: -dy, duration: duree, ease: 'elastic.out(1, 0.55)' }, 0)
        .to(q('.hb15__plateau--droite'), { x: -dx, y: dy, duration: duree, ease: 'elastic.out(1, 0.55)' }, 0);
    };
    const principe = decouper(q('.hb15__principe-texte'), 'words');
    const paquet = q('.hb15__paquet');
    const enveloppe = q('.hb15__enveloppe');
    const flash = q('.hb15__flash');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(rail, { autoAlpha: 0, y: 20, duration: 0.45, stagger: 0.08 }, 0.3),

      // Hébergé sur Vercel, relié au dépôt GitHub
      () => gsap.timeline()
        .add(allumer(0), 0)
        .add(entrer(scene('deploiement'), 0.3), 0)
        .from(q('.hb15__noeud--vercel'), { scale: 0.85, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.05)
        .from(q('.hb15__triangle'), { y: 30, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, 0.2)
        .from(q('.hb15__noeud--site'), { x: 40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.4)
        .from(q('.hb15__noeud--github'), { x: -40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.6)
        .add(tracer(qa('.hb15__liens--deploiement path')), 0.8),

      // git push : le paquet passe dans Vercel, qui construit, puis arrive sur le site
      () => gsap.timeline()
        .add(entrer(q('.hb15__terminal'), 0.4), 0)
        .from(q('.hb15__push'), { text: '', duration: 0.4, ease: 'none' }, 0.15)
        .set(paquet, { x: 390 }, 0.6)
        .to(paquet, { autoAlpha: 1, duration: 0.15 }, 0.6)
        .to(paquet, { x: 826, duration: 0.6, ease: 'power1.in' }, 0.6)
        .from(q('.hb15__etat--construction'), { autoAlpha: 0, y: 10, duration: 0.3 }, 1.05)
        .to(q('.hb15__etat--construction'), { autoAlpha: 0, duration: 0.25 }, 1.75)
        .from(q('.hb15__etat--deploye'), { autoAlpha: 0, y: 10, duration: 0.3 }, 1.85)
        .to(paquet, { x: 1290, duration: 0.5, ease: 'power1.out' }, 1.85)
        .to(paquet, { autoAlpha: 0, duration: 0.1 }, 2.3)
        .to(flash, { autoAlpha: 0.85, duration: 0.08 }, 2.3)
        .to(flash, { autoAlpha: 0, duration: 0.6 }, 2.38)
        .from(q('.hb15__maj'), { autoAlpha: 0, scale: 0.6, duration: 0.45, ease: 'back.out(2.5)' }, 2.4),

      // vercel.json : toutes les adresses vers index.html
      () => gsap.timeline()
        .add(sortir(scene('deploiement')), 0)
        .add(entrer(scene('reecriture'), 0.3), 0.25)
        .from(q('.hb15__config'), { x: -40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.3)
        .from(qa('.hb15__url'), { x: 30, autoAlpha: 0, duration: 0.4, stagger: 0.12 }, 0.6)
        .to(q('.hb15__ligne--source'), surligner, 0.85)
        .add(tracer(qa('.hb15__liens--reecriture path'), 0.6), 1.05)
        .from(q('.hb15__index'), { scale: 0.85, autoAlpha: 0, duration: 0.5, ease: 'back.out(1.8)' }, 1.45)
        .to(q('.hb15__ligne--destination'), surligner, 1.45),

      // Sans lui : on recharge /projet/kasa, et c'est la 404 de Vercel
      () => gsap.timeline()
        .to([...qa('.hb15__url'), q('.hb15__liens--reecriture'), q('.hb15__index')], { autoAlpha: 0, duration: 0.3 }, 0)
        .to(qa('.hb15__ligne--source, .hb15__ligne--destination'), eteindre, 0)
        .add(entrer(q('.hb15__navigateur')), 0.25)
        .to(q('.hb15__config'), { opacity: 0.3, duration: 0.4 }, 0.7)
        .from(q('.hb15__sans'), { autoAlpha: 0, scale: 1.4, duration: 0.4, ease: 'back.out(2)' }, 0.75)
        .to(q('.hb15__recharger'), { rotation: 360, duration: 0.6, ease: 'power2.inOut' }, 1.15)
        .from(q('.hb15__erreur'), { autoAlpha: 0, duration: 0.15 }, 1.7)
        .from(q('.hb15__erreur p'), { autoAlpha: 0, y: 12, duration: 0.35 }, 1.75)
        .from(q('.hb15__legende-404'), { autoAlpha: 0, y: 12, duration: 0.4 }, 2),

      // Formspree : le formulaire part en fetch, Formspree me l'envoie par e-mail
      () => gsap.timeline()
        .add(allumer(1), 0)
        .add(sortir(scene('reecriture')), 0)
        .add(entrer(scene('formulaire'), 0.3), 0.25)
        .from(q('.hb15__noeud--formspree'), { scale: 0.85, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.3)
        .from(q('.hb15__vu'), { autoAlpha: 0, y: 14, duration: 0.4 }, 0.7)
        .from(q('.hb15__form'), { x: -40, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0.6)
        .to(q('.hb15__envoyer'), { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, 1.15)
        .add(tracer(q('.hb15__lien--fetch'), 0.5), 1.3)
        .from(q('.hb15__libelle--fetch'), { autoAlpha: 0, duration: 0.3 }, 1.35)
        .set(enveloppe, { x: 410 }, 1.3)
        .to(enveloppe, { autoAlpha: 1, duration: 0.15 }, 1.3)
        .to(enveloppe, { x: 816, duration: 0.55, ease: 'power1.in' }, 1.3)
        .add(tracer(q('.hb15__lien--mail'), 0.5), 1.95)
        .from(q('.hb15__libelle--mail'), { autoAlpha: 0, duration: 0.3 }, 2)
        .to(enveloppe, { x: 1300, duration: 0.5, ease: 'power1.out' }, 1.95)
        .to(enveloppe, { autoAlpha: 0, duration: 0.1 }, 2.4)
        .from(q('.hb15__noeud--mail'), { x: 40, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 2.1),

      // Une API pour un seul formulaire : la balance penche du côté de l'API
      () => gsap.timeline()
        .add(sortir(scene('formulaire')), 0)
        .add(entrer(scene('balance'), 0.3), 0.25)
        .from([q('.hb15__pied'), q('.hb15__fleau'), q('.hb15__moyeu'), ...qa('.hb15__suspente')], { autoAlpha: 0, duration: 0.4 }, 0.3)
        .from(q('.hb15__charge--form'), { y: -120, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.45)
        .add(pencher(-3), 0.95)
        .from(qa('.hb15__bloc')[1], { y: -160, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 1.15)
        .add(pencher(4), 1.6)
        .from(qa('.hb15__bloc')[0], { y: -160, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 1.7)
        .add(pencher(7, 1.1), 2.15)
        .from(q('.hb15__verdict'), { autoAlpha: 0, y: 20, duration: 0.5, ease: 'power3.out' }, 2.4),

      // Pas de bibliothèque comme Framer Motion
      () => gsap.timeline()
        .add(allumer(2), 0)
        .add(sortir(scene('balance')), 0)
        .add(entrer(scene('bibli'), 0.3), 0.25)
        .from(q('.hb15__paquet-npm'), { y: 40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.3)
        .from(q('.hb15__install'), { text: '', duration: 0.6, ease: 'none' }, 0.6)
        .add(tracer(q('.hb15__rature path'), 0.4), 1.35)
        .to(q('.hb15__paquet-npm'), { opacity: 0.45, duration: 0.4 }, 1.45)
        .from(q('.hb15__tampon'), { autoAlpha: 0, scale: 1.6, duration: 0.45, ease: 'back.out(2)' }, 1.55)
        .from(q('.hb15__aucune'), { autoAlpha: 0, y: 16, duration: 0.45 }, 1.85),

      // Tout en CSS : les trois démonstrations, une à une
      () => gsap.timeline()
        .add(sortir(scene('bibli')), 0)
        .add(entrer(scene('css'), 0.3), 0.25)
        .from(q('.hb15__css-titre'), { autoAlpha: 0, y: 16, duration: 0.45 }, 0.3)
        .from(qa('.hb15__demo'), { y: 40, autoAlpha: 0, duration: 0.55, stagger: 0.35, ease: 'power3.out' }, 0.45),

      // Le texte circulaire : le cercle se trace, puis le texte le suit
      () => gsap.timeline()
        .add(sortir(scene('css')), 0)
        .add(entrer(scene('svg'), 0.3), 0.25)
        .from(q('.hb15__svg-code'), { x: 40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.3)
        .add(tracer(q('.hb15__guide'), 0.9), 0.5)
        .to(qa('.hb15__ligne--cercle'), surligner, 0.5)
        .fromTo(q('.hb15__texte-cercle'), { attr: { startOffset: '100%' } }, { attr: { startOffset: '0%' }, duration: 1.3, ease: 'power2.out' }, 1.4)
        .to(qa('.hb15__ligne--cercle'), eteindre, 1.4)
        .to(qa('.hb15__ligne--texte'), surligner, 1.4)
        .to(q('.hb15__guide'), { opacity: 0.3, duration: 0.5 }, 2.3)
        .add(tracer(qa('.hb15__etoile-grande path'), 0.5), 2.3)
        .from(q('.hb15__svg-legende'), { autoAlpha: 0, y: 14, duration: 0.45 }, 2.6),

      // Le natif avant les bibliothèques
      () => gsap.timeline()
        .add(sortir(scene('svg')), 0)
        .to(rail, { autoAlpha: 0, y: 12, duration: 0.35, stagger: 0.05 }, 0)
        .add(entrer(scene('principe'), 0.3), 0.25)
        .from(principe.words, { yPercent: 115, duration: 0.8, stagger: 0.07, ease: 'expo.out' }, 0.35),

      // Les seules dépendances : React et React Router
      () => gsap.timeline()
        .to(q('.hb15__principe-tete'), { y: -150, scale: 0.6, duration: 0.7, ease: 'power3.inOut' }, 0)
        .from(q('.hb15__dependances'), { y: 40, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.35)
        .from(qa('.hb15__dependances .vsc__ligne'), { autoAlpha: 0, x: -15, duration: 0.3, stagger: 0.1 }, 0.6)
        .from(q('.hb15__accolade--react'), { autoAlpha: 0, x: -15, duration: 0.4 }, 1.1)
        .from(q('.hb15__accolade--router'), { autoAlpha: 0, x: -15, duration: 0.4 }, 1.35)
        .from(q('.hb15__rien'), { autoAlpha: 0, y: 14, duration: 0.45 }, 1.7)
    ]);
  }

  /* Diapositive 16 : les tests. Les deux outils, puis Lighthouse (les jauges, le SEO à 92
     et le robots.txt), WAVE (le bilan, puis l'alerte sur la phrase du pied de page),
     et le contraste sur fond flouté, que les outils ne mesurent pas : l'IA l'a calculé. */
  function construireTests() {
    const slide = document.getElementById('slide-16');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const scene = (n) => q(`.ts16__${n}`);
    const entrer = (el, duree = 0.55) => gsap.from(el, { autoAlpha: 0, y: 26, duration: duree, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const tracer = (el, duree = 0.6) => gsap.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: duree, ease: 'power2.inOut' });
    const jauges = qa('.ts16__jauge');
    // Une jauge se remplit pendant que son score défile
    const remplir = (jauge, score, duree = 1.1) => gsap.timeline()
      .fromTo(jauge.querySelector('.ts16__arc'), { drawSVG: '0%' }, { drawSVG: `${score}%`, duration: duree, ease: 'power2.out' }, 0)
      .add(compter(jauge.querySelector('b'), 0, score, duree, (v) => Math.round(v)), 0);
    const cible = q('.ts16__cible');
    const valeur = q('.ts16__valeur');
    gsap.set(cible, { x: 180, y: 330 });
    const etapesIa = qa('.ts16__etape-ia');
    const etiquettes = qa('.ts16__etiquette');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      // Deux outils
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(qa('.ts16__outil'), { autoAlpha: 0, y: 40, duration: 0.6, stagger: 0.18, ease: 'power3.out' }, 0.2)
        .add(tracer(qa('.ts16__outil .ts16__icone > *'), 0.8), 0.4),

      // Lighthouse : 100 en performance, accessibilité et bonnes pratiques
      () => {
        const t = gsap.timeline()
          .add(sortir(scene('intro')), 0)
          .add(entrer(scene('lighthouse'), 0.3), 0.25)
          .from(q('.ts16__lighthouse .ts16__entete'), { autoAlpha: 0, x: -20, duration: 0.45 }, 0.3)
          .from([jauges[0], jauges[1], jauges[2]], { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.35);
        [0, 1, 2].forEach((i) => t.add(remplir(jauges[i], 100), 0.5 + i * 0.15));
        return t;
      },

      // Le SEO bloqué à 92 : à l'adresse du robots.txt, le serveur renvoie la page HTML
      () => gsap.timeline()
        .to([jauges[0], jauges[1], jauges[2]], { opacity: 0.4, duration: 0.4 }, 0)
        .from(jauges[3], { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0)
        .add(remplir(jauges[3], 92, 1), 0.15)
        .fromTo(q('.ts16__manque'), { drawSVG: '92% 92%' }, { drawSVG: '92% 100%', duration: 0.4, ease: 'power2.out' }, 1.15)
        .from(q('.ts16__emplacement'), { autoAlpha: 0, scale: 0.9, duration: 0.45, ease: 'back.out(1.8)' }, 1.4),

      // Le fichier ajouté
      () => gsap.timeline()
        .to(q('.ts16__emplacement'), { autoAlpha: 0, duration: 0.25 }, 0)
        .from(q('.ts16__robots'), { autoAlpha: 0, y: -50, duration: 0.55, ease: 'bounce.out' }, 0.05)
        .from(q('.ts16__ajoute'), { autoAlpha: 0, y: 12, duration: 0.4 }, 0.6),

      // WAVE : aucune erreur
      () => gsap.timeline()
        .add(sortir(scene('lighthouse')), 0)
        .add(entrer(scene('wave'), 0.3), 0.25)
        .from(q('.ts16__wave .ts16__entete'), { autoAlpha: 0, x: -20, duration: 0.45 }, 0.3)
        .from(q('.ts16__compte--erreur'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.4)
        .from(q('.ts16__pastille-erreur'), { scale: 0, duration: 0.45, ease: 'back.out(2.5)' }, 0.6)
        .add(decoder(q('.ts16__compte--erreur b'), 0.7, '0'), 0.6),

      // Des points à vérifier, comme la phrase du pied de page
      () => gsap.timeline()
        .from(q('.ts16__compte--alerte'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0)
        .from(q('.ts16__pastille-alerte'), { scale: 0, duration: 0.45, ease: 'back.out(2.5)' }, 0.2)
        .from(q('.ts16__pied'), { autoAlpha: 0, y: 30, duration: 0.55, ease: 'power3.out' }, 0.4)
        .from(q('.ts16__drapeau'), { autoAlpha: 0, scale: 2.2, rotation: -25, duration: 0.5, ease: 'back.out(2)' }, 1),

      // Un titre oublié ?
      () => gsap.timeline()
        .from(q('.ts16__bulle'), { autoAlpha: 0, y: -16, duration: 0.45, ease: 'back.out(1.6)' }, 0),

      // C'est voulu : c'est un menu
      () => gsap.timeline()
        .add(tracer(q('.ts16__cadre rect'), 0.7), 0)
        .from(q('.ts16__nav'), { text: '', duration: 0.6, ease: 'none' }, 0.2)
        .to(q('.ts16__bulle'), { opacity: 0.45, duration: 0.4 }, 0.5)
        .to(q('.ts16__drapeau'), { backgroundColor: '#9cf1bd', duration: 0.3 }, 0.6)
        .to(q('.ts16__drapeau'), { text: '✓', duration: 0.01 }, 0.6)
        .from(q('.ts16__reponse'), { autoAlpha: 0, x: 20, duration: 0.5, ease: 'power3.out' }, 0.7),

      // Aucun outil ne mesure un contraste sur un fond flouté : la mesure ne tient pas en place
      () => gsap.timeline()
        .add(sortir(scene('wave')), 0)
        .add(entrer(scene('contraste'), 0.3), 0.25)
        .from(q('.ts16__contraste .ts16__entete'), { autoAlpha: 0, x: -20, duration: 0.45 }, 0.3)
        .from(q('.ts16__demo'), { autoAlpha: 0, y: 30, duration: 0.55, ease: 'power3.out' }, 0.35)
        .from([cible, q('.ts16__mesure')], { autoAlpha: 0, duration: 0.3 }, 0.8)
        .to(cible, { keyframes: [{ x: 420, y: 280 }, { x: 760, y: 250 }, { x: 520, y: 360 }], duration: 1.8, ease: 'sine.inOut' }, 0.9)
        .set(valeur, { text: '4,1' }, 1.0).set(valeur, { text: '6,3' }, 1.3).set(valeur, { text: '3,2' }, 1.6)
        .set(valeur, { text: '7,8' }, 1.9).set(valeur, { text: '5,0' }, 2.2).set(valeur, { text: '?' }, 2.5)
        .from(q('.ts16__outils-non'), { autoAlpha: 0, y: 12, duration: 0.4 }, 2.6),

      // Le calcul par l'IA : les trois couches du verre se posent l'une sur l'autre
      () => gsap.timeline()
        .add(sortir(scene('contraste')), 0)
        .add(entrer(scene('calcul-verre'), 0.3), 0.25)
        .from(q('.ts16__calcul-verre .ts16__entete'), { autoAlpha: 0, x: -20, duration: 0.45 }, 0.3)
        .from(q('.ts16__methode'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.35)
        .from(q('.ts16__methode .ts16__ia'), { scale: 0, duration: 0.45, ease: 'back.out(2.5)' }, 0.6)
        .from([q('.ts16__couche--fond'), q('.ts16__couche--lueur'), q('.ts16__couche--verre')], { autoAlpha: 0, y: -60, duration: 0.55, stagger: 0.2, ease: 'power3.out' }, 0.5)
        .from(q('.ts16__aa'), { autoAlpha: 0, scale: 0.5, duration: 0.45, ease: 'back.out(2)' }, 1.2),

      // Les couleurs du code, et le pire cas : le centre de la lueur la plus claire
      () => {
        const t = gsap.timeline()
          .from(etapesIa[0], { autoAlpha: 0, x: -20, duration: 0.4 }, 0)
          .from(etiquettes, { autoAlpha: 0, x: 20, duration: 0.4, stagger: 0.15 }, 0.15);
        etiquettes.forEach((e, i) => t.add(taper(e.querySelector('code'), 0.025), 0.35 + i * 0.15));
        return t.from(etapesIa[1], { autoAlpha: 0, x: -20, duration: 0.4 }, 1.1)
          .from(q('.ts16__pire'), { autoAlpha: 0, scale: 2, duration: 0.5, ease: 'back.out(1.8)' }, 1.3)
          .to(q('.ts16__pire'), { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1 }, 1.8);
      },

      // La superposition : les couches se rejoignent et donnent la couleur réelle derrière le texte
      () => gsap.timeline()
        .from(etapesIa[2], { autoAlpha: 0, x: -20, duration: 0.4 }, 0)
        .to([q('.ts16__pire'), ...etiquettes], { autoAlpha: 0, duration: 0.3 }, 0)
        .to([q('.ts16__couche--verre'), q('.ts16__aa')], { y: 100, duration: 0.7, ease: 'power3.inOut' }, 0.2)
        .to(q('.ts16__couche--fond'), { y: -100, duration: 0.7, ease: 'power3.inOut' }, 0.2)
        .to(q('.ts16__couche--verre i'), { backgroundColor: '#7e3c30', duration: 0.4 }, 0.9)
        .fromTo(q('.ts16__fleche-pile path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.4, ease: 'power2.out' }, 1.2)
        .from(q('.ts16__resultat'), { autoAlpha: 0, scale: 0.7, duration: 0.45, ease: 'back.out(2)' }, 1.5)
        .from(q('.ts16__resultat-legende'), { autoAlpha: 0, x: -15, duration: 0.4 }, 1.7),

      // La formule des WCAG, appliquée à l'exemple
      () => gsap.timeline()
        .from(q('.ts16__formule'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0)
        .from(qa('.ts16__formule p'), { autoAlpha: 0, x: -15, duration: 0.35, stagger: 0.25 }, 0.25)
        .from(q('.ts16__application b'), { scale: 0.5, duration: 0.45, ease: 'back.out(2.5)' }, 1.05),

      // Vérifié à l'écran avec le Colour Contrast Analyser
      () => gsap.timeline()
        .add(sortir(scene('calcul-verre')), 0)
        .add(entrer(scene('cca'), 0.3), 0.25)
        .from(q('.ts16__cca .ts16__entete'), { autoAlpha: 0, x: -20, duration: 0.45 }, 0.3)
        .from(qa('.ts16__capture'), { autoAlpha: 0, y: 40, duration: 0.55, stagger: 0.2, ease: 'power3.out' }, 0.4),

      // 8,2 sur une lueur rouge, 7 sur une lueur bleue
      () => gsap.timeline()
        .add(tracer(qa('.ts16__capture ellipse'), 0.6), 0)
        .from(q('.ts16__cca-ratio--rouge'), { autoAlpha: 0, x: 30, duration: 0.5, ease: 'power3.out' }, 0.4)
        .from(q('.ts16__cca-ratio--bleue'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.6)
        .from(q('.ts16__cca-minimum'), { autoAlpha: 0, y: 14, duration: 0.45 }, 1)
    ]);
  }

  /* Diapositive 17 : vitesse et référencement. Le premier affichage sur une ligne de temps,
     la place réservée aux images, le poids des couvertures et des vidéos, le résultat Google
     et le seul h1, les titres d'onglet, puis les mots-clés des offres qui rejoignent la description. */
  function construireVitesse() {
    const slide = document.getElementById('slide-17');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const rail = qa('.vr17__rail li');
    const scene = (n) => q(`.vr17__${n}`);
    const entrer = (el, duree = 0.55) => gsap.from(el, { autoAlpha: 0, y: 26, duration: duree, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const allumer = (i) => {
      const t = gsap.timeline().to(rail[i], { borderTopColor: '#ffb08a', color: '#ffffff', duration: 0.4 }, 0)
        .from(rail[i].querySelector('svg'), { scale: 0.7, duration: 0.5, ease: 'back.out(2)' }, 0);
      if (i > 0) t.to(rail[i - 1], { borderTopColor: 'rgba(255,255,255,0.25)', color: '#e0e5f5', duration: 0.4 }, 0);
      return t;
    };
    const virgule = (v, n) => v.toFixed(n).replace('.', ',');
    // 1 300 px de barre pour 1,1 Mo de couvertures
    const LARGEUR = 1300;
    const reduite = LARGEUR * 388 / 1100;
    // Les mots-clés volent de leur offre jusqu'à la description, mesurés avant toute animation
    const mots = scene('mots');
    const vols = ['full-stack', 'javascript', 'junior', 'react', 'node'].map((cle) => {
      const arrivee = mots.querySelector(`.vr17__mot[data-mot="${cle}"]`);
      return { arrivee, ...preparerVol('vr17__vol', arrivee.textContent, mots.querySelector(`.vr17__offres [data-mot="${cle}"]`), arrivee, mots) };
    });
    const onglets = qa('.vr17__onglet');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(rail, { autoAlpha: 0, y: 20, duration: 0.45, stagger: 0.08 }, 0.3),

      // Le premier affichage en 0,6 s : le temps défile, la page apparaît
      () => gsap.timeline()
        .add(allumer(0), 0)
        .add(entrer(scene('affichage'), 0.3), 0)
        .from(q('.vr17__navigateur'), { autoAlpha: 0, x: 30, duration: 0.5, ease: 'power3.out' }, 0.05)
        .from(q('.vr17__axe'), { autoAlpha: 0, duration: 0.3 }, 0.2)
        .from(q('.vr17__stat--affichage'), { autoAlpha: 0, y: 20, duration: 0.45 }, 0.15)
        .fromTo(q('.vr17__rempli'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'none' }, 0.45)
        .fromTo(q('.vr17__repere'), { x: -588 }, { x: 0, duration: 1.2, ease: 'none' }, 0.45)
        .add(compter(q('.vr17__chiffre'), 0, 0.6, 1.2, (v) => `${virgule(v, 1)} s`), 0.45)
        .from(qa('.vr17__page > *'), { autoAlpha: 0, duration: 0.25, stagger: 0.04 }, 1.6),

      // La page ne bouge pas : l'image remplit la place réservée, le texte reste sur son repère
      () => gsap.timeline()
        .fromTo(q('.vr17__guide'), { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .from(q('.vr17__reserve img'), { autoAlpha: 0, duration: 0.6 }, 0.45)
        .to(q('.vr17__reserve'), { borderColor: 'rgba(255,176,138,0)', duration: 0.4 }, 0.6)
        .to(q('.vr17__stat--affichage'), { opacity: 0.45, duration: 0.4 }, 0.4)
        .from(q('.vr17__stat--decalage'), { autoAlpha: 0, y: 20, duration: 0.5, ease: 'power3.out' }, 0.7),

      // Les couvertures : la moitié de la taille, le tiers du poids
      () => gsap.timeline()
        .add(sortir(scene('affichage')), 0)
        .add(entrer(scene('medias'), 0.3), 0.25)
        .from(qa('.vr17__vignettes img'), { autoAlpha: 0, y: 30, duration: 0.45, stagger: 0.1, ease: 'power3.out' }, 0.3)
        .from([q('.vr17__dimensions'), q('.vr17__poids')], { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.1 }, 0.6)
        .to(qa('.vr17__vignettes img'), { scale: 0.86, duration: 0.7, ease: 'power3.inOut' }, 1.2)
        .to(q('.vr17__taille'), { text: '1 600 × 1 200 px', duration: 0.5, ease: 'none' }, 1.2)
        .to(q('.vr17__poids i'), { scaleX: reduite / LARGEUR, duration: 1, ease: 'power3.inOut' }, 1.3)
        .to(q('.vr17__poids-valeur'), { x: reduite - LARGEUR, duration: 1, ease: 'power3.inOut' }, 1.3)
        .add(compter(q('.vr17__poids-valeur'), 1100, 388, 1, (v) => (v >= 1000 ? `${virgule(v / 1000, 1)} Mo` : `${Math.round(v)} Ko`)), 1.3),

      // Les vidéos en WebM
      () => gsap.timeline()
        .add(sortir(q('.vr17__couvertures')), 0)
        .from(qa('.vr17__video'), { autoAlpha: 0, y: 26, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.25)
        .from(qa('.vr17__ligne-poids--mp4 i'), { scaleX: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, 0.45)
        .from(qa('.vr17__ligne-poids--mp4 span'), { autoAlpha: 0, duration: 0.3, stagger: 0.15 }, 0.9)
        .from(qa('.vr17__ligne-poids--webm i'), { scaleX: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, 1.2)
        .from(qa('.vr17__ligne-poids--webm span'), { autoAlpha: 0, x: -10, duration: 0.35, stagger: 0.15 }, 1.5),

      // Un seul titre principal et une description pour Google
      () => gsap.timeline()
        .add(allumer(1), 0)
        .add(sortir(scene('medias')), 0)
        .add(entrer(scene('seo'), 0.3), 0.25)
        .from(q('.vr17__google'), { autoAlpha: 0, x: -30, duration: 0.55, ease: 'power3.out' }, 0.3)
        .from(qa('.vr17__balise'), { autoAlpha: 0, scale: 0.7, duration: 0.4, stagger: 0.2, ease: 'back.out(2)' }, 0.8)
        .from(q('.vr17__plan'), { autoAlpha: 0, x: 30, duration: 0.55, ease: 'power3.out' }, 1)
        .from(q('.vr17__h1'), { autoAlpha: 0, scale: 2, duration: 0.45, ease: 'back.out(2)' }, 1.4)
        .from(q('.vr17__plan-legende'), { autoAlpha: 0, y: 12, duration: 0.4 }, 1.6),

      // Un titre d'onglet par fiche projet
      () => {
        const t = gsap.timeline()
          .add(sortir(scene('seo')), 0)
          .add(entrer(scene('onglets-scene'), 0.3), 0.25)
          .from(q('.vr17__onglets-bord'), { autoAlpha: 0, duration: 0.3 }, 0.3)
          .from(onglets, { autoAlpha: 0, x: -40, duration: 0.45, stagger: 0.25, ease: 'power3.out' }, 0.35);
        onglets.forEach((o, i) => {
          t.to(o, { backgroundColor: '#2c3654', color: '#ffffff', duration: 0.25 }, 0.35 + i * 0.25);
          if (i > 0) t.to(onglets[i - 1], { backgroundColor: '#1c253d', color: '#c8d0e5', duration: 0.25 }, 0.35 + i * 0.25);
        });
        return t.from(q('.vr17__code-titre'), { autoAlpha: 0, y: 20, duration: 0.5, ease: 'power3.out' }, 1.2)
          .from(q('.vr17__onglets-legende'), { autoAlpha: 0, y: 12, duration: 0.4 }, 1.5);
      },

      // Les mots-clés des trois offres rejoignent la description du site
      () => {
        const t = gsap.timeline()
          .add(sortir(scene('onglets-scene')), 0)
          .add(entrer(mots, 0.3), 0.25)
          .from(qa('.vr17__offre'), { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.3)
          .from(q('.vr17__meta'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0.7);
        vols.forEach((v, i) => {
          const debut = 1.3 + i * 0.35;
          t.to(mots.querySelector(`.vr17__offres [data-mot="${v.arrivee.dataset.mot}"]`), { color: '#ffb08a', borderColor: '#ffb08a', duration: 0.25 }, debut)
            .add(voler(v, 0.8, 60), debut)
            .to(v.vol, { autoAlpha: 0, duration: 0.15 }, debut + 0.8)
            .to(v.arrivee, { backgroundColor: 'rgba(255,176,138,0.28)', color: '#ffffff', duration: 0.3 }, debut + 0.75);
        });
        return t;
      }
    ]);
  }

  /* ---------- Diapositives 18 à 20 : les deux projets de formation ---------- */

  /* Diapositive 18 : deux emplacements, les deux projets s'y retournent,
     puis les deux faces du profil se rejoignent au centre. */
  function construireDeuxProjets() {
    const slide = document.getElementById('slide-18');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(qa('.dp18__vide'), { autoAlpha: 0, scale: 0.92, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.25),

      // Kasa et Mon Vieux Grimoire se dévoilent de bas en haut dans leur emplacement,
      // la couverture se recadre pendant le dévoilement, puis le nom et le code montent
      () => gsap.timeline()
        .to(qa('.dp18__vide'), { autoAlpha: 0, y: -24, duration: 0.35, stagger: 0.18, ease: 'power2.in' }, 0)
        .fromTo(qa('.dp18__contenu'), { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.9, stagger: 0.18, ease: 'expo.inOut' }, 0.1)
        .from(qa('.dp18__contenu img'), { scale: 1.3, duration: 1.3, stagger: 0.18, ease: 'expo.out' }, 0.1)
        .from(qa('.dp18__contenu p > *'), { yPercent: 100, autoAlpha: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.75),

      // Front-end d'un côté, back-end de l'autre : les deux faces du profil
      () => gsap.timeline()
        .from(q('.dp18__face--front'), { autoAlpha: 0, y: 20, duration: 0.45, ease: 'power3.out' }, 0)
        .from(q('.dp18__face--back'), { autoAlpha: 0, y: 20, duration: 0.45, ease: 'power3.out' }, 0.25)
        .fromTo(qa('.dp18__liens path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut' }, 0.6)
        .from(q('.dp18__profil'), { autoAlpha: 0, scale: 0.6, duration: 0.5, ease: 'back.out(2)' }, 1)
    ]);
  }

  // La fiche projet (diapositives 19 et 20) : une scène par rubrique, le repère des rubriques en bas
  const ficheProjet = (slide) => {
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const rail = qa('.fp__rail li');
    const entrer = (el, duree = 0.55) => gsap.from(el, { autoAlpha: 0, y: 26, duration: duree, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const allumer = (i) => {
      const t = gsap.timeline().to(rail[i], { borderTopColor: '#ffb08a', color: '#ffffff', duration: 0.4 }, 0);
      if (i > 0) t.to(rail[i - 1], { borderTopColor: 'rgba(255,255,255,0.25)', color: '#c2cbe2', duration: 0.4 }, 0);
      return t;
    };
    // Passer d'une scène à l'autre ; la rubrique du repère s'allume quand elle change
    const changer = (de, vers, rubrique) => {
      const t = gsap.timeline().add(sortir(q(de)), 0).add(entrer(q(vers), 0.3), 0.25);
      if (rubrique !== undefined) t.add(allumer(rubrique), 0);
      return t;
    };
    const tracer = (el, duree = 0.5) => gsap.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: duree, ease: 'power2.inOut' });
    const arrivee = () => gsap.timeline()
      .add(entreeTete(slide), 0)
      .from(rail, { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.06 }, 0.3)
      .from(q('.fp__couverture'), { autoAlpha: 0, scale: 0.94, duration: 0.6, ease: 'power3.out' }, 0.15)
      .from(q('.fp__code'), { autoAlpha: 0, y: 14, duration: 0.4 }, 0.4)
      .from(q('.fp__slogan'), { autoAlpha: 0, y: 24, duration: 0.6, ease: 'power3.out' }, 0.5);
    return { q, qa, changer, tracer, arrivee };
  };

  /* Diapositive 19 : Kasa. Contexte (la location, la maquette Figma), l'enjeu, la stack,
     le menu dépliant sur deux pages puis ses trois versions, le résultat, les améliorations. */
  function construireKasa() {
    const slide = document.getElementById('slide-19');
    const { q, qa, changer, tracer, arrivee } = ficheProjet(slide);
    // Ouvrir un menu dépliant : le panneau prend sa hauteur, la flèche se retourne
    const ouvrir = (page) => gsap.timeline()
      .fromTo(page.querySelector('.ka19__panneau'), { height: 0 }, { height: 'auto', duration: 0.6, ease: 'power2.inOut' }, 0)
      .to(page.querySelector('.ka19__barre-menu svg'), { rotation: 180, duration: 0.4 }, 0);
    const lignes = qa('.ka19__code .vsc__ligne');
    const surligner = { backgroundColor: 'rgba(232,105,46,0.16)', borderLeftColor: '#e8692e', duration: 0.3 };

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      arrivee,

      () => changer('.ka19__accueil', '.ka19__location', 0)
        .from(q('.ka19__location .fp__navigateur'), { autoAlpha: 0, x: -30, duration: 0.55, ease: 'power3.out' }, 0.3)
        .add(tracer(qa('.ka19__location .fp__icone path')), 0.5)
        .from(q('.ka19__location .fp__fait > p'), { autoAlpha: 0, y: 20, duration: 0.5 }, 0.6),

      () => changer('.ka19__location', '.ka19__figma')
        .from(q('.ka19__maquette'), { autoAlpha: 0, x: -30, duration: 0.55, ease: 'power3.out' }, 0.3)
        .from(qa('.ka19__cadre i'), { scale: 0, duration: 0.3, stagger: 0.06, ease: 'back.out(3)' }, 0.6)
        .add(tracer(q('.ka19__figma .fp__fleche path')), 0.9)
        .from(q('.ka19__react'), { autoAlpha: 0, scale: 0.85, duration: 0.5, ease: 'back.out(1.6)' }, 1.2)
        .from(q('.ka19__react img'), { rotation: -120, duration: 1, ease: 'power3.out' }, 1.2),

      () => changer('.ka19__figma', '.ka19__enjeu', 1)
        .from(qa('.ka19__pages li'), { autoAlpha: 0, x: -30, duration: 0.4, stagger: 0.12, ease: 'power3.out' }, 0.3)
        .from(q('.ka19__composants'), { autoAlpha: 0, y: 14, duration: 0.4 }, 0.9)
        .from(q('.ka19__ordi'), { autoAlpha: 0, x: 30, duration: 0.55, ease: 'power3.out' }, 1.1)
        .from(q('.ka19__mobile'), { autoAlpha: 0, y: 40, duration: 0.55, ease: 'power3.out' }, 1.35),

      () => changer('.ka19__enjeu', '.ka19__stack', 2)
        .from(qa('.ka19__stack .fp__tuile'), { autoAlpha: 0, y: 40, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.3),

      // Le même menu, sur deux pages : il s'ouvre sur l'une, puis sur l'autre
      () => changer('.ka19__stack', '.ka19__menu', 3)
        .from(qa('.ka19__page'), { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.3)
        .from(q('.ka19__code'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0.5)
        .to(lignes[0], surligner, 1)
        .add(ouvrir(q('.ka19__page--apropos')), 1)
        .to(lignes[1], surligner, 1.7)
        .add(ouvrir(q('.ka19__page--logement')), 1.7),

      () => changer('.ka19__menu', '.ka19__versions')
        .from(q('.ka19__version--1'), { autoAlpha: 0, y: 30, duration: 0.45, ease: 'power3.out' }, 0.3)
        .add(tracer(qa('.ka19__versions .fp__fleche path')[0], 0.3), 0.75)
        .from(q('.ka19__version--2'), { autoAlpha: 0, y: 30, duration: 0.45, ease: 'power3.out' }, 0.95)
        .add(tracer(qa('.ka19__versions .fp__fleche path')[1], 0.3), 1.4)
        .from(q('.ka19__version--3'), { autoAlpha: 0, y: 30, scale: 0.95, duration: 0.5, ease: 'back.out(1.6)' }, 1.6),

      () => changer('.ka19__versions', '.ka19__resultat', 4)
        .from(qa('.ka19__resultat .fp__preuve'), { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.2, ease: 'power3.out' }, 0.3)
        .from(qa('.ka19__touche'), { y: -12, autoAlpha: 0, duration: 0.3, stagger: 0.15 }, 1)
        .from(q('.ka19__barre-focus'), { outlineColor: 'rgba(156,241,189,0)', duration: 0.4 }, 1.3),

      () => changer('.ka19__resultat', '.ka19__ameliorer', 5)
        .from(qa('.ka19__ameliorer .fp__piste'), { autoAlpha: 0, scale: 0.94, duration: 0.5, stagger: 0.2, ease: 'power3.out' }, 0.3)
    ]);
  }

  /* Diapositive 20 : Mon Vieux Grimoire. Contexte (la notation, l'architecture), l'enjeu (le contrat
     du front), la stack, la règle et son exemple (l'auteur lu dans le token), les tests Postman,
     le poids des images et la démo, les améliorations. */
  function construireGrimoire() {
    const slide = document.getElementById('slide-20');
    const { q, qa, changer, tracer, arrivee } = ficheProjet(slide);
    const regle = decouper(q('.vg20__regle-texte'), 'words');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      arrivee,

      () => changer('.vg20__accueil', '.vg20__notation', 0)
        .from(q('.vg20__notation .fp__navigateur'), { autoAlpha: 0, x: -30, duration: 0.55, ease: 'power3.out' }, 0.3)
        .from(qa('.vg20__etoiles span'), { scale: 0, duration: 0.35, stagger: 0.1, ease: 'back.out(3)' }, 0.5)
        .from(q('.vg20__notation .fp__fait > p:last-child'), { autoAlpha: 0, y: 20, duration: 0.5 }, 0.8),

      // Le front fourni, l'API à développer, la base MongoDB
      () => changer('.vg20__notation', '.vg20__archi')
        .from(q('.vg20__bloc--front'), { autoAlpha: 0, x: -30, duration: 0.45, ease: 'power3.out' }, 0.3)
        .from(q('.vg20__bloc--api'), { autoAlpha: 0, scale: 0.85, duration: 0.55, ease: 'back.out(1.6)' }, 0.6)
        .add(tracer(qa('.vg20__archi .fp__fleche path')), 0.9)
        .from(q('.vg20__bloc--base'), { autoAlpha: 0, x: 30, duration: 0.45, ease: 'power3.out' }, 1.1),

      // Le contrat imposé par le front : chaque route, respectée à la lettre
      () => changer('.vg20__archi', '.vg20__enjeu', 1)
        .from(q('.vg20__fige'), { autoAlpha: 0, x: -30, duration: 0.45, ease: 'power3.out' }, 0.3)
        .from(q('.vg20__fige .fp__icone'), { rotation: -20, y: -10, duration: 0.5, ease: 'back.out(3)' }, 0.5)
        .add(tracer(q('.vg20__enjeu .fp__fleche path'), 0.35), 0.7)
        .from(q('.vg20__contrat'), { autoAlpha: 0, x: 30, duration: 0.5, ease: 'power3.out' }, 0.8)
        .from(qa('.vg20__contrat li'), { autoAlpha: 0, x: -14, duration: 0.25, stagger: 0.07 }, 1)
        .from(q('.vg20__exactement'), { autoAlpha: 0, x: -14, duration: 0.45 }, 1.8),

      () => changer('.vg20__enjeu', '.vg20__stack', 2)
        .from(qa('.vg20__stack .fp__tuile'), { autoAlpha: 0, y: 40, duration: 0.5, stagger: 0.13, ease: 'power3.out' }, 0.3),

      () => changer('.vg20__stack', '.vg20__regle', 3)
        .add(tracer(qa('.vg20__bouclier path'), 0.8), 0.3)
        .from(regle.words, { yPercent: 115, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, 0.45),

      // L'auteur est lu dans le token, jamais dans la requête
      () => changer('.vg20__regle', '.vg20__exemple')
        .from(q('.vg20__requete'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .to(q('.vg20__faux'), { backgroundColor: 'rgba(255,120,120,0.18)', borderLeftColor: '#ff8c8c', duration: 0.3 }, 0.8)
        .from(q('.vg20__console'), { autoAlpha: 0, y: 12, duration: 0.4 }, 0.9)
        .from(q('.vg20__token'), { autoAlpha: 0, scale: 0.85, duration: 0.5, ease: 'back.out(1.8)' }, 1.3)
        .from(q('.vg20__serveur'), { autoAlpha: 0, x: 30, duration: 0.5, ease: 'power3.out' }, 1.6)
        .to(q('.vg20__vrai'), { backgroundColor: 'rgba(156,241,189,0.16)', borderLeftColor: '#9cf1bd', duration: 0.3 }, 2)
        .from(q('.vg20__sinon'), { autoAlpha: 0, y: 14, duration: 0.45 }, 2.3),

      // Chaque route testée avec Postman : les requêtes passent une à une, puis les deux refus attendus
      () => changer('.vg20__exemple', '.vg20__postman', 4)
        .from(q('.vg20__collection'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .from(qa('.vg20__requete-test'), { autoAlpha: 0, x: -20, duration: 0.3, stagger: 0.15 }, 0.6)
        .from(qa('.vg20__statut'), { autoAlpha: 0, scale: 0.6, duration: 0.3, stagger: 0.15, ease: 'back.out(2.5)' }, 0.75)
        .to(qa('.vg20__requete-test--refus'), { borderLeftColor: '#ffb08a', duration: 0.3, stagger: 0.2 }, 1.7)
        .from(qa('.vg20__requete-test em'), { autoAlpha: 0, x: 12, duration: 0.35, stagger: 0.2 }, 1.8),

      () => changer('.vg20__postman', '.vg20__resultat')
        .from(qa('.vg20__resultat .fp__preuve'), { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.2, ease: 'power3.out' }, 0.3)
        .add(compter(q('.vg20__poids'), 0, 98, 1, (v) => `−${Math.round(v)} %`), 0.4)
        .from(q('.vg20__point'), { scale: 0, duration: 0.4, ease: 'back.out(3)' }, 0.8),

      () => changer('.vg20__resultat', '.vg20__ameliorer', 5)
        .from(qa('.vg20__ameliorer .fp__piste'), { autoAlpha: 0, scale: 0.94, duration: 0.5, stagger: 0.2, ease: 'power3.out' }, 0.3)
    ]);
  }

  /* ---------- Diapositives 21 à 23 : les initiatives, le résumé, le merci ---------- */

  /* Diapositive 21 : au-delà des consignes. GymTracker (l'application, le rôle de chacun, les données),
     Sophie Bluel réécrit en React, les portfolios étudiés et leur fichier de sources, puis la méthode :
     un commit par étape, un journal, une branche Git pour une variante. Le repère suit les quatre initiatives. */
  function construireInitiatives() {
    const slide = document.getElementById('slide-21');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const rail = qa('.in21__rail li');
    const scene = (n) => q(`.in21__${n}`);
    const entrer = (el, duree = 0.55) => gsap.from(el, { autoAlpha: 0, y: 26, duration: duree, ease: 'power3.out' });
    const sortir = (el) => gsap.to(el, { autoAlpha: 0, y: -18, duration: 0.35 });
    const allumer = (i) => {
      const t = gsap.timeline().to(rail[i], { borderTopColor: '#ffb08a', color: '#ffffff', duration: 0.4 }, 0);
      if (i > 0) t.to(rail[i - 1], { borderTopColor: 'rgba(255,255,255,0.25)', color: '#c2cbe2', duration: 0.4 }, 0);
      return t;
    };
    const changer = (de, vers, rubrique) => {
      const t = gsap.timeline().add(sortir(scene(de)), 0).add(entrer(scene(vers), 0.3), 0.25);
      if (rubrique !== undefined) t.add(allumer(rubrique), 0);
      return t;
    };
    const tracer = (el, duree = 0.5) => gsap.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: duree, ease: 'power2.inOut' });

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(rail, { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.08 }, 0.3),

      // GymTracker : l'iPhone, la montre qui compte les répétitions
      () => gsap.timeline()
        .add(allumer(0), 0)
        .add(entrer(scene('gym'), 0.3), 0)
        .from(q('.in21__iphone'), { autoAlpha: 0, y: 40, duration: 0.6, ease: 'power3.out' }, 0.05)
        .from(q('.in21__montre'), { autoAlpha: 0, scale: 0.8, x: -20, duration: 0.55, ease: 'back.out(1.6)' }, 0.35)
        .add(compter(q('.in21__reps'), 0, 8, 1.2, (v) => Math.round(v)), 0.8)
        .from(qa('.in21__gym-texte > *'), { autoAlpha: 0, y: 20, duration: 0.45, stagger: 0.1 }, 0.3),

      // Le code écrit par une IA, mon rôle : chef de produit et testeur
      () => changer('gym', 'role')
        .from(q('.in21__carte--ia'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .from(q('.in21__carte--moi'), { autoAlpha: 0, x: 30, duration: 0.5, ease: 'power3.out' }, 0.75)
        .from(qa('.in21__casquette'), { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.2 }, 1),

      // 678 enregistrements, puis 23 séries reconnues sur 24
      () => changer('role', 'donnees')
        .from(q('.in21__collecte'), { autoAlpha: 0, y: 20, duration: 0.45 }, 0.3)
        .add(compter(q('.in21__nombre'), 0, 678, 1.2, (v) => Math.round(v)), 0.35)
        .add(tracer(q('.in21__donnees .in21__fleche path'), 0.4), 1.4)
        .from(q('.in21__seance > p'), { autoAlpha: 0, y: 14, duration: 0.4 }, 1.6)
        .from(qa('.in21__series i'), { autoAlpha: 0, scale: 0, duration: 0.25, stagger: 0.035, ease: 'back.out(2.5)' }, 1.8)
        .from(q('.in21__score'), { autoAlpha: 0, y: 20, duration: 0.5, ease: 'power3.out' }, 2.8),

      // Sophie Bluel : de JavaScript à React et TypeScript, en ligne
      () => changer('donnees', 'sophie', 1)
        .from(q('.in21__js'), { autoAlpha: 0, x: -30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .add(tracer(q('.in21__sophie .in21__fleche path'), 0.6), 0.7)
        .from(q('.in21__initiative'), { autoAlpha: 0, y: 10, duration: 0.4 }, 0.85)
        .from(q('.in21__react'), { autoAlpha: 0, x: 30, duration: 0.55, ease: 'power3.out' }, 1.2)
        .from(q('.in21__point'), { scale: 0, duration: 0.4, ease: 'back.out(3)' }, 1.7),

      // Les portfolios de développeurs étudiés
      () => changer('sophie', 'etudes', 2)
        .from(qa('.in21__portfolios p'), { autoAlpha: 0, y: 24, scale: 0.95, duration: 0.4, stagger: { each: 0.08, grid: [3, 3], from: 'start' }, ease: 'power3.out' }, 0.3),

      // Chaque idée reprise, notée avec sa source
      () => changer('etudes', 'sources')
        .from(q('.in21__fichier'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .from(qa('.in21__fichier .vsc__ligne'), { autoAlpha: 0, x: -15, duration: 0.3, stagger: 0.12 }, 0.6)
        .from(q('.in21__treize'), { autoAlpha: 0, y: 14, duration: 0.45 }, 1.4),

      // La méthode : un commit par étape
      () => changer('sources', 'methode', 3)
        .from(q('.in21__pilier--commits'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0.3)
        .from(qa('.in21__terminal p'), { autoAlpha: 0, x: -12, duration: 0.3, stagger: 0.15 }, 0.6),

      // Un journal : chaque décision, sa raison
      () => gsap.timeline()
        .from(q('.in21__pilier--journal'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0)
        .from(qa('.in21__md-fenetre p'), { autoAlpha: 0, x: -12, duration: 0.3, stagger: 0.15 }, 0.3),

      // Une variante sur une branche Git, comme pour le badge du CV
      () => gsap.timeline()
        .from(q('.in21__pilier--branche'), { autoAlpha: 0, y: 30, duration: 0.5, ease: 'power3.out' }, 0)
        .add(tracer(q('.in21__main'), 0.6), 0.3)
        .add(tracer(q('.in21__variante'), 0.8), 0.6)
        .from(qa('.in21__graphe circle'), { scale: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.1, ease: 'back.out(3)' }, 0.6)
        .from(qa('.in21__graphe text'), { autoAlpha: 0, duration: 0.3 }, 1.1)
        .from(q('.in21__badge-legende'), { autoAlpha: 0, y: 14, duration: 0.45 }, 1.3)
    ]);
  }

  /* Diapositive 22 : pour résumer. Une ligne par qualité du site, avec sa preuve à droite. */
  function construireResume() {
    const slide = document.getElementById('slide-22');
    const points = slide.querySelectorAll('.rs22__point');
    const point = (li) => gsap.timeline()
      .from(li, { autoAlpha: 0, x: -40, duration: 0.5, ease: 'power3.out' }, 0)
      .from(li.querySelector('.rs22__icone'), { scale: 0.4, rotation: -30, duration: 0.5, ease: 'back.out(2.2)' }, 0.1)
      .from(li.querySelector('code'), { autoAlpha: 0, x: 20, duration: 0.4 }, 0.4);

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline().add(entreeTete(slide), 0).add(point(points[0]), 0.3),
      () => point(points[1]),
      () => point(points[2]),
      () => point(points[3])
    ]);
  }

  /* Diapositive 23 : merci. Le mot monte lettre à lettre, l'étoile du site se dessine dans son badge,
     puis les liens du site et du code. */
  function construireMerci() {
    const slide = document.getElementById('slide-23');
    const q = (s) => slide.querySelector(s);
    const merci = decouper(q('.mr23__merci'), 'chars');

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .from(merci.chars, { yPercent: 110, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0)
        .from(q('.mr23__nom'), { autoAlpha: 0, y: 14, duration: 0.5 }, 0.2)
        .from(q('.mr23__badge'), { autoAlpha: 0, scale: 0.5, rotation: -90, duration: 0.8, ease: 'back.out(1.6)' }, 0.5)
        .fromTo(slide.querySelectorAll('.mr23__etoile path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, stagger: 0.12 }, 0.7)
        .from(slide.querySelectorAll('.mr23__lien'), { autoAlpha: 0, y: 30, duration: 0.55, stagger: 0.15, ease: 'power3.out' }, 1)
        .from(q('.mr23__dispo'), { autoAlpha: 0, y: 12, duration: 0.45 }, 1.4)
    ]);
  }

  /* Annexe 1 : aide-mémoire du texte circulaire. Chaque étape éclaire un groupe de lignes du code
     et construit la même partie du SVG à droite.
     e1 <svg> : la feuille de 160 × 160 ; e2 <defs> : le rail se trace ; e3 <textPath> : le texte
     se pose sur le rail et s'étire jusqu'à faire un tour (textLength) ; e4 @keyframes : le badge tourne. */
  function construireAnnexeSvg() {
    const slide = document.getElementById('annexe-01');
    const q = (s) => slide.querySelector(s);
    const qa = (s) => slide.querySelectorAll(s);
    const notes = qa('.sv__note');
    const groupe = (nom) => qa(`[data-groupe="${nom}"]`);
    const allumer = (nom) => gsap.to(groupe(nom), { backgroundColor: 'rgba(255,176,138,0.14)', borderLeftColor: 'rgba(255,176,138,1)', duration: 0.3 });
    const eteindre = (nom) => gsap.to(groupe(nom), { backgroundColor: 'rgba(255,176,138,0)', borderLeftColor: 'rgba(255,176,138,0)', duration: 0.3 });
    const noter = (k) => gsap.from(notes[k], { autoAlpha: 0, x: 24, duration: 0.5, ease: 'power3.out' });
    gsap.set(q('.sv__anneau'), { '--tourne': 'paused' });

    return enEtapes(gsap.timeline({ paused: true }).addLabel('debut', 0), [
      () => gsap.timeline()
        .add(entreeTete(slide), 0)
        .from(q('.sv__tsx'), { x: -50, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
        .from(q('.sv__demo'), { y: 30, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.2)
        .add(allumer('svg'), 0.6)
        .fromTo(q('.sv__cadre rect'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 0.6)
        .from(qa('.sv__coord'), { autoAlpha: 0, duration: 0.4, stagger: 0.2 }, 1.2)
        .add(noter(0), 0.8),
      () => gsap.timeline()
        .add(eteindre('svg'), 0)
        .add(allumer('defs'), 0)
        .fromTo(q('.sv__rail'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut' }, 0.2)
        .add(noter(1), 0.3),
      () => gsap.timeline()
        .add(eteindre('defs'), 0)
        .add(allumer('text'), 0)
        .from(q('.sv__texte'), { autoAlpha: 0, duration: 0.3 }, 0.2)
        .fromTo(q('.sv__texte textPath'), { attr: { textLength: 120 } }, { attr: { textLength: 389 }, duration: 1.2, ease: 'power2.inOut' }, 0.2)
        .add(noter(2), 0.3),
      () => gsap.timeline()
        .add(eteindre('text'), 0)
        .from(q('.sv__scss'), { y: 30, autoAlpha: 0, duration: 0.5, ease: 'power3.out' }, 0)
        .add(allumer('css'), 0.4)
        .to(q('.sv__rail'), { opacity: 0.35, duration: 0.4 }, 0.3)
        .to(q('.sv__etoile'), { rotation: 30, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' }, 0.5)
        .set(q('.sv__anneau'), { '--tourne': 'running' }, 0.5)
        .add(noter(3), 0.4)
    ]);
  }

  // Une entrée par diapositive à étapes : 'slide-xx': controleurEtapes(construireXxx)
  const controleurs = {
    'slide-02': controleurEtapes(construireDeroule),
    'slide-03': controleurEtapes(construireQui),
    'slide-04': controleurEtapes(construireFormation),
    'slide-05': controleurEtapes(construireBluel),
    'slide-06': controleurEtapes(construireFacon),
    'slide-07': controleurEtapes(construireCherche),
    'slide-08': controleurEtapes(construireApprofondir),
    'slide-09': controleurEtapes(construireDonnees),
    'slide-10': controleurEtapes(construireMoodboard),
    'slide-11': controleurEtapes(construireSass),
    'slide-12': controleurEtapes(construireVerre),
    'slide-13': controleurEtapes(construireAccessibilite),
    'slide-14': controleurEtapes(construireStack),
    'slide-15': controleurEtapes(construireHebergement),
    'slide-16': controleurEtapes(construireTests),
    'slide-17': controleurEtapes(construireVitesse),
    'slide-18': controleurEtapes(construireDeuxProjets),
    'slide-19': controleurEtapes(construireKasa),
    'slide-20': controleurEtapes(construireGrimoire),
    'slide-21': controleurEtapes(construireInitiatives),
    'slide-22': controleurEtapes(construireResume),
    'slide-23': controleurEtapes(construireMerci),
    'annexe-01': controleurEtapes(construireAnnexeSvg)
  };

  function avancerEtape() {
    const slide = slides[current];
    const max = Number(slide.dataset.etapes) || 0;
    if (!max || etape >= max) return false;
    etape += 1;
    controleurs[slide.id].aller(etape, etape - 1);
    live.textContent = `Étape ${etape} sur ${max}`;
    signalerEtape();
    return true;
  }

  function reculerEtape() {
    const slide = slides[current];
    const max = Number(slide.dataset.etapes) || 0;
    if (!max || etape <= 1) return false;
    etape -= 1;
    controleurs[slide.id].aller(etape, etape + 1);
    live.textContent = `Étape ${etape} sur ${max}`;
    signalerEtape();
    return true;
  }

  /* ---------- Animations des autres diapositives (une par diapositive) ---------- */
  const animations = {};

  /* ---------- La profondeur de verre : un seul monde pour toute la présentation ----------
     Chaque diapositive « pv » est une plaque, posée plus loin que la précédente (PAS).
     Ses couches ont une position dans l'espace (data-x, data-y, data-z, relatives à la diapositive),
     et une caméra commune se déplace devant elles : passer à la diapositive suivante,
     c'est avancer la caméra à travers la plaque courante jusqu'à la suivante.
     Une petite projection en perspective, faite à la main : les couches restent des éléments
     plats (pas de preserve-3d), ce qui garde le flou du verre (backdrop-filter) actif en mouvement.
     Les mouvements de caméra ne sont pas dans le gsap.context des diapositives : annuler une
     animation de slide ne doit jamais faire sauter la caméra. */
  const profondeur = (() => {
    const FOCALE = 1200;       // distance de mise au point : une couche à z = 1200 s'affiche à sa taille réelle
    const PAS = 3200;          // distance entre deux diapositives
    const PROCHE = 220;        // en deçà, la couche est derrière la caméra (ou trop près pour être dessinée)
    const FONDU = 560;         // à l'approche, la couche s'efface sur cette distance
    const camera = { x: 0, y: 0, z: 0 };
    let mouvement = null;
    let flottement = null;

    // Les couches de chaque diapositive, avec leur profondeur dans le monde
    const scenes = new Map();
    slides.forEach((slide, i) => {
      if (!slide.classList.contains('pv')) return;
      scenes.set(slide, Array.from(slide.querySelectorAll('[data-z]')).map((el) => ({
        el,
        x: Number(el.dataset.x || 0),
        y: Number(el.dataset.y || 0),
        z: Number(el.dataset.z) + i * PAS,
        r: Number(el.dataset.r || 0)
      })));
    });

    const estScene = (slide) => scenes.has(slide);
    const repos = (i) => ({ x: 0, y: 0, z: i * PAS });

    function projeter(couches, cam) {
      couches.forEach((c) => {
        const d = c.z - cam.z;
        if (d <= PROCHE) {
          c.el.style.visibility = 'hidden';
          return;
        }
        const s = FOCALE / d;
        const x = (c.x - cam.x) * s;
        const y = (c.y - cam.y) * s;
        c.el.style.visibility = '';
        c.el.style.opacity = Math.min(1, (d - PROCHE) / FONDU);
        c.el.style.zIndex = Math.round(100000 - d);
        c.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)}) rotate(${c.r}deg)`;
      });
    }

    // On ne projette que les diapositives à l'écran : celle qu'on regarde, et celle qu'on traverse
    function rendre() {
      scenes.forEach((couches, slide) => {
        if (slide.classList.contains('is-active') || slide.classList.contains('is-sortante')) projeter(couches, camera);
      });
    }

    function arreter() {
      if (mouvement) { mouvement.kill(); mouvement = null; }
      if (flottement) { flottement.kill(); flottement = null; }
    }

    // Au repos, la caméra flotte : les couches glissent à des vitesses différentes selon leur profondeur
    function flotter() {
      if (!window.gsap || reduceMotion.matches) return;
      flottement = gsap.to(camera, { x: 90, y: -45, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: rendre });
    }

    // Se placer devant une diapositive, sans mouvement
    function placer(i) {
      arreter();
      Object.assign(camera, repos(i));
      rendre();
      flotter();
    }

    // Voyager jusqu'à une diapositive voisine ; fin() est appelée à l'arrivée
    function aller(i, fin) {
      arreter();
      mouvement = gsap.to(camera, {
        ...repos(i),
        duration: 1.9,
        ease: 'power2.inOut',
        onUpdate: rendre,
        onComplete: () => { mouvement = null; if (fin) fin(); flotter(); }
      });
    }

    // L'arrivée sur la couverture : la caméra part de loin et traverse les plaques d'entrée
    function entrer(i, duree) {
      arreter();
      Object.assign(camera, { x: -280, y: 160, z: i * PAS - 2450 });
      rendre();
      mouvement = gsap.to(camera, {
        ...repos(i),
        duration: duree,
        ease: 'power3.inOut',
        onUpdate: rendre,
        onComplete: () => { mouvement = null; flotter(); }
      });
    }

    // Pour la vue d'ensemble : poser une diapositive comme vue depuis son repos, sans bouger la caméra
    function figer(slide) {
      if (!estScene(slide)) return;
      projeter(scenes.get(slide), repos(slides.indexOf(slide)));
    }

    return { estScene, placer, aller, entrer, figer, rendre };
  })();

  /* Diapositive 1 : la caméra traverse les plaques de verre jusqu'à la dalle, où le nom s'écrit.
     En revenant de la diapositive 2 (voyage), seul le décor vivant repart : pas de nouvelle entrée. */
  const DUREE_ENTREE = 3.4;

  animations.couverture = (slide, { voyage, retour }) => {
    const anneau = slide.querySelector('.badge__anneau');
    const reflets = slide.querySelectorAll('.verre__reflet');
    let fin = 0;

    // Le mouvement de caméra de l'entrée est lancé par show() (data-entree), hors de ce contexte
    if (!voyage && !retour) {
      const DUREE = DUREE_ENTREE;
      const tl = gsap.timeline()
        // Des reflets passent sur la dalle et les cartes, l'un après l'autre
        .fromTo(reflets, { '--reflet': '130%' }, { '--reflet': '-30%', duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, DUREE - 1)
        // Le nom s'écrit quand la caméra arrive : les lettres montent de sous leur ligne
        .from(slide.querySelectorAll('.pv-nom .lettre'), { yPercent: 120, rotation: 8, duration: 1.3, stagger: 0.04, ease: 'expo.out' }, DUREE - 1.05)
        .from(slide.querySelectorAll('.pv-dalle__label, .pv-metier'), { x: -40, autoAlpha: 0, duration: 1, stagger: 0.3, ease: 'power3.out' }, DUREE - 0.6)
        // L'étoile se trace branche par branche, l'anneau arrive en tournant
        .fromTo(slide.querySelectorAll('.badge__etoile path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.14, ease: 'power2.inOut' }, DUREE - 0.7)
        .from(anneau, { rotation: -140, autoAlpha: 0, duration: 1.6, ease: 'expo.out' }, DUREE - 0.65);
      fin = tl.duration();
    }

    // Le décor vivant : l'anneau tourne lentement, des reflets repassent de temps en temps
    gsap.to(anneau, { rotation: '+=360', duration: 48, ease: 'none', repeat: -1, delay: fin });
    gsap.fromTo(reflets, { '--reflet': '130%' }, { '--reflet': '-30%', duration: 2.2, stagger: 0.25, ease: 'power1.inOut', repeat: -1, repeatDelay: 8, delay: fin + 3 });
  };

  // contexte.voyage : on arrive par un voyage de caméra depuis la diapositive voisine
  function play(slide, contexte = {}) {
    if (animation) {
      animation.revert();
      animation = null;
    }
    const make = animations[slide.dataset.anim];
    if (!make || !window.gsap || (reduceMotion.matches && !make.toujours)) return;
    animation = gsap.context(() => make(slide, contexte), slide);
  }

  /* ---------- Mise à l'échelle et navigation ---------- */
  function fit() {
    const panneau = window.Notes && window.Notes.hauteurOuverte ? window.Notes.hauteurOuverte() : 0;
    const haut = window.Notes && window.Notes.decalageHaut ? window.Notes.decalageHaut() : 0;
    const deck = document.getElementById('deck');
    deck.style.top = `${haut}px`;
    deck.style.bottom = `${panneau - haut}px`;
    const reste = window.innerHeight - panneau;
    const scale = Math.min(window.innerWidth / SLIDE_W, reste / SLIDE_H);
    stage.style.setProperty('--scale', scale);
  }
  window.Deck = { refit: fit };

  /* ---------- Script (touche N) et vue présentateur (touche P) ----------
     Repris du deck de soutenance de Menu Maker. Le passage du script affiché suit les clics :
     sur une diapositive à étapes, l'étape 1 est le premier passage. */
  const passage = () => (slides[current] && slides[current].dataset.etapes ? Math.max(0, etape - 1) : 0);
  const clicsDe = (slide) => (slide && slide.dataset.etapes ? Number(slide.dataset.etapes) - 1 : 0);

  function signalerEtape() {
    if (window.Notes) window.Notes.etape(passage());
    publierEtat();
  }

  const CLE_ETAT = 'portfolio-etat-1';
  const CLE_CMD = 'portfolio-cmd-1';
  const DUREE_VISEE = 15 * 60;
  let dernierOrdre = 0;
  let fenetrePres = null;
  let minuteur = { on: false, running: false, sec: 0, id: null };

  function publierEtat() {
    try {
      if (!localStorage.getItem('portfolio-catalogue-1') && window.Notes && window.Notes.publierCatalogue) {
        window.Notes.publierCatalogue();
      }
      localStorage.setItem(CLE_ETAT, JSON.stringify({
        i: current,
        etape: passage(),
        etapes: clicsDe(slides[current]),
        minuteur: { on: minuteur.on, running: minuteur.running, sec: minuteur.sec, cible: DUREE_VISEE },
        ts: Date.now()
      }));
    } catch (e) { /* stockage indisponible : la vue présentateur restera muette */ }
  }

  function peindreMinuteur() {
    const el = document.getElementById('timer');
    const m = Math.floor(minuteur.sec / 60);
    const sec = minuteur.sec % 60;
    el.querySelector('.t').textContent = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    el.classList.toggle('is-on', minuteur.on);
    el.classList.toggle('is-paused', !minuteur.running);
    el.classList.toggle('is-over', minuteur.sec > DUREE_VISEE);
    publierEtat();
  }

  function basculerMinuteur() {
    const tic = () => { minuteur.sec += 1; peindreMinuteur(); };
    if (!minuteur.on) { minuteur.on = true; minuteur.running = true; minuteur.id = setInterval(tic, 1000); }
    else if (minuteur.running) { minuteur.running = false; clearInterval(minuteur.id); }
    else { minuteur.running = true; minuteur.id = setInterval(tic, 1000); }
    peindreMinuteur();
  }

  function remettreMinuteur() {
    clearInterval(minuteur.id);
    minuteur = { on: true, running: false, sec: 0, id: null };
    peindreMinuteur();
  }

  // Message bref en bas de l'écran
  function annoncer(txt, duree) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = txt;
    t.classList.add('is-on');
    clearTimeout(annoncer.id);
    annoncer.id = setTimeout(() => t.classList.remove('is-on'), duree || 3000);
  }

  function ouvrirPresentateur() {
    if (fenetrePres && !fenetrePres.closed) {
      fenetrePres.focus();
      annoncer('Vue présentateur déjà ouverte — elle est passée au premier plan.');
      return;
    }
    fenetrePres = window.open('presentateur.html', 'portfolio-presentateur', 'width=820,height=940');
    publierEtat();
    if (!fenetrePres) annoncer("Le navigateur a bloqué l'ouverture. Ouvrez presentateur.html vous-même : la synchronisation marche pareil.", 7000);
    else annoncer('Vue présentateur ouverte. Placez-la à côté des slides.');
  }

  // Les flèches ne déroulent que leur section : la fin du déroulé ne glisse pas dans les annexes, et une annexe ne mène nulle part
  function suivant() { if (!avancerEtape() && !estAnnexe(current) && current + 1 < nbPrincipales) show(current + 1); }
  function precedent() { if (!reculerEtape() && !estAnnexe(current)) show(current - 1); }

  function executerOrdre(c) {
    if (!c || !c.ts || c.ts === dernierOrdre) return;
    dernierOrdre = c.ts;
    if (c.action === 'next') suivant();
    else if (c.action === 'prev') precedent();
    else if (c.action === 'go') show(c.i);
    else if (c.action === 'minuteur') basculerMinuteur();
    else if (c.action === 'minuteur-zero') remettreMinuteur();
  }

  // Les deux fenêtres se parlent par le stockage local : événement « storage », doublé d'un relevé régulier
  (() => {
    try { const v = localStorage.getItem(CLE_CMD); if (v) dernierOrdre = (JSON.parse(v) || {}).ts || 0; } catch (e) {}
    window.addEventListener('storage', (e) => {
      if (e.key !== CLE_CMD || !e.newValue) return;
      try { executerOrdre(JSON.parse(e.newValue)); } catch (err) {}
    });
    setInterval(() => { try { const v = localStorage.getItem(CLE_CMD); if (v) executerOrdre(JSON.parse(v)); } catch (e) {} }, 250);
    setInterval(publierEtat, 2000);
  })();

  function show(index) {
    const precedent = current;
    const cible = Math.max(0, Math.min(slides.length - 1, index));
    if (cible === precedent) return;
    current = cible;

    const slide = slides[current];
    const avant = precedent >= 0 ? slides[precedent] : null;
    const scene = slide.dataset.scene;
    // Les diapositives d'une même scène partagent la section « hôte » qui contient le décor
    const hote = scene ? document.querySelector(`.slide[data-scene="${scene}"][data-hote]`) : slide;

    slides.forEach((s) => {
      const visible = s === hote;
      s.classList.toggle('is-active', visible);
      s.classList.remove('is-sortante');
      s.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });

    // Profondeur de verre : entre deux diapositives « pv » voisines (les slides de partie), la caméra
    // voyage à travers la plaque quittée ; pour un saut plus long, elle se place directement
    const retour = precedent > cible;
    const voyage = Boolean(avant) && Math.abs(cible - precedent) === 1
      && profondeur.estScene(avant) && profondeur.estScene(slide)
      && Boolean(window.gsap) && !reduceMotion.matches;
    if (voyage) {
      avant.classList.add('is-sortante');
      profondeur.aller(cible, () => avant.classList.remove('is-sortante'));
    } else if (profondeur.estScene(slide)) {
      // data-entree : la caméra arrive de loin en traversant les plaques d'entrée (la couverture),
      // sauf quand on y revient depuis une diapositive suivante : elle se place directement
      if (slide.hasAttribute('data-entree') && !retour && window.gsap && !reduceMotion.matches) profondeur.entrer(cible, DUREE_ENTREE);
      else profondeur.placer(cible);
    }
    // Pas de numéro sur les diapositives qui occupent tout l'écran (la couverture)
    stage.classList.toggle('sans-numero', slide.hasAttribute('data-sans-numero'));

    const annexe = estAnnexe(current);
    const rang = annexe ? current - nbPrincipales + 1 : current + 1;
    const label = annexe ? `Annexe ${rang}` : `${rang} / ${nbPrincipales}`;
    numberEl.textContent = label;
    live.textContent = annexe ? label : `Diapositive ${label}`;
    history.replaceState(null, '', `#${annexe ? 'annexe' : 'slide'}-${String(rang).padStart(2, '0')}`);

    etape = 0;
    // En arrivant par la droite on commence à l'étape 1, en revenant par la gauche on reprend à la dernière
    if (slide.dataset.etapes) etape = cible < precedent ? Number(slide.dataset.etapes) : 1;
    if (slide.dataset.etapes) {
      if (animation) { animation.revert(); animation = null; }
      controleurs[slide.id].entrer(etape);
    } else {
      play(slide, { voyage, retour });
    }
    if (window.Notes) window.Notes.montrer(current, slide, passage());
    publierEtat();
  }

  /* ---------- Recommencer la diapositive (touche D, comme « début ») ----------
     On rejoue la diapositive en cours depuis sa première étape, comme si on y arrivait depuis la précédente. */
  function recommencer() {
    if (current < 0) return;
    const i = current;
    current = i - 1;
    show(i);
  }

  /* ---------- Vue d'ensemble (touche G) ----------
     Chaque diapositive est copiée dans son état final, en miniature ; un clic ou Entrée y mène. */
  const vue = document.createElement('div');
  vue.id = 'vue-ensemble';
  vue.hidden = true;
  vue.setAttribute('role', 'dialog');
  vue.setAttribute('aria-label', 'Vue d\'ensemble des diapositives');
  document.body.append(vue);
  let selection = 0;

  function titreDe(slide, i) {
    return slide.dataset.title || slide.getAttribute('aria-label') || `Diapositive ${i + 1}`;
  }

  function copie(hote) {
    const c = hote.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    c.querySelectorAll('[data-sans-apercu]').forEach((el) => el.remove());
    c.classList.add('is-active');
    c.removeAttribute('aria-hidden');
    c.setAttribute('inert', '');
    // Une vidéo copiée se téléchargerait à nouveau : on n'en garde que l'image d'attente
    c.querySelectorAll('video').forEach((v) => { v.removeAttribute('src'); v.preload = 'none'; });
    return c;
  }

  // Les miniatures ne changent pas (état final de chaque diapositive) : construites une fois, puis réutilisées
  let vueConstruite = false;

  function ouvrirVue() {
    if (vueConstruite) {
      vue.querySelectorAll('.vue__tuile').forEach((t, k) => t.classList.toggle('is-courante', k === current));
      vue.hidden = false;
      redimensionnerVue();
      choisir(current);
      return;
    }
    vueConstruite = true;
    const grille = document.createElement('div');
    grille.className = 'vue__grille';
    const grilleAnnexes = document.createElement('div');
    grilleAnnexes.className = 'vue__grille';
    slides.forEach((slide, i) => {
      const scene = slide.dataset.scene;
      const hote = scene ? document.querySelector(`.slide[data-scene="${scene}"][data-hote]`) : slide;
      // État final de la diapositive avant de la copier, vue depuis son point de repos
      if (slide.dataset.etapes) controleurs[slide.id].placer(Number(slide.dataset.etapes));
      profondeur.figer(slide);
      const tuile = document.createElement('button');
      tuile.type = 'button';
      tuile.className = 'vue__tuile' + (i === current ? ' is-courante' : '');
      tuile.dataset.index = i;
      const ecran = document.createElement('div');
      ecran.className = 'vue__ecran';
      const scene1080 = document.createElement('div');
      scene1080.className = 'vue__scene';
      scene1080.append(copie(hote));
      ecran.append(scene1080);
      const legende = document.createElement('span');
      legende.className = 'vue__legende';
      legende.textContent = estAnnexe(i)
        ? `A${i - nbPrincipales + 1} · ${slide.dataset.title}`
        : `${String(i + 1).padStart(2, '0')} · ${titreDe(slide, i)}`;
      tuile.append(ecran, legende);
      tuile.addEventListener('click', () => { fermerVue(); show(i); });
      tuile.addEventListener('mouseenter', () => choisir(i));
      (estAnnexe(i) ? grilleAnnexes : grille).append(tuile);
    });
    vue.append(grille);
    // Les annexes, à part, sous le déroulé principal
    if (grilleAnnexes.children.length) {
      const titre = document.createElement('h2');
      titre.className = 'vue__section';
      titre.textContent = 'Annexes';
      vue.append(titre, grilleAnnexes);
    }
    // Remettre la diapositive en cours dans son état
    const slide = slides[current];
    if (slide.dataset.etapes) controleurs[slide.id].placer(etape);
    profondeur.rendre();
    vue.hidden = false;
    redimensionnerVue();
    choisir(current);
  }

  function fermerVue() {
    vue.hidden = true;
  }

  function choisir(i) {
    selection = Math.max(0, Math.min(slides.length - 1, i));
    vue.querySelectorAll('.vue__tuile').forEach((t, k) => t.classList.toggle('is-choisie', k === selection));
    const t = vue.querySelectorAll('.vue__tuile')[selection];
    if (t) t.focus({ preventScroll: false });
  }

  function redimensionnerVue() {
    const t = vue.querySelector('.vue__ecran');
    if (t) vue.style.setProperty('--vue-echelle', t.offsetWidth / SLIDE_W);
  }

  function colonnesVue() {
    const tuiles = vue.querySelectorAll('.vue__tuile');
    if (tuiles.length < 2) return 1;
    const y0 = tuiles[0].offsetTop;
    let n = 0;
    while (n < tuiles.length && tuiles[n].offsetTop === y0) n += 1;
    return n;
  }

  function pleinEcran() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  function fromHash() {
    const m = location.hash.match(/^#(slide|annexe)-(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[2], 10) - 1 + (m[1] === 'annexe' ? nbPrincipales : 0);
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // On écrit dans le panneau de script : les touches servent au texte, pas à la présentation
    if (e.target && e.target.closest && e.target.closest('textarea, input, [contenteditable="true"]')) return;

    // Script, vue présentateur, minuteur
    if (e.key === 'n' || e.key === 'N') { document.getElementById('notes').classList.toggle('is-open'); fit(); return; }
    if (e.key === 'p' || e.key === 'P') { ouvrirPresentateur(); return; }
    if (e.key === 't' || e.key === 'T') { if (e.shiftKey) remettreMinuteur(); else basculerMinuteur(); return; }

    // Raccourcis valables partout
    if (e.key === 'f' || e.key === 'F') { pleinEcran(); return; }

    // Dans la vue d'ensemble : flèches pour choisir, Entrée pour y aller, G ou Échap pour fermer
    if (!vue.hidden) {
      e.preventDefault();
      const col = colonnesVue();
      switch (e.key) {
        case 'ArrowRight': choisir(selection + 1); break;
        case 'ArrowLeft': choisir(selection - 1); break;
        case 'ArrowDown': choisir(selection + col); break;
        case 'ArrowUp': choisir(selection - col); break;
        case 'Enter': case ' ': fermerVue(); show(selection); break;
        case 'g': case 'G': case 'Escape': fermerVue(); break;
      }
      e.stopImmediatePropagation();
      return;
    }
    if (e.key === 'g' || e.key === 'G') { e.preventDefault(); ouvrirVue(); return; }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); recommencer(); return; }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      // Retour à la couverture (et son entrée est rejouée si on y est déjà)
      if (current === 0) recommencer();
      else show(0);
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        suivant();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        precedent();
        break;
      case 'Home':
        e.preventDefault();
        show(0);
        break;
      case 'End':
        e.preventDefault();
        show(nbPrincipales - 1);
        break;
    }
  });

  window.addEventListener('resize', () => { fit(); redimensionnerVue(); });
  fit();

  // Attendre la police avant la première animation : les lettres sont mesurées dans la bonne fonte
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    animerFond();
    show(fromHash());
  });
})();
