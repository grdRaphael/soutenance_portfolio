# Plan de la soutenance — Portfolio (P8)

Le plan sert de base au script (`script.md`, plus tard) et aux diapositives. Une section par diapo, comme pour Menu Maker et Mon Vieux Grimoire.

**Sources** :
- les consignes de la soutenance (30 min : 15 de présentation, 10 de discussion, 5 de débrief) ;
- `Portfolio/portfolio_grd_raphael/journal-technique.md` : le contenu (noté **J :** + titre de l'entrée) ;
- le texte du site lui-même (`src/components/`), pour le pitch notamment ;
- `Projets/kasa/` et `Projets/mon-vieux-grimoire/preparation-soutenance.md` : les deux projets ;
- le ton : `OC Projet 7 /presentation-menu-maker/script.md` et `OC projet 6/soutenance-v2/script.md`.

**Le ton des anciens scripts, à garder** :
- des phrases courtes, une idée par clic (`[→]`) ;
- une phrase de transition qui annonce chaque partie (« Passons à… », « Voyons maintenant… ») ;
- pour chaque choix, **le choix, puis la raison principale**, et rien de plus ;
- un exemple concret plutôt qu'une définition (« Paul modifie l'identifiant dans l'adresse… ») ;
- les termes techniques expliqués en une demi-phrase la première fois ;
- les détails sont gardés pour la discussion et les annexes.

**Budget** : environ 140 mots par minute à l'oral, soit **2 000 à 2 100 mots** pour 15 minutes.

---

## Le fil rouge

Ce qui relie les parties, à faire entendre trois ou quatre fois, sans le marteler :

1. **Un choix esthétique a un coût, et je le traite.** Le glassmorphisme fragilise la lisibilité : couleurs choisies pour le contraste, deux niveaux de verre, verre opaque sur demande.
2. **Le natif avant les bibliothèques.** Animations en CSS, `Intl` pour l'horloge, `<textPath>` pour le badge, `fetch` pour le formulaire : rien d'autre que React et React Router.
3. **Mesurer plutôt qu'affirmer.** Lighthouse, WAVE, pipette, `ffprobe`, `grep` dans `dist/`.

---

## Le déroulé

| # | Partie | Diapos | Durée | Cumul |
|---|---|---|---|---|
| 0 | Ouverture | 1 – 2 | 30 s | 0:30 |
| 1 | Le pitch (À propos) | 3 – 4 | 1 min 30 | 2:00 |
| 2 | L'architecture du portfolio | 5 – 10 | 4 min | 6:00 |
| 3 | Les choix techniques et les outils | 11 – 12 | 2 min | 8:00 |
| 4 | SEO, accessibilité, performances | 13 – 15 | 2 min 30 | 10:30 |
| 5 | Deux projets de formation | 16 – 18 | 3 min 30 | 14:00 |
| 6 | Initiatives et démarche | 19 | 1 min | 15:00 |
| 7 | Conclusion | 20 – 21 | 20 s | **15:20** |

**Pourquoi cet ordre** : je raconte d'abord le site comme un visiteur le découvre (qui je suis, puis la visite), puis je passe sous le capot (technique, mesures). Les deux projets arrivent ensuite : l'évaluateur connaît déjà la fiche projet qui les présente, et la fin de l'oral porte sur mon profil (projets, initiatives), ce que demandent les consignes (« orientée mise en valeur de votre profil »).

Les 6 points exigés sont tous couverts : pitch (partie 1), architecture (2), choix techniques (3), SEO / accessibilité / performances (4), deux projets (5), initiatives (6).

---

## 0. Ouverture — 30 s

### Diapo 1 — Couverture
- Raphaël Grondin, développeur web full-stack. L'adresse du site en ligne.
- Une phrase : je vais vous présenter mon portfolio.
- Visuel : le Hero en grand.

### Diapo 2 — Le déroulé
- Les 6 parties annoncées, une par clic.

---

## 1. Le pitch — 1 min 30

Les consignes : « votre pitch personnel, tel qu'il apparaît sur la page À propos ». Donc le texte du site, dit à l'oral, avec la capture de la section à l'écran.

### Diapo 3 — Qui je suis
- **L'accroche** : développeur web full-stack, de l'interface React à l'API Node.js, attentif à l'accessibilité et aux performances.
- **Le parcours** : coach sportif, puis responsable de centre de fitness à La Réunion ; mes premières lignes de code en Google Apps Script pour automatiser la gestion des adhérents. Le goût de simplifier le travail des autres.
- Visuel : des mots-clés qui apparaissent un par un (pas le texte du site : le pitch est dit avec mes mots, même fond). Pas la frise du Parcours : « coach sportif » n'y figure pas.
- J : « À propos et Compétences », « Le parcours ».

### Diapo 4 — Ce que je sais faire et ce que je cherche
- **Formation et stack** : HTML, CSS, JavaScript, React / Node.js, Express, MongoDB.
- **Un projet marquant** : Sophie Bluel, réécrit en React et TypeScript de ma propre initiative.
- **Mon approche** : comprendre ce que je construis ; un journal de chaque décision.
- **Mes ambitions** : premier poste de développeur full-stack junior, équipe produit, startup ou PME.
- Transition : « Voyons maintenant comment ce portfolio est construit. »

---

## 2. L'architecture du portfolio — 4 min

Les consignes : « navigation, sections, responsive, accessibilité, design system ».

### Diapo 5 — Le parcours d'un recruteur (navigation et sections)
- Une page d'accueil à ancres, dans l'ordre des questions d'un recruteur : qui je suis (Hero, À propos), ce que je sais faire (Compétences), la preuve (Projets), d'où je viens (Parcours), comment me joindre (Contact).
- Le lien du menu se souligne selon la section lue (`IntersectionObserver`, `aria-current`).
- Le CV accessible depuis le badge du Hero et le Contact.
- En passant sur l'À propos : « Ce que je viens de vous dire, vous le retrouvez ici, en cinq rubriques. » C'est ce moment qui montre le pitch « tel qu'il apparaît sur la page ».
- Visuel : l'accueil en défilement (vidéo ou capture longue), les sections numérotées.
- J : « Le lien actif du menu », « Le CV en PDF ».

### Diapo 6 — Une page par projet
- Un gabarit commun (en-tête, pied de page, lien d'évitement écrits une seule fois).
- Une seule page `/projet/:id` pour tous les projets : une adresse à envoyer à un recruteur.
- Le contenu dans des fichiers JSON, vérifiés par un type TypeScript : ajouter un projet = ajouter un objet.
- La 404 garde le menu : jamais sans issue.
- Visuel : schéma simple du routage (Layout → Accueil / Fiche / 404) + capture d'une fiche.
- J : « Le routage », « Les données en JSON et le type `Project` », « La fiche projet ».

### Diapo 7 — Le responsive
- Grille des compétences 4 → 2 → 1 colonnes ; tailles fluides avec `clamp()`.
- Pas de survol sur mobile : l'aperçu des projets disparaît, l'image et la phrase passent dans chaque ligne, **aucune vidéo téléchargée**.
- Flou réduit sur mobile (calcul coûteux pour un téléphone), `100dvh` pour la barre d'adresse.
- Vérifié à 390 px : aucun défilement horizontal.
- Visuel : ordinateur et mobile côte à côte.
- J : « L'index des projets », « Le fond », « Le Hero ». ⚠️ L'entrée « responsive » du journal est encore « à venir ».

### Diapo 8 — Le design system
- Le glassmorphisme, tiré du mood board : du verre dépoli sur un fond bleu nuit avec trois lueurs et un grain.
- Chaque valeur définie une fois, dans une variable qui porte un rôle (`$background-color: $navy`).
- Le verre est un mixin, réutilisé partout (en-tête, Hero, filtres, champs).
- La hiérarchie par la graisse et les filets, pas par la couleur.
- Visuel : extrait de `_variables.scss` + palette + les deux verres.
- J : « Choisir le glassmorphisme », « Le design system en Sass », « Le fond », « Hiérarchie visuelle ».

### Diapo 9 — Le point faible du verre, traité à trois niveaux
- Avec du verre, le contraste change selon ce qui passe derrière.
- 1) Des lueurs choisies pour que le texte blanc dépasse 4,5:1 (5,7:1 sur le verre léger, 8,2:1 sur le fort).
- 2) Deux niveaux de verre : léger pour ce qu'on montre, fort pour ce qui reste fixe à l'écran.
- 3) « Augmenter le contraste » dans le système : le verre devient presque opaque.
- **Premier passage du fil rouge.**
- Visuel : le même texte sur verre léger / fort / contraste élevé.
- J : « Choisir le glassmorphisme », « Respecter les préférences `prefers-*` ».

