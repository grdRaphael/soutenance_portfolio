# Script de soutenance — Portfolio

Une section par diapositive, dans l'ordre de la présentation. Chaque `[→]` en début de paragraphe marque un clic.

### SLIDE 1 — Couverture

Je vais vous présenter mon portfolio de développeur web : le site où un recruteur découvre mon profil et mes projets.


### SLIDE 2 — Le déroulé

Je vais dérouler la présentation dans cet ordre :

`[→]` d'abord, qui je suis et ce que je recherche,

`[→]` ensuite je ferais une visite de mon portfolio 

`[→]` puis je présenterais mes choix techniques et les outils que j'ai utilisés,

`[→]` la façon dont j'ai mesuré la qualité du site : référencement, accessibilité et performances,

`[→]` je présenterais deux projets de ma formation,

`[→]` et je terminerai par mes initiatives personnelles.


### SLIDE 3 — Qui je suis

Je commence par me présenter.

`[→]` Je suis Raphaël Grondin, développeur web full-stack : je crée des applications complètes,

`[→]` de l'interface en React

`[→]` à l'API en Node.js,

`[→]` en soignant leur accessibilité et leurs performances.

`[→]` Avant le code, il y a eu le sport : j'ai été coach sportif, puis responsable d'un club de fitness, à La Réunion.

`[→]` En gérant ce club, j'avais beaucoup de tâches répétitives : le suivi des adhérents et les relances clients. J'ai appris Google Apps Script pour les automatiser : c'est du JavaScript qui pilote les outils de Google.

`[→]` Par exemple, les demandes d'inscription arrivaient par e-mail, toujours au même format.

`[→]` Je collais l'e-mail dans le tableau, et mon script rangeait le nom, le téléphone, l'adresse e-mail et l'objectif sportif dans les bonnes colonnes, en retirant l'indicatif +262 et en remettant le numéro au format lisible.

`[→]` Et je me suis rendu compte que ce qui me plaisait vraiment, c'était d'automatiser ce qui faisait perdre du temps, à moi et à mes collègues. C'est ce qui m'a amené au développement.


### SLIDE 4 — Ma formation

Pour me lancer, j'ai suivi la formation Développeur web, que je termine aujourd'hui. Elle couvre trois domaines :

`[→]` le front-end, avec JavaScript et React,

`[→]` le back-end, avec Node.js, Express et MongoDB,

`[→]` et la planification d'un projet Agile, avec Scrum et Kanban.


### SLIDE 5 — Sophie Bluel

Parmi les projets de cette formation, le plus marquant, c'est Sophie Bluel.

`[→]` Je l'ai d'abord codé en JavaScript,

`[→]` puis je l'ai réécrit de ma propre initiative, en React et TypeScript,

`[→]` et je l'ai mis en ligne, avec son API.

`[→]` Et en optimisant les images côté serveur, celles de la démo sont passées de 10,4 Mo à 534 Ko.

`[→]` Et comme la démo est publique, j'ai ajouté des garde-fous pour qu'aucun visiteur ne puisse faire tomber le serveur :

`[→]` un nombre d'envois limité,

`[→]` des images vérifiées avant d'être traitées,

`[→]` et toutes les heures, la démo revient à son état d'origine, projets et images compris.


### SLIDE 6 — Ma façon de travailler

Ce projet résume bien ma façon de travailler. D'abord, comprendre ce que je construis.

`[→]` Avec Kasa seul, je n'avais pas assez pratiqué React pour bien comprendre son fonctionnement : c'est pour ça que j'ai réécrit Sophie Bluel.

`[→]` Et surtout, Kasa lisait ses logements dans un fichier : il n'y avait pas d'API.

`[→]` Avec Sophie Bluel, j'ai appris à relier React à une API, par exemple avec un `useEffect`, qui charge les projets à l'affichage de la page.

`[→]` Sur ce même projet, j'ai aussi soigné les détails qui évitent les erreurs. Par exemple, un double clic sur « Valider » créait deux projets identiques.

