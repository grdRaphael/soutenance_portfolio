/* ==========================================================================
   notes.js — le panneau de script (touche N).

   Ce n'est pas un simple affichage : le texte est modifiable, et ce qu'on y
   écrit est conservé par le navigateur d'une session à l'autre. Le texte de
   départ vient du <template class="slide-script"> déposé dans chaque slide
   par outils/injecter-script.py.

   Le stockage se fait sur l'origine « file:// », ce qui fonctionne sur Chrome
   et Safari mais n'est pas garanti partout : en cas d'échec on prévient au
   lieu de laisser croire que c'est enregistré.
   ========================================================================== */
(function (global) {
  "use strict";

  /* La clé porte le nom du deck : les éditions sont rangées par NUMÉRO de
   slide, donc insérer une slide décale tout ce qui suit. Changer la clé
   remet les compteurs à zéro proprement. */
var CLE = "portfolio-script-1";
  var CLE_BASES = "portfolio-script-bases-1";
  var CLE_ARCHIVE = "portfolio-script-archive-1";
  var CLE_VUE = "portfolio-script-vue-1";
  var H_MIN = 18; // en vh
  var H_MAX = 86;
  var PAS = 8;

  var panneau, zone, ou, etat, conduite, importOverlay, importZone, importEtat;
  var slides = [];
  var idx = 0;
  var edits = {};
  var bases = {};
  var vue = { taille: 15.5, hauteur: 34, conduite: false, tout: false, auto: true, enHaut: false };
  var minuteurSauve = null;
  var minuteurEtat = null;
  var stockageOk = true;
  var repere = null;
  var etapeCourante = 0;
  var texteComplet = "";
  var mesure = null;
  var hauteurAppliquee = 34;

  /* --------------------------------------------------------------- stockage */
  function lire(cle, defaut) {
    try {
      var v = localStorage.getItem(cle);
      return v ? JSON.parse(v) : defaut;
    } catch (e) {
      stockageOk = false;
      return defaut;
    }
  }

  function ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (e) {
      stockageOk = false;
      return false;
    }
  }

  /* ------------------------------------------------------------------ texte */
  function origine(i) {
    var tpl = slides[i] && slides[i].querySelector("template.slide-script");
    /* textContent sur le contenu analysé : les entités sont déjà décodées. */
    return tpl ? tpl.content.textContent : "";
  }

  /* Les éditions sont rangées par TITRE de slide, pas par numéro : insérer
     une slide en cours de construction ne doit pas décaler les notes des
     suivantes sur leurs voisines. */
  function cleSlide(i) {
    var sl = slides[i];
    return (sl && sl.getAttribute("data-title")) || "slide-" + i;
  }

  function courant(i) {
    /* Une édition vide n'est pas une édition : c'est une remise à zéro.
       Vider le panneau rétablit donc le script du fichier, plutôt que de
       masquer définitivement la slide derrière une chaîne vide. */
    var c = cleSlide(i);
    var e = Object.prototype.hasOwnProperty.call(edits, c) ? edits[c] : null;
    if (e !== null && String(e).trim() !== "") return String(e);
    return origine(i);
  }

  /* ------------------------------------------------- le fichier a le dernier mot
     Le script vit dans script.md et l'injecteur le dépose dans les slides. Une
     édition faite ici n'est qu'un brouillon : dès que le fichier change sous
     elle, elle est périmée et doit céder. Sans cette règle, une édition
     oubliée continue d'écraser le script pendant des heures, et le panneau
     affiche un texte que le fichier ne contient plus.

     On mémorise donc, à côté de chaque édition, le texte du fichier sur lequel
     elle a été faite. Au chargement, celles qui ne reposent plus sur le texte
     actuel sont abandonnées. */
  /* Rien ne se perd : une édition périmée est mise de côté avant d'être
     retirée. Elle reste consultable et récupérable, parce qu'un texte écrit à
     la main ne doit jamais disparaître sans laisser d'adresse. */
  function archiver(cle, texte) {
    var arch = lire(CLE_ARCHIVE, []) || [];
    arch.unshift({ cle: cle, texte: texte, quand: new Date().toISOString() });
    ecrire(CLE_ARCHIVE, arch.slice(0, 60));
  }

  function purger() {
    var perimees = [];
    slides.forEach(function (sl, i) {
      var c = cleSlide(i);
      if (!Object.prototype.hasOwnProperty.call(edits, c)) return;
      var base = bases[c];
      if (base === undefined || base !== origine(i)) {
        archiver(c, edits[c]);
        delete edits[c];
        delete bases[c];
        perimees.push(c);
      }
    });
    if (perimees.length) {
      ecrire(CLE, edits);
      ecrire(CLE_BASES, bases);
      console.info(
        "[script] " + perimees.length + " édition(s) mise(s) de côté, le fichier " +
        "avait changé dessous : " + perimees.join(", ") +
        "\n         Pour les relire : Script.archives()   ·   Script.archive(0)"
      );
    }
    return perimees.length;
  }

  /* Petite console de récupération, exposée volontairement. */
  global.Script = {
    archives: function () {
      var a = lire(CLE_ARCHIVE, []) || [];
      if (!a.length) return "aucune édition archivée";
      return a.map(function (e, i) {
        return i + " · " + e.cle + " · " + e.quand.slice(0, 16).replace("T", " ") +
          " · " + e.texte.trim().split("\n")[0].slice(0, 60);
      }).join("\n");
    },
    archive: function (i) {
      var a = lire(CLE_ARCHIVE, []) || [];
      return a[i] ? a[i].texte : "rien à cet indice";
    },
    vider: function () { ecrire(CLE_ARCHIVE, []); return "archives vidées"; }
  };

  function marquer(txt, duree) {
    if (minuteurEtat) clearTimeout(minuteurEtat);
    etat.textContent = txt;
    etat.classList.toggle("is-on", !!txt);
    if (duree) {
      minuteurEtat = setTimeout(function () {
        etat.textContent = "";
        etat.classList.remove("is-on");
      }, duree);
    }
  }

  function enregistrer() {
    var v;
    if (vue.tout) {
      v = zone.value;
    } else {
      /* On ne montre qu'un passage : on le remet à sa place avant d'écrire. */
      var b = bornesCourantes();
      var tete = b.k ? "`[→]` " : "";
      v =
        texteComplet.slice(0, b.d).replace(/\s+$/, "") +
        (b.d ? "\n\n" : "") +
        tete +
        zone.value.replace(/^\s+|\s+$/g, "") +
        "\n\n" +
        texteComplet.slice(b.f).replace(/^\s+/, "");
      v = v.replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
    }
    texteComplet = v;
    var c = cleSlide(idx);
    if (v === origine(idx)) {
      delete edits[c];
      delete bases[c];
    } else {
      edits[c] = v;
      bases[c] = origine(idx);
    }
    ecrire(CLE_BASES, bases);
    if (ecrire(CLE, edits)) marquer("enregistré", 1400);
    else marquer("stockage indisponible — pensez à « Copier tout »");
    majTitre();
  }

  /* Le compteur du deck compte tout : couverture, slides-signal, interstitiels.
     Le script, lui, ne numérote que les slides du socle. L'écart déroute quand
     on cherche une section dans script.md, donc on affiche les deux. */
  function refScript(i) {
    var socle = 0, annexe = 0;
    for (var k = 0; k <= i; k++) {
      var sl = slides[k];
      if (sl.hasAttribute("data-noscript")) continue;
      if (sl.hasAttribute("data-inter")) continue;
      if (sl.hasAttribute("data-annex")) annexe++;
      else socle++;
    }
    var sl = slides[i];
    if (sl.hasAttribute("data-noscript")) return null;
    if (sl.hasAttribute("data-inter"))
      return "TRANSITION " + sl.getAttribute("data-inter");
    if (!sl.hasAttribute("data-annex") && sl.hasAttribute("data-script-number"))
      return "SLIDE " + sl.getAttribute("data-script-number");
    return (sl.hasAttribute("data-annex") ? "ANNEXE A" + annexe : "SLIDE " + socle);
  }

  function majTitre() {
    var sl = slides[idx];
    var annexe = sl.hasAttribute("data-annex");
    var modifie = Object.prototype.hasOwnProperty.call(edits, cleSlide(idx));
    var ref = refScript(idx);
    ou.innerHTML =
      '<b>' + (annexe ? "Annexe" : "Slide") + " " + (idx + 1) + "</b> · " +
      (sl.getAttribute("data-title") || "") +
      (ref ? ' <span class="nt-ref">### ' + ref + "</span>" : "") +
      (modifie ? ' <span class="nt-modif">modifié</span>' : "");
  }

  /* ---------------------------------------------------------- passages
     Chaque `[→]` du script correspond à un clic. Le panneau n'affiche donc
     que le passage du composant qui vient d'apparaître : c'est ce qu'on est
     en train de dire, et rien d'autre. Le panneau se réduit d'autant, et la
     slide récupère la place. « Tout » rend le script entier. */
  function bornes(txt) {
    var b = [];
    /* Les accents graves sont facultatifs : `[→]` et [→] valent pareil. */
    var re = /^`?\[→\]`?/gm;
    var m;
    while ((m = re.exec(txt))) b.push(m.index);
    var out = [];
    var deb = 0;
    for (var i = 0; i < b.length; i++) {
      out.push([deb, b[i]]);
      deb = b[i];
    }
    out.push([deb, txt.length]);
    return out;
  }

  function bornesCourantes() {
    var p = bornes(texteComplet);
    var k = Math.max(0, Math.min(etapeCourante, p.length - 1));
    return { p: p, k: k, d: p[k][0], f: p[k][1] };
  }

  /* Le panneau ne prend que la place du passage affiché, sans jamais dépasser
     la hauteur que vous avez réglée. C'est là tout l'intérêt de n'en montrer
     qu'un : la slide récupère le reste. */
  function ajusterHauteur() {
    var vh = vue.hauteur;
    panneau.classList.toggle("hauteur-auto", !!vue.auto && !vue.tout);
    if (vue.auto && !vue.tout && mesure && zone.clientWidth) {
      mesure.style.width = zone.clientWidth + "px";
      mesure.style.fontSize = vue.taille + "px";
      mesure.textContent = zone.value + "\n";
      var chrome = panneau.querySelector(".nt-bar").offsetHeight;
      if (vue.conduite) chrome += panneau.querySelector(".nt-conduite").offsetHeight;
      vh = ((mesure.offsetHeight + chrome) / window.innerHeight) * 100;
      vh = Math.min(vue.hauteur, Math.max(H_MIN, Math.round(vh)));
    }
    hauteurAppliquee = vh;
    panneau.style.setProperty("--nt-h", vh + "vh");
    if (global.Deck && global.Deck.refit) global.Deck.refit();
  }

  function montrerPassage() {
    if (!zone) return;
    panneau.classList.toggle("tout-le-script", !!vue.tout);
    if (vue.tout) {
      if (document.activeElement !== zone) zone.value = texteComplet;
      repere.textContent = "";
      ajusterHauteur();
      return;
    }
    var b = bornesCourantes();
    /* Le marqueur `[→]` n'est pas montré : il ne se dit pas, et le laisser
       modifiable exposerait à le supprimer par inadvertance — ce qui casserait
       la correspondance entre les clics et les passages. */
    var v = texteComplet
      .slice(b.d, b.f)
      .replace(/^`?\[→\]`?[ ]*/, "")
      .replace(/^\n+|\n+$/g, "");
    if (document.activeElement !== zone || zone.value !== v) zone.value = v;
    repere.textContent = b.k + " / " + (b.p.length - 1);
    zone.scrollTop = 0;
    ajusterHauteur();
  }

  /* ------------------------------------------------------------------- vues */
  function borner(v) {
    return Math.max(H_MIN, Math.min(H_MAX, Math.round(v)));
  }

  /* Régler la hauteur à la main sort de l'ajustement automatique : sinon le
     réglage n'aurait aucun effet visible tant que le passage est court. */
  function regler(v) {
    vue.auto = false;
    vue.hauteur = borner(v);
    appliquerVue();
  }

  /* La poignée du bord haut : on tire pour régler, comme un tiroir. Les deux
     boutons couvrent le même besoin sans avoir à viser. */
  function poignee() {
    var grip = panneau.querySelector(".nt-grip");
    if (!grip) return;
    var depart = 0;
    var hDepart = 0;

    /* Appliqué directement : régler la hauteur revient à écrire une variable
       CSS et une transformation, ce qui tient largement dans une image. */
    function bouge(e) {
      /* En haut, tirer vers le bas agrandit : le bord que l'on déplace est
         l'autre. */
      var sens = vue.enHaut ? -1 : 1;
      regler(hDepart + (((depart - e.clientY) * sens) / window.innerHeight) * 100);
    }

    function fini(e) {
      grip.releasePointerCapture(e.pointerId);
      panneau.classList.remove("is-dragging");
      document.removeEventListener("pointermove", bouge);
      document.removeEventListener("pointerup", fini);
    }

    grip.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      depart = e.clientY;
      hDepart = vue.hauteur;
      panneau.classList.add("is-dragging");
      grip.setPointerCapture(e.pointerId);
      document.addEventListener("pointermove", bouge);
      document.addEventListener("pointerup", fini);
    });

    /* Double-clic : on rend la main à l'ajustement automatique. */
    grip.addEventListener("dblclick", function () {
      vue.auto = true;
      appliquerVue();
    });
  }

  function appliquerVue() {
    zone.style.fontSize = vue.taille + "px";
    panneau.classList.toggle("with-conduite", vue.conduite);
    panneau.classList.toggle("en-haut", !!vue.enHaut);
    var b = panneau.querySelector('[data-nt="position"]');
    if (b) b.textContent = vue.enHaut ? "En bas" : "En haut";
    ecrire(CLE_VUE, vue);
    ajusterHauteur();
  }

  /* -------------------------------------------------------------- affichage */
  function montrer(i, slide, etape) {
    if (document.activeElement === zone) enregistrer();
    idx = i;
    if (etape !== undefined) etapeCourante = etape;
    slides[i] = slide || slides[i];
    texteComplet = courant(i);
    montrerPassage();
    try {
      zone.setSelectionRange(0, 0);
    } catch (e) {}
    majTitre();

    var tpl = slide.querySelector("template.slide-notes");
    conduite.innerHTML = tpl
      ? '<span class="nt-cd-label">Conduite</span>' + tpl.innerHTML
      : '<span class="nt-cd-label">Conduite</span><i>Pas de note pour cette slide.</i>';
    marquer("", 0);
  }

  /* --------------------------------------------------------------- import */
  function decouper(md) {
    var out = {};
    var parts = md.split(/^### (SLIDE|ANNEXE) (\w+)[^\n]*\n/m);
    for (var i = 1; i < parts.length; i += 3) {
      var genre = parts[i].toLowerCase();
      var num = parseInt(String(parts[i + 1]).replace(/[^0-9]/g, ""), 10);
      var corps = parts[i + 2].split(/\n#{1,2} /)[0].replace(/\n---\n/g, "\n").replace(/[-\s]+$/, "").trim();
      if (!isFinite(num)) continue;
      out[(genre === "slide" ? "s" : "a") + num] = corps;
    }
    return out;
  }

  function repartir(md) {
    var b = decouper(md);
    var socle = 0;
    var annexe = 0;
    var n = 0;
    slides.forEach(function (sl, i) {
      var cle;
      /* Les slides-signal ne portent aucune parole : elles ne consomment pas
         de numéro, exactement comme dans outils/injecter-script.py. */
      if (sl.hasAttribute("data-noscript")) return;
      if (sl.hasAttribute("data-annex")) cle = "a" + ++annexe;
      else cle = "s" + ++socle;
      if (b[cle] === undefined) return;
      edits[cleSlide(i)] = b[cle];
      n++;
    });
    ecrire(CLE, edits);
    return n;
  }

  /* --------------------------------------------------------------- export */
  function toutLeTexte() {
    var socle = 0;
    var annexe = 0;
    var out = [];
    slides.forEach(function (sl, i) {
      var titre = sl.getAttribute("data-title") || "";
      var tete = sl.hasAttribute("data-annex")
        ? "### ANNEXE A" + ++annexe + " — " + titre
        : "### SLIDE " + ++socle + " — " + titre;
      out.push(tete + "\n\n" + courant(i) + "\n");
    });
    return out.join("\n---\n\n");
  }

  function copier(txt) {
    var t = document.createElement("textarea");
    t.value = txt;
    t.style.cssText = "position:fixed;top:-2000px;left:0;opacity:0";
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(t);
    return ok;
  }

  /* ----------------------------------------------------------------- outils */
  function outil(nom) {
    if (nom === "conduite") {
      vue.conduite = !vue.conduite;
      appliquerVue();
    } else if (nom === "moins") {
      vue.taille = Math.max(12, vue.taille - 1);
      appliquerVue();
    } else if (nom === "plus") {
      vue.taille = Math.min(24, vue.taille + 1);
      appliquerVue();
    } else if (nom === "monter" || nom === "baisser") {
      regler(hauteurAppliquee + (nom === "monter" ? PAS : -PAS));
    } else if (nom === "position") {
      vue.enHaut = !vue.enHaut;
      appliquerVue();
    } else if (nom === "tout") {
      vue.tout = !vue.tout;
      montrerPassage();
      ecrire(CLE_VUE, vue);
      return;
    } else if (nom === "retablir") {
      delete edits[cleSlide(idx)];
      ecrire(CLE, edits);
      texteComplet = origine(idx);
      montrerPassage();
      majTitre();
      marquer("script d'origine rétabli", 1800);
    } else if (nom === "copier") {
      enregistrer();
      marquer(
        copier(toutLeTexte())
          ? "script complet copié — collez-le dans script.md"
          : "copie refusée par le navigateur",
        3200
      );
    } else if (nom === "importer") {
      importZone.value = "";
      importEtat.textContent = "";
      importOverlay.classList.add("is-open");
      importZone.focus();
    }
  }

  /* ------------------------------------------------------------ catalogue
     La fenêtre déportée n'a pas accès au DOM du deck : elle ne peut pas lire
     les <template>. Le deck lui publie donc, une fois, le titre, le script
     d'origine et les notes de conduite de chaque slide. */
  function publierCatalogue() {
    ecrire(
      "portfolio-catalogue-1",
      slides.map(function (sl, i) {
        var cd = sl.querySelector("template.slide-notes");
        return {
          titre: sl.getAttribute("data-title") || "",
          annexe: sl.hasAttribute("data-annex"),
          script: origine(i),
          conduite: cd ? cd.innerHTML : "",
        };
      })
    );
  }

  /* ------------------------------------------------------------------- init */
  function init() {
    panneau = document.getElementById("notes");
    if (!panneau) return;
    zone = document.getElementById("nt-texte");
    ou = panneau.querySelector(".nt-where");
    etat = panneau.querySelector(".nt-etat");
    conduite = panneau.querySelector(".nt-conduite");
    repere = panneau.querySelector(".nt-passage");
    mesure = document.createElement("div");
    mesure.className = "nt-mesure";
    document.body.appendChild(mesure);
    importOverlay = document.getElementById("nt-import");
    importZone = document.getElementById("nti-texte");
    importEtat = importOverlay.querySelector(".nti-etat");
    slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));

    edits = lire(CLE, {}) || {};
    bases = lire(CLE_BASES, {}) || {};
    purger();
    vue = lire(CLE_VUE, vue) || vue;
    if (!isFinite(vue.hauteur)) vue.hauteur = 34;
    if (vue.auto === undefined) vue.auto = true;
    vue.hauteur = borner(vue.hauteur);
    appliquerVue();
    poignee();

    zone.addEventListener("input", function () {
      if (minuteurSauve) clearTimeout(minuteurSauve);
      marquer("…", 0);
      ajusterHauteur();
      minuteurSauve = setTimeout(enregistrer, 500);
    });

    /* Échap rend le clavier à la présentation sans fermer le panneau. */
    zone.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        zone.blur();
      }
    });

    panneau.addEventListener("click", function (e) {
      var b = e.target.closest("[data-nt]");
      if (b) outil(b.getAttribute("data-nt"));
    });

    importOverlay.addEventListener("click", function (e) {
      if (e.target === importOverlay || e.target.closest('[data-nti="annuler"]')) {
        importOverlay.classList.remove("is-open");
        return;
      }
      if (!e.target.closest('[data-nti="ok"]')) return;
      var n = repartir(importZone.value);
      if (!n) {
        importEtat.textContent =
          "Aucune section reconnue. Les titres doivent commencer par « ### SLIDE » ou « ### ANNEXE ».";
        return;
      }
      importOverlay.classList.remove("is-open");
      zone.value = courant(idx);
      majTitre();
      marquer(n + " sections réparties", 2600);
    });

    publierCatalogue();

    /* L'autre fenêtre peut éditer le même script. On ne remplace le champ que
       si l'on n'est pas en train d'y écrire : celle qui a le curseur gagne.
       Relevé périodique en plus de l'événement, comme côté vue déportée :
       une synchronisation qui dépend d'un seul mécanisme n'en est pas une. */
    var dernierBrut = null;
    function reprendre() {
      /* On compare la chaîne brute du stockage : ré-encoder tout le script à
         chaque relevé serait du gaspillage pur. */
      var brut;
      try {
        brut = localStorage.getItem(CLE);
      } catch (e) {
        return;
      }
      if (brut === dernierBrut) return;
      dernierBrut = brut;
      edits = lire(CLE, {}) || {};
      majTitre();
      if (document.activeElement === zone) return;
      texteComplet = courant(idx);
      montrerPassage();
    }

    try {
      dernierBrut = localStorage.getItem(CLE);
    } catch (e) {}

    window.addEventListener("storage", function (e) {
      if (e.key === CLE) reprendre();
    });
    setInterval(reprendre, 300);

    if (!stockageOk) marquer("stockage indisponible — utilisez « Copier tout »");

    montrer(0, slides[0]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.Notes = {
    /* Republiable à tout moment : si le catalogue disparaît du stockage, la
       vue déportée doit pouvoir être réamorcée sans recharger le deck. */
    publierCatalogue: function () {
      if (slides.length) publierCatalogue();
    },
    montrer: function (i, slide, etape) {
      if (zone) montrer(i, slide, etape);
    },
    /* Appelé à chaque clic, y compris sans changement de slide. */
    etape: function (n) {
      if (n === etapeCourante) return;
      etapeCourante = n;
      if (zone) montrerPassage();
    },
    /* Hauteur visée plutôt que mesurée : pendant la transition d'ouverture le
       rectangle est intermédiaire, et la slide se remettrait à l'échelle à
       chaque image. */
    hauteurOuverte: function () {
      if (!panneau || !panneau.classList.contains("is-open")) return 0;
      return (hauteurAppliquee / 100) * window.innerHeight;
    },
    /* Hauteur à réserver au-dessus des slides : nulle si le panneau est en bas. */
    decalageHaut: function () {
      if (!panneau || !panneau.classList.contains("is-open") || !vue.enHaut) return 0;
      return (hauteurAppliquee / 100) * window.innerHeight;
    },
  };
})(window);