### Diapo 10 — L'accessibilité
- Au clavier : le lien « Aller au contenu », le focus toujours visible.
- La structure : balises de repère, listes, `aria-pressed` sur les filtres.
- Le formulaire : erreurs reliées à leur champ, focus sur le premier champ à corriger.
- Le mouvement : animations et vidéos coupées, défilement vers les sections remplacé par un saut direct, pour qui a demandé « Réduire les animations ».
- Visuel : capture du lien d'évitement + d'une erreur de formulaire. Démo en direct possible (Tab).
- J : « Les styles globaux », « L'en-tête… et le lien d'évitement », « Le formulaire de contact », « Respecter les préférences `prefers-*` ».

---

## 3. Les choix techniques et les outils — 2 min

Les consignes : « full-code ou low-code enrichi, frameworks, hébergement, animation ».

### Diapo 11 — Full-Code : la stack
- React (ma formation, les postes visés), TypeScript (les erreurs avant le navigateur), Vite (rapidité), Sass (design system), React Router (une adresse par projet).
- Un choix, une raison, comme pour Menu Maker.
- Visuel : les logos, une ligne chacun.
- J : « Choisir Vite, React, TypeScript, Sass et React Router ».

### Diapo 12 — Hébergement, services, animations
- Vercel relié à GitHub : chaque `git push` met le site à jour ; `vercel.json` pour recharger une fiche sans 404.
- Formspree : un site statique ne peut pas envoyer d'e-mail ; une API pour un formulaire serait disproportionnée.
- Les animations en CSS natif, pas de Framer Motion ; badge du CV en `<textPath>` SVG.
- **Deuxième passage du fil rouge** : aucune dépendance en plus de React et React Router.
- Visuel : schéma GitHub → Vercel → visiteur, Formspree à côté ; le badge qui tourne.
- J : « La mise en ligne », « L'envoi du formulaire », « L'étoile du Hero devient le badge du CV ».