`[→]` Désormais, le bouton se désactive pendant l'envoi, et affiche « Envoi en cours… ».

`[→]` Enfin, je note chacune de ces décisions dans un journal de bord, pour pouvoir l'expliquer et y revenir.


### SLIDE 7 — Ce que je cherche

C'est cette façon de travailler que je veux apporter à une équipe. Aujourd'hui, je recherche un premier poste de développeur full-stack junior,

`[→]` dans une équipe produit à taille humaine, en startup ou en PME,

`[→]` pour progresser aux côtés de développeurs expérimentés.


### SLIDE 8 — Ce que je veux approfondir

Dans ce poste, je souhaite approfondir TypeScript,

`[→]` l'architecture back-end,

`[→]` et continuer le développement mobile, que j'ai découvert avec GymTracker, un projet personnel dont je vous reparlerai à la fin.

`[→]` Passons maintenant à la visite de mon portfolio, directement sur le navigateur.


## Démonstration sur le navigateur

[Une seule bascule sur le navigateur, sans revenir aux diapositives : l'accueil, une fiche projet, puis la version mobile.]

#### L'accueil

**[bascule sur le navigateur — page d'accueil]**

Voici la page d'accueil. Je vais la parcourir rapidement, comme le ferait un recruteur.

En haut, le menu mène à chaque section. Pendant la lecture, le lien de la section en cours se souligne : le navigateur me prévient quand une section passe au milieu de l'écran, avec un `IntersectionObserver`, ce qui est plus léger que de recalculer la position de chaque section à chaque défilement.

Le recruteur arrive sur le Hero. En haut, quelques informations : ma spécialité, ma formation, mon statut, avec un point vert « Disponible », et l'heure en direct à La Réunion, pour voir tout de suite le décalage horaire.

En bas, mon nom et mon métier en grand, un bouton « Voir mes projets », et cette étoile. **[survoler l'étoile]** C'est le lien vers mon CV : au survol, le texte « Curriculum vitae · PDF » tourne autour d'elle. J'ai préféré donner un rôle à ce décor plutôt qu'ajouter un bouton de plus.

**[descendre]** Vient ensuite la section À propos, qui reprend le pitch que je viens de vous présenter.

**[descendre]** Les Compétences sont rangées en quatre colonnes : le front-end, le back-end, les outils et le savoir-être.

**[descendre]** Puis les Projets, avec une ligne par projet. **[survoler les lignes]** Au survol, l'aperçu à droite lance un mock-up animé du projet : de vraies captures du site, posées en perspective, qui défilent quelques secondes. **[cliquer sur « Mobile »]** Les filtres trient les projets par catégorie : ici, il ne reste que GymTracker.

**[descendre]** Le Parcours retrace mon chemin, de mes études en STAPS jusqu'à la formation.

**[descendre]** La dernière section, c'est le Contact. On y retrouve mon CV, et un formulaire qui envoie vraiment les messages : comme mon site n'a pas de serveur, j'ai confié l'envoi à Formspree, un service en ligne qui reçoit le formulaire et me le transfère par e-mail.

Tout en bas, le pied de page reprend le menu sous la forme d'une phrase : « Voir mes projets, mon parcours ou me contacter ». Cette idée, comme l'horloge du Hero, vient de portfolios de développeurs que j'ai étudiés avant de commencer le mien.

#### La fiche projet

**[remonter aux Projets, cliquer sur « Tous », puis sur la ligne Kasa]**

Passons aux fiches projet. Un clic sur une ligne ouvre la page du projet.

En haut, l'essentiel : le titre, une phrase d'accroche, les technologies, et les liens vers la démo et le code.

**[descendre]** Ensuite, la vidéo de présentation, puis six rubriques : le contexte, les objectifs, la stack, les compétences, les résultats et les perspectives. C'est sur ces fiches que je m'appuierai tout à l'heure pour vous présenter deux projets.

**[descendre]** Et en bas, les captures d'écran.

**[dans la barre d'adresse, remplacer `kasa` par `inconnu`, puis valider]**

Si l'adresse ne correspond à aucun projet, on arrive sur la page d'erreur. Le menu reste là : le visiteur n'est jamais sans issue.

#### La version mobile

**[cliquer sur mon nom dans le menu pour revenir à l'accueil, puis ouvrir le mode appareil des DevTools, 390 px de large]**

Passons à la version mobile.

**[ouvrir le menu, puis le refermer]** Le menu se replie derrière un bouton. Il s'ouvre en un panneau de grands liens, numérotés comme les sections de la page.

**[descendre aux Projets]** Les filtres quittent leur barre de verre et deviennent des pastilles, qui passent à la ligne quand la place manque.

Et comme il n'y a pas de survol sur mobile, il n'y a pas d'aperçu : l'image et la phrase d'accroche passent dans chaque ligne, et aucune vidéo n'est téléchargée.


**[retour aux slides]**


### SLIDE 9 — Les données des projets

[ÉCRAN : un extrait de `projects.json` à gauche, la liste des projets et une fiche à droite]

Pendant la visite, vous avez vu la liste des projets et leurs fiches. Ces projets ne sont pas écrits dans le code : ils sont rangés dans un fichier JSON.

`[→]` Sur l'accueil, React parcourt ce fichier avec `map`, et crée une ligne par projet.

`[→]` Pour les fiches, je n'ai pas créé une page par projet : une seule page permet d'afficher n'importe quelle fiche.

`[→]` Pour savoir quel projet afficher, elle lit l'identifiant dans l'adresse, par exemple `/projet/kasa`,

`[→]` et cherche le projet correspondant dans le fichier.

`[→]` Donc, il suffit d'ajouter un projet dans ce fichier pour qu'il apparaisse dans la liste, avec sa propre fiche.


### SLIDE 10 — Le mood board

[ÉCRAN : le mood board, puis la palette]

Voyons maintenant le design system.

`[→]` Tout est parti d'un attrait pour le glassmorphisme : des panneaux en verre dépoli, posés sur un fond coloré.

`[→]` Je suis allé chercher des exemples sur Pinterest, et j'en ai fait un mood board.

`[→]` J'en ai gardé un fond bleu nuit traversé de lueurs rouge, orange et bleue, un léger grain,

`[→]` une grande typographie blanche, et même l'étoile du Hero.


### SLIDE 11 — Le design system en Sass

[ÉCRAN : un extrait de `_variables.scss`, puis le mixin du verre]

Pour passer de ce mood board au code, j'ai défini les couleurs, le verre et les arrondis une seule fois, dans des variables Sass :

`[→]` ainsi, si je change de palette, je ne touche pas aux composants.

`[→]` Même chose pour l'effet de verre : il est écrit une seule fois, dans un mixin, une sorte de fonction Sass,

`[→]` que je réutilise partout : l'en-tête, le Hero, les filtres et les champs du formulaire.


### SLIDE 12 — Le point faible du verre

[ÉCRAN : le même texte sur le verre léger, le verre fort, et en contraste élevé]

Mais ce style a un point faible : la lisibilité.

`[→]` Sur un fond uni, le contraste du texte est fixe.

`[→]` Avec un effet de verre, au contraire, il dépend de ce qui apparaît derrière : un texte blanc se lit bien sur le bleu nuit, moins bien au centre d'une lueur orange.

`[→]` J'ai traité ce problème à trois niveaux. D'abord les couleurs : j’ai ajusté celles des lueurs pour conserver un contraste d’au moins 4,5 pour 1 avec le texte blanc, même dans les zones les plus claires.

`[→]` Ensuite, j’ai utilisé deux niveaux de verre : un verre léger dans le Hero, pour laisser apparaître les lueurs, et un verre plus opaque pour l’en-tête, car le contenu qui défile derrière change constamment.

`[→]` Enfin, si le visiteur a activé « Augmenter le contraste » dans son système, le verre devient presque opaque.



### SLIDE 13 — L'accessibilité

[ÉCRAN : le lien « Aller au contenu » au focus, puis une erreur du formulaire]

Le contraste, c'est déjà de l'accessibilité. Passons au reste, en commençant par le clavier.

`[→]` Le premier élément de chaque page, c'est le lien « Aller au contenu ».

`[→]` Il permet de passer le menu au lieu de le traverser à chaque page.

`[→]` Pour les lecteurs d'écran, la page est structurée avec des balises de repère : l'en-tête, la navigation, le contenu principal et le pied de page. On peut ainsi sauter de l'une à l'autre.

`[→]` Le formulaire suit la même logique : chaque erreur est reliée à son champ,

`[→]` et le focus va directement sur le premier champ à corriger. L'erreur n'est pas signalée que par la couleur : il y a aussi un symbole et un texte.

`[→]` Enfin, si « Réduire les animations » est activé dans le système, les animations et les vidéos sont coupées, et un clic dans le menu amène directement à la section, sans défilement. C'est un réglage utilisé par les personnes que le mouvement rend malades.


### SLIDE 14 — La stack

Passons aux choix techniques. J'ai pris l'option Full-Code, avec un outil pour chaque besoin.

`[→]` Pour l'interface, React, parce que c'est la technologie de ma formation, et celle des postes que je vise.

`[→]` J'y ai ajouté TypeScript, pour voir les erreurs dans l'éditeur, avant qu'elles arrivent dans le navigateur.

`[→]` Par exemple, un type décrit ce que doit contenir un projet : si j'oublie un champ dans le fichier JSON, l'éditeur me le signale tout de suite.

`[→]` Pour construire le site, Vite, pour sa rapidité : le serveur de développement démarre presque instantanément,

`[→]` et le build produit un site optimisé.

`[→]` Pour les styles, Sass, qui porte le design system : les variables et les mixins évitent de répéter les valeurs.

`[→]` Et pour la navigation, React Router, pour que chaque projet ait sa propre adresse.


### SLIDE 15 — Hébergement, services et animations

[ÉCRAN : schéma GitHub → Vercel → visiteur, avec Formspree à côté]

`[→]` Une fois construit, le site est hébergé sur Vercel, relié à mon dépôt GitHub :

`[→]` ainsi, chaque `git push` met le site à jour.

`[→]` Il a seulement fallu ajouter un petit fichier de configuration, qui renvoie toutes les adresses vers la page de l'application.

`[→]` Sans lui, recharger une fiche projet donnerait une erreur 404 de l'hébergeur.

`[→]` Reste le formulaire : j'ai choisi Formspree, que je vous ai montré pendant la visite,

`[→]` parce qu'écrire et héberger une API pour un seul formulaire aurait été disproportionné.

`[→]` Côté animations, en revanche, je n'ai pas ajouté de bibliothèque comme Framer Motion :

`[→]` tout est en CSS : le fondu de l'aperçu, le défilement, la rotation du badge du CV.

`[→]` Et le texte qui tourne autour de l'étoile est un simple SVG : le texte est posé sur un cercle.

`[→]` Au final, en dehors de React et de React Router, le site n'a aucune dépendance.


### SLIDE 16 — Les tests

[ÉCRAN : les scores Lighthouse et le bilan WAVE]

Voyons maintenant comment j'ai mesuré la qualité du site.

`[→]` Je commence par Lighthouse, l'outil d'audit intégré à Chrome : il donne 100 en performance, en accessibilité et en bonnes pratiques.

`[→]` Seul le SEO était bloqué à 92, à cause du `vercel.json` : il renvoyait la page du site à la place du `robots.txt`, un petit fichier qui indique aux moteurs de recherche ce qu'ils ont le droit d'explorer.

`[→]` Lighthouse ne trouvait donc pas de vrai `robots.txt` : j'en ai ajouté un.

`[→]` J'ai complété avec WAVE, spécialisé dans l'accessibilité : il ne relève aucune erreur.

`[→]` Il signale seulement des points à vérifier, comme la phrase du pied de page, écrite en grand :

`[→]` il demande si ce n'est pas un titre oublié.

`[→]` C'est voulu : c'est un menu.

`[→]` Mais aucun de ces outils ne sait mesurer un contraste sur un fond flouté.

[ÉCRAN : le titre « Le contraste sur le verre », et à droite un empilement de trois couches, de bas en haut : le fond bleu nuit `#0b1a4a`, la lueur orange `#d9581f` à 70 %, le verre `rgb(10, 20, 64)` à 20 %. Un texte blanc « Aa » posé dessus.]

`[→]` J'ai donc procédé en deux temps. D'abord, j'ai fait calculer ces contrastes par l'IA.

`[→]` Elle a pris les couleurs dans le code, et s'est placée dans le pire cas : le texte au centre de la lueur la plus claire.

[ÉCRAN : une flèche sous l'empilement, vers la couleur obtenue : un carré `#7e3c30`, légendé « couleur réelle derrière le texte »]

[ÉCRAN : la formule, en deux lignes, avec le résultat de l'exemple :
Luminance : L = 0,2126 R + 0,7152 G + 0,0722 B
Ratio : (L clair + 0,05) / (L sombre + 0,05) = (1 + 0,05) / (0,079 + 0,05) ≈ 8,2 : 1 — minimum WCAG AA : 4,5 : 1]

`[→]` Elle a superposé la lueur et le verre pour obtenir la couleur réelle derrière le texte,

`[→]` puis elle a appliqué la formule des WCAG.

[ÉCRAN : les deux captures du Colour Contrast Analyser côte à côte (`captures/cca-lueur-rouge-8-2.png` et `captures/cca-lueur-bleue-7.png`), avec le ratio de chacune entouré]

`[→]` Ensuite, je les ai vérifiés moi-même à l'écran, avec le Colour Contrast Analyser : sa pipette prend la couleur d'un vrai pixel.

`[→]` Sur une lueur rouge, j'obtiens 8,2 pour 1, et sur une lueur bleue, 7 pour 1 : bien au-dessus du minimum de 4,5.


### SLIDE 17 — Vitesse et référencement

[ÉCRAN : le premier affichage, le poids des médias, puis le résultat Google, les onglets et la Search Console.]

Côté performances, le premier affichage arrive en 0,6 seconde.

`[→]` J'ai aussi allégé les médias : les couvertures des projets passent de 1,1 Mo à 388 Ko,

`[→]` et les vidéos sont converties en WebM, un format plus léger.

`[→]` Côté référencement, chaque page a un seul titre principal et une description pour Google,

`[→]` et chaque fiche projet a sa propre adresse et sa propre balise `<title>`,

`[→]` que React 19 place dans le `<head>`, devant le titre général. Chaque projet peut donc être référencé comme une page à part.

`[→]` Encore faut-il que Google trouve le site : je l'ai déclaré dans la Search Console,

`[→]` et j'ai demandé l'indexation de chaque page.


### SLIDE 18 — Deux projets de formation

Passons à deux projets de ma formation.

`[→]` J'ai choisi Kasa et Mon Vieux Grimoire, parce qu'ils montrent les deux faces de mon profil :

`[→]` Kasa côté front-end, Mon Vieux Grimoire côté back-end.


### SLIDE 19 — Kasa

[ÉCRAN : la fiche Kasa du portfolio]

`[→]` Commençons par Kasa, une plateforme de location entre particuliers.

`[→]` Le contexte : le projet fournissait une maquette Figma et un jeu de données au format JSON.

`[→]` Ma mission était de développer l'application front-end en React à partir de ces deux éléments.

`[→]` Pour ça, j'ai utilisé React, TypeScript et React Router, avec Sass pour les styles.

`[→]` Ma réalisation principale, c'est le menu dépliant : un seul composant, réutilisé sur deux pages, avec une animation d'ouverture fluide.

`[→]` Au final, le site est en ligne, fidèle à la maquette sur ordinateur et sur mobile, et chaque adresse fonctionne : un logement qui n'existe pas mène à la page 404, même au rechargement.

`[→]` Pour l'améliorer, je rendrais le carrousel utilisable d'un glissement du doigt sur mobile, et j'ajouterais des filtres sur la page d'accueil, par équipement ou par quartier.


### SLIDE 20 — Mon Vieux Grimoire

[ÉCRAN : la fiche Mon Vieux Grimoire du portfolio]

`[→]` Passons au back-end, avec Mon Vieux Grimoire, un site de notation de livres.

`[→]` Cette fois, le front React était fourni : ma mission était de développer l'API, en Node.js et Express, avec une base MongoDB.

`[→]` Tout l'enjeu, c'était de respecter exactement ce que le front attend, sans pouvoir le modifier.

`[→]` J'ai donc utilisé Node.js, Express et MongoDB, avec JWT pour l'authentification et Sharp pour les images.

`[→]` Sur ce projet, je me suis fixé une règle : ne jamais faire confiance au navigateur.

`[→]` Par exemple, l'auteur d'un livre est lu dans le token, jamais dans la requête : sinon, n'importe qui pourrait publier au nom d'un autre.

`[→]` Pour le vérifier, j'ai testé chaque route avec Postman, y compris les cas qui doivent être refusés, comme modifier le livre d'un autre ou donner une note supérieure à 5.

`[→]` Côté résultats, les images sont 98 % plus légères, et la démo est en ligne.

`[→]` Pour l'améliorer, j'ajouterais des tests automatisés, lancés à chaque modification du code, et je limiterais les tentatives de connexion.


### SLIDE 21 — Au-delà des consignes

Pour finir, mes initiatives personnelles.

`[→]` D'abord GymTracker, le projet personnel dont je vous parlais tout à l'heure : une application iPhone et Apple Watch qui reconnaît l'exercice et compte les répétitions.

`[→]` Le code a été entièrement écrit par une IA, et je le dis clairement : mon rôle a été celui de chef de produit et de testeur.

`[→]` En revanche, j'ai collecté moi-même 678 enregistrements pour entraîner la reconnaissance, et sur une séance qu'elle n'avait jamais vue, elle a reconnu 23 séries sur 24.

`[→]` Il y a aussi Sophie Bluel, dont je vous ai parlé : après le projet en JavaScript, je l'ai réécrit en React et TypeScript de ma propre initiative, et mis en ligne.

`[→]` Enfin, sur chaque projet, j'applique la même méthode : un commit par étape,

`[→]` un journal où chaque décision est notée avec sa raison,

`[→]` et quand j'hésite, une variante testée sur une branche Git, comme pour le badge du CV.


### SLIDE 22 — Pour résumer

Pour résumer, ce portfolio est en ligne,

`[→]` il s'adapte au mobile,

`[→]` il est accessible et rapide,

`[→]` et je sais justifier chacun de ses choix.


### SLIDE 23 — Merci

[ÉCRAN : le lien du site et le lien GitHub]

Voilà pour la présentation. Je reste à votre disposition pour vos questions.


## Annexes

### ANNEXE A1 — Aide-mémoire : le texte circulaire du badge

[ÉCRAN : le SVG du badge dans Hero.tsx, et le même SVG construit étape par étape]

Le badge du CV est un SVG : une image décrite par du code.

`[→]` Dans `<defs>`, un chemin en forme de cercle sert de rail : il est rangé, jamais affiché, et il porte un `id`.

`[→]` `<textPath>` écrit le texte le long de ce rail : son `href` reprend l'`id` du chemin. Et `textLength` vaut le périmètre du cercle : le texte fait exactement un tour.

`[→]` Enfin, une animation CSS fait tourner tout le SVG. Elle est en pause, et ne démarre qu'au survol.
