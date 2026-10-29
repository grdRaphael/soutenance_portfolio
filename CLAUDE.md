# Soutenance du portfolio (P8)

Présentation personnelle de Raphaël Grondin pour la soutenance du projet 8 d'OpenClassrooms (le portfolio). Elle est projetée en plein écran pendant la soutenance. Priorité à l'impact visuel, en restant lisible.

## Contenu

- `plan.md` : le plan de l'oral, une section par diapositive (contenu, visuel, durée).
- `script.md` : le texte parlé, une section `### SLIDE n` par diapositive, un `[→]` par clic. Il n'apparaît pas à l'écran.
- Le texte affiché vient du plan et du script : ne rien inventer. Source des faits : `../Portfolio/portfolio_grd_raphael/journal-technique.md` et le code du site. Ne pas s'appuyer sur `script-soutenance.md` du portfolio.

## Direction artistique

- La charte du portfolio en ligne (https://portfolio-grd-raphael.vercel.app/) : fond bleu nuit, trois lueurs floutées (rouge `#c42d1a`, orange `#d9581f`, bleu `#2c5fd6`), grain, panneaux en verre dépoli, police Manrope.
- Reprendre les éléments du site (Hero, étoile et texte circulaire, point vert, sections numérotées « 01 — », filets…) pour que la présentation prolonge le portfolio.
- Pousser plus loin que le site : animations, glassmorphisme, profondeur. Ici, rien n'est à justifier dans le code.
- Tout reste lisible : texte blanc sur verre, contraste au moins 4,5:1, pas de texte posé directement sur une lueur claire.

## Technique

- Point d'entrée : `src/index.html`. Format 16:9 (1920 × 1080), mis à l'échelle.
- Le moteur est repris tel quel du deck de Menu Maker (`OC Projet 7 /presentation-menu-maker`) : `notes.js`, `presentateur.*`, `moteur.css`, `outils/injecter-script.py`, et la partie navigation de `main.js`. Ne pas le modifier sans demande.
- Touches : flèches / espace (avancer), Origine / Fin, N (script), P (vue présentateur), T (minuteur, Maj+T pour zéro), G (vue d'ensemble), D (rejouer la diapo), R (retour couverture), F (plein écran).
- Animations : GSAP 3.13 (cdnjs) et ses plugins, gratuits depuis cette version : SplitText, ScrambleText, DrawSVG (d'autres possibles : Flip, MotionPath, MorphSVG…). Rejouées à chaque affichage d'une diapositive.
- **Une animation par idée** : chaque `[→]` du script fait apparaître un élément animé, sur lequel mon regard s'appuie. Diapo à étapes : `data-etapes="n"` (n = nombre de passages du script) et un `controleurEtapes` dans `main.js`.
- **Aérer** : une idée par écran, en grand. Si une slide se charge, la découper en plusieurs slides. Une phrase longue se découpe en plusieurs éléments visuels (et en plusieurs `[→]` dans `script.md`, avec mes mots). Les animations démarrent vite (élément principal dès les premiers dixièmes de seconde).
- Varier les animations d'une slide à l'autre, en cherchant des idées originales (Codrops, portfolios primés, démos GSAP).
- Le fond (`.fond`) est commun à toutes les diapositives et dérive en continu.
- **Profondeur de verre** (classe `pv` sur la section, couches `data-x/y/z`) : la caméra voyage entre deux slides `pv` voisines. Réservée à la couverture et aux slides d'ouverture de partie, pour ne pas donner le mal de mer. Entre les autres slides, pas de voyage.
- Après chaque modification de `script.md` : `python3 outils/injecter-script.py`.
- **Noms de classes** : tout le CSS est dans un seul fichier. Avant de créer une classe pour une nouvelle slide, vérifier avec `grep` qu'elle n'existe pas déjà (la slide 7 avait repris `.poste` de la slide 3 et cassé son affichage).

## Méthode de travail

- Une seule diapositive à la fois. Après chaque diapositive, s'arrêter et attendre ma validation.
- Quand je demande une correction, ne modifier que ce que je demande.
- Ne jamais toucher aux diapositives déjà validées sans que je le demande.