---

## 4. SEO, accessibilité, performances — 2 min 30

Les consignes : « tests réalisés, structure du code, balisage, vitesse de chargement ».

### Diapo 13 — Lighthouse
- 100 / 100 / 100, et le SEO bloqué à 92 : le piège du `robots.txt` (le serveur renvoyait la page HTML à sa place).
- Premier affichage en 0,6 s, page stable pendant le chargement (CLS 0,004 : chaque image a sa place réservée).
- Mesuré sur la version construite, pas sur le serveur de développement (LCP 5,1 s au premier essai).
- **Troisième passage du fil rouge.**
- Visuel : capture des scores.
- J : « Lighthouse : 100 / 100 / 100 ». ⚠️ Scores **en ligne** et **mobile** à mesurer.

### Diapo 14 — WAVE, et ce que les outils ne voient pas
- 0 erreur, 2 alertes analysées. L'une m'a fait ajouter des contrôles à la vidéo (plus de 5 s, lecture automatique : WCAG 2.2.2).
- Les outils ne mesurent pas un contraste sur un fond flouté : vérifié à la pipette.
- Visuel : capture WAVE.
- J : « WAVE : zéro erreur, deux alertes expliquées ».

### Diapo 15 — Le poids et le référencement
- Couvertures redimensionnées : 1,1 Mo → 388 Ko. Vidéos converties en WebM : 3 Mo → 532 Ko.
- Un seul `<h1>`, une description, un titre d'onglet par fiche projet (React 19).
- Les mots-clés tirés de 3 offres d'emploi.
- Visuel : avant / après en chiffres.
- J : « La passe de vérification », « Les vidéos des projets », « `index.html` », « La fiche projet ». ⚠️ Les 3 offres et les mots-clés sont à retrouver ou à faire.

---

## 5. Deux projets de formation — 3 min 30

Les consignes : « contexte, enjeux, stack, réalisations, résultats, axes d'amélioration ». Les six rubriques, dans cet ordre, pour chaque projet : ce sont aussi les rubriques des fiches du site.

### Diapo 16 — Pourquoi ces deux projets
- Les deux faces du profil full-stack, et une progression : Kasa côté front-end, Mon Vieux Grimoire côté back-end.
- 15 s.

