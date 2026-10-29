/* ==========================================================================
   presentateur.js — la vue déportée.

   Cette fenêtre ne connaît aucune slide. Elle lit ce que index.html publie
   dans le stockage local (catalogue des slides, puis état courant) et y écrit
   en retour les commandes de navigation et les modifications du script.

   Deux voies de réception, volontairement : l'événement « storage », qui
   traverse bien les documents file:// (mesuré), et un relevé toutes les
   250 ms. Le relevé seul suffirait ; il est là parce qu'une soutenance n'est
   pas le moment de découvrir qu'un événement ne s'est pas déclenché.
   ========================================================================== */
(function () {
  "use strict";

  var CLE_CAT = "portfolio-catalogue-1";
  var CLE_ETAT = "portfolio-etat-1";
  var CLE_CMD = "portfolio-cmd-1";
  /* Mêmes clés que notes.js : les deux fenêtres éditent le MÊME brouillon.
     Deux stockages distincts donnaient deux textes distincts. */
  var CLE_EDITS = "portfolio-script-1";
  var CLE_BASES = "portfolio-script-bases-1";
  var CLE_VUE = "portfolio-pres-vue-1";
  var PERIME = 6000; /* au-delà, on considère le deck fermé */

  var el = {};
  var cat = [];
  var etat = null;
  var edits = {};
  var bases = {};
  var idx = -1;
  var complet = "";
  var vue = { taille: 19, conduite: false, tout: false };
  var minuteurSauve = null;
  var minuteurEtat = null;
  var signature = "";
  var dernierCat = null;
  var dernierEdits = null;

  function lire(cle, defaut) {
    try {
      var v = localStorage.getItem(cle);
      return v ? JSON.parse(v) : defaut;
    } catch (e) {
      return defaut;
    }
  }

  function ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ texte */
  function origine(i) {
    return cat[i] ? cat[i].script || "" : "";
  }

  /* Rangées par TITRE, comme dans notes.js : un index numérique ferait glisser
     les éditions d'une slide sur sa voisine dès qu'on en insère une. */
  function cleSlide(i) {
    return (cat[i] && cat[i].titre) || "slide-" + i;
  }

  function courant(i) {
    /* Une édition vide n'est pas une édition : c'est une remise à zéro. */
    var c = cleSlide(i);
    var e = Object.prototype.hasOwnProperty.call(edits, c) ? edits[c] : null;
    if (e !== null && String(e).trim() !== "") return String(e);
    return origine(i);
  }

  function marquer(txt, duree) {
    if (minuteurEtat) clearTimeout(minuteurEtat);
    el.etat.textContent = txt;
    el.etat.classList.toggle("is-on", !!txt);
    if (duree) {
      minuteurEtat = setTimeout(function () {
        el.etat.textContent = "";
        el.etat.classList.remove("is-on");
      }, duree);
    }
  }

  function enregistrer() {
    if (idx < 0) return;
    var v;
    if (vue.tout) {
      v = el.script.value;
    } else {
      var b = bornesCourantes();
      v =
        complet.slice(0, b.d).replace(/\s+$/, "") +
        (b.d ? "\n\n" : "") +
        (b.k ? "`[→]` " : "") +
        el.script.value.replace(/^\s+|\s+$/g, "") +
        "\n\n" +
        complet.slice(b.f).replace(/^\s+/, "");
      v = v.replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
    }
    complet = v;
    /* La base sert au tri des éditions périmées côté deck : sans elle, une
       édition faite ici serait archivée au prochain chargement d'index.html. */
    var c = cleSlide(idx);
    if (v === origine(idx)) {
      delete edits[c];
      delete bases[c];
    } else {
      edits[c] = v;
      bases[c] = origine(idx);
    }
    ecrire(CLE_BASES, bases);
    marquer(ecrire(CLE_EDITS, edits) ? "enregistré" : "stockage indisponible", 1400);
  }

  /* ---------------------------------------------------------------- commande */
  function commander(action, extra) {
    var c = { action: action, ts: Date.now() };
    if (extra) {
      for (var k in extra) c[k] = extra[k];
    }
    ecrire(CLE_CMD, c);
  }

  /* ---------------------------------------------------------- passages
     Un passage à la fois : celui du composant qui vient d'apparaître. Le
     marqueur `[→]` n'est pas montré — il ne se dit pas, et le laisser
     modifiable exposerait à le supprimer. « Tout » rend le script entier. */
  function bornes(txt) {
    var b = [];
    /* Les accents graves sont facultatifs : `[→]` et [→] valent pareil.
       Exiger les accents ici faisait manquer 39 marqueurs sur 71. */
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
    var p = bornes(complet);
    var k = Math.max(0, Math.min(etat ? etat.etape : 0, p.length - 1));
    return { p: p, k: k, d: p[k][0], f: p[k][1] };
  }

  function montrerPassage() {
    if (!el.script) return;
    document.body.classList.toggle("tout-le-script", !!vue.tout);
    if (vue.tout) {
      if (document.activeElement !== el.script) el.script.value = complet;
      el.passage.textContent = "";
      return;
    }
    var b = bornesCourantes();
    var v = complet
      .slice(b.d, b.f)
      .replace(/^`?\[→\]`?[ ]*/, "")
      .replace(/^\n+|\n+$/g, "");
    if (document.activeElement !== el.script || el.script.value !== v) el.script.value = v;
    el.passage.textContent = b.k + " / " + (b.p.length - 1);
    el.script.scrollTop = 0;
  }

  /* ---------------------------------------------------------------- rendu */
  function mmss(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  
  function rangDansGroupe(i) {
    if (!cat[i]) return [0, 0];
    var annexe = cat[i].annexe;
    var n = 0;
    var rang = 0;
    for (var k = 0; k < cat.length; k++) {
      if (!!cat[k].annexe !== !!annexe) continue;
      n++;
      if (k === i) rang = n;
    }
    return [rang, n];
  }

  
  /* Le minuteur et la fraîcheur du lien avancent seuls : on les rafraîchit à
     chaque relevé, sans toucher au reste. */
  function peindreVeille() {
    var vivant = etat && Date.now() - etat.ts < PERIME;
    el.lien.classList.toggle("is-on", !!vivant);
    el.lien.querySelector(".pr-lien-t").textContent = vivant
      ? "lien actif"
      : etat
      ? "deck fermé"
      : "en attente du deck…";
    document.body.classList.toggle("sans-deck", !cat.length || !etat);
    if (!etat) return;
    var t = etat.minuteur || {};
    el.minuteur.textContent = mmss(t.sec || 0);
    el.minuteur.classList.toggle("is-on", !!t.on);
    el.minuteur.classList.toggle("is-paused", !!t.on && !t.running);
    el.minuteur.classList.toggle("is-over", (t.sec || 0) > (t.cible || 900));
  }

  function peindre() {
    peindreVeille();
    if (!cat.length || !etat) return;

    var i = etat.i;
    var g = rangDansGroupe(i);
    el.pos.innerHTML =
      (cat[i] && cat[i].annexe ? "Annexe " : "Slide ") +
      "<b>" + g[0] + "</b> / " + g[1];
    el.clics.textContent = etat.etapes
      ? etat.etape + " / " + etat.etapes + " clics"
      : "aucun clic";

    /* Le champ n'est remplacé que si l'on n'est pas en train d'y écrire :
       les deux fenêtres peuvent éditer, celle qui a le curseur gagne. */
    complet = courant(i);
    if (i !== idx) {
      idx = i;
      marquer("", 0);
    }
    montrerPassage();

    el.conduite.innerHTML = cat[i] && cat[i].conduite ? cat[i].conduite : "<i>Pas de note.</i>";

  }

  function appliquerVue() {
    el.script.style.fontSize = vue.taille + "px";
    document.body.classList.toggle("avec-conduite", vue.conduite);
    ecrire(CLE_VUE, vue);
  }

  /* ------------------------------------------------------------- réception */
  function relever() {
    var brutEdits = null;
    var brutCat = null;
    try {
      brutEdits = localStorage.getItem(CLE_EDITS);
      brutCat = localStorage.getItem(CLE_CAT);
    } catch (e) {}
    if (brutCat !== dernierCat) {
      dernierCat = brutCat;
      var c = lire(CLE_CAT, null);
      if (c && c.length) cat = c;
    }
    if (brutEdits !== dernierEdits) {
      dernierEdits = brutEdits;
      edits = lire(CLE_EDITS, {}) || {};
      bases = lire(CLE_BASES, {}) || {};
    }
    etat = lire(CLE_ETAT, null);
    /* On ne repeint que si quelque chose a bougé : le champ de saisie ne doit
       pas être bousculé quatre fois par seconde. */
    var sig =
      (etat ? etat.i + "|" + etat.etape : "-") +
      "|" + cat.length + "|" + (brutEdits ? brutEdits.length : 0) +
      "|" + (etat ? (edits[cleSlide(etat.i)] || "").length : 0);
    if (sig === signature) {
      peindreVeille();
      return;
    }
    signature = sig;
    peindre();
  }

  /* ------------------------------------------------------------------- init */
  function init() {
    el.lien = document.querySelector("[data-lien]");
    el.pos = document.querySelector("[data-pos]");
    el.clics = document.querySelector("[data-clics]");
    el.script = document.querySelector("[data-script]");
    el.passage = document.querySelector("[data-passage]");
    el.conduite = document.querySelector("[data-conduite]");
    el.etat = document.querySelector("[data-etat]");
    el.minuteur = document.querySelector("[data-minuteur]");

    vue = lire(CLE_VUE, vue) || vue;
    if (!isFinite(vue.taille)) vue.taille = 19;
    appliquerVue();

    el.script.addEventListener("input", function () {
      if (minuteurSauve) clearTimeout(minuteurSauve);
      marquer("…", 0);
      minuteurSauve = setTimeout(enregistrer, 500);
    });

    el.script.addEventListener("keydown", function (e) {
      if (e.key === "Escape") el.script.blur();
    });

    document.addEventListener("click", function (e) {
      var c = e.target.closest && e.target.closest("[data-cmd]");
      if (c) {
        commander(c.getAttribute("data-cmd"));
        return;
      }
      var o = e.target.closest && e.target.closest("[data-out]");
      if (!o) return;
      var nom = o.getAttribute("data-out");
      if (nom === "tout") {
        vue.tout = !vue.tout;
        montrerPassage();
      } else if (nom === "conduite") vue.conduite = !vue.conduite;
      else if (nom === "moins") vue.taille = Math.max(13, vue.taille - 1);
      else if (nom === "plus") vue.taille = Math.min(30, vue.taille + 1);
      else if (nom === "retablir") {
        if (idx < 0) return;
        var cle = cleSlide(idx);
        delete edits[cle];
        delete bases[cle];
        ecrire(CLE_BASES, bases);
        ecrire(CLE_EDITS, edits);
        complet = origine(idx);
        montrerPassage();
        marquer("script d'origine rétabli", 1800);
        return;
      }
      appliquerVue();
    });

    /* Les flèches pilotent le deck depuis cette fenêtre — sauf quand on écrit. */
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* La cible d'un keydown n'est pas toujours un élément — sur un document
         sans focus, closest n'existe pas et le gestionnaire échouerait. */
      var c = e.target;
      if (c && c.closest && c.closest("textarea, input, [contenteditable='true']")) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        commander("next");
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        commander("prev");
      } else if (e.key.toLowerCase() === "t") {
        commander(e.shiftKey ? "minuteur-zero" : "minuteur");
      }
    });

    window.addEventListener("storage", relever);
    setInterval(relever, 250);
    relever();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