### Diapo 17 — Kasa (front-end) — 1 min 30
- Contexte : P5, refaire en React un site de location à partir d'une maquette Figma.
- Enjeux : 4 pages, des composants réutilisables, fidèle à la maquette sur ordinateur et mobile.
- Stack : React, TypeScript, Vite, React Router, Sass, Vercel.
- Réalisation : le menu dépliant en trois versions (l'état placé au bon endroit), et l'animation d'une hauteur automatique.
- Résultats : fidèle, responsive, utilisable au clavier ; logements dans un JSON typé.
- Axes : tests automatisés, carrousel au clavier et au doigt, `prefers-reduced-motion`.
- Visuel : la fiche Kasa du portfolio (vidéo).

### Diapo 18 — Mon Vieux Grimoire (back-end) — 1 min 45
- Contexte : P6, l'API d'un site de notation de livres ; le front était fourni et non modifiable.
- Enjeux : le front impose le contrat, donc je l'ai lu avant d'écrire une route.
- Stack : Node.js, Express 5, MongoDB / Mongoose, JWT, bcrypt, Multer, Sharp.
- Réalisation : ne jamais faire confiance au navigateur (l'auteur vient du token, la moyenne est recalculée côté serveur) ; images vérifiées et converties en WebP en mémoire.
- Résultats : 27 tests d'acceptation, images −98 % (67,5 Mo → 1,2 Mo), en ligne avec une base qui se remet à zéro toute seule.
- Axes : tests automatisés, limiter les tentatives de connexion, stocker les images hors du serveur.
- Visuel : la fiche Mon Vieux Grimoire du portfolio.

---

## 6. Initiatives et démarche — 1 min

### Diapo 19 — Au-delà des consignes
- **GymTracker**, projet personnel : app iPhone et Apple Watch qui reconnaît l'exercice et compte les répétitions. Code écrit par une IA, je le dis : mon rôle a été produit et tests (678 enregistrements, 23 séries reconnues sur 24 sur une séance inédite).
- **Sophie Bluel en React**, réécrit de ma propre initiative et mis en ligne (images 10,4 Mo → 534 Ko).
- **La méthode** : un commit par étape, un journal technique de chaque décision, une variante testée sur une branche Git, le Kanban.
- Visuel : GymTracker + historique des commits + journal.
- ⚠️ Kanban à montrer ; veille technologique : à mentionner ou non ?

---

## 7. Conclusion — 20 s

### Diapo 20 — Pour résumer
- Un portfolio en ligne, accessible et rapide, dont je sais justifier chaque choix. Les trois idées du fil rouge, une ligne chacune.

### Diapo 21 — Des questions ?
- Le lien du site, le lien GitHub.

---

## Annexes pour la discussion

Des diapos prêtes, non présentées, à ouvrir si la question tombe (comme pour Menu Maker). Les cinq premières répondent aux exemples des consignes.

| # | Question | Contenu |
|---|---|---|
| A1 | Pourquoi cette structure ? | Le parcours du recruteur (déjà dit en diapo 5, à approfondir : une page à ancres + une page par projet) |
| A2 | La logique du design system ? | Variables à rôle, deux verres, contrastes, graisse plutôt que couleur |
| A3 | Le projet le plus représentatif ? | ⚠️ À choisir (piste : Sophie Bluel, front + back + initiatives) |
| A4 | La plus grande difficulté ? | Le verre invisible en ligne : `backdrop-filter` supprimé par le minifieur, leçon : tester la version construite |
| A5 | Comment avez-vous utilisé l'IA ? | **La méthode** : à chaque étape, un skill fait relire par l'IA toutes les modifications du code, note les décisions et leur raison dans le journal de bord, et prépare le commit. Ce journal sert ensuite à préparer la soutenance. Sur les projets précédents, je tapais le code à la main et l'IA en faisait la revue. **Comprendre** : chaque ligne qui ne me parle pas, je la fais expliquer par l'IA, et je recoupe avec Gemini ou la recherche de Google, qui cite ses sources. **Vérifier** : exemple des contrastes du verre, calculés par l'IA dans le pire cas, puis mesurés moi-même à l'écran avec le Colour Contrast Analyser (8,2:1 et 7:1). GymTracker : code entièrement écrit par l'IA, mon rôle = produit et tests |
| A6 | Pourquoi React pour un site vitrine ? | JSON typé, filtres, aperçu, formulaire ; limite : rendu côté client (piste Next.js / Astro) |
| A7 | Que feriez-vous de plus ? | Focus au changement de page, `aria-live` sur les filtres, police hébergée, `React.lazy`, rendu serveur |
| A8 | L'e-mail protégé | Le minifieur qui recolle les morceaux, le Base64, pourquoi pas une image |
| A9 | Vos premiers scripts ? | Apps Script au club : extraire nom, prénom, téléphone, e-mail et objectif d'un e-mail d'inscription collé dans Sheets ; numéro +262… réécrit en 0X XX XX XX XX ; suivi des tenues d'électrostimulation (à faire, en cours, à livrer) avec boutons et classement par couleur. Écrit avec l'aide de l'IA de l'époque |

---

## Ce qui manque avant d'écrire le script

- [ ] **Le responsive** : l'entrée du journal est « à venir ». Le contenu de la diapo 7 est reconstitué à partir d'autres entrées.
- [ ] **Lighthouse en ligne et sur mobile** : seule la mesure locale sur ordinateur existe.
- [ ] **Les 3 offres d'emploi et les mots-clés** repris dans le site (exigés par les consignes du livrable).
- [ ] **Le Kanban** : existe-t-il ? Sur quel outil ?
- [ ] **La veille technologique** : à présenter dans les initiatives ou non ?
- [ ] **Le projet le plus représentatif** (annexe A3).
- [ ] **La part de l'IA dans la V2** (annexe A5).
