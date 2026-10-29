#!/usr/bin/env python3
"""Recopie le script parlé (script.md) dans la présentation (src/index.html).

Chaque section « ### SLIDE n », « ### TRANSITION n » ou « ### ANNEXE An » de script.md est
déposée dans la slide correspondante sous forme de <template class="slide-script">.
Le panneau de notes (touche N) s'en sert comme texte de départ, que l'on peut
ensuite modifier dans l'application.

À relancer après chaque modification du fichier .md :
    python3 outils/injecter-script.py
"""
import re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
HTML = RACINE / "src" / "index.html"
MD = RACINE / "script.md"


def blocs(md):
    """Rend {('slide', 1): texte, ('annexe', 1): texte, …}."""
    out = {}
    parts = re.split(r"^(?:### )?(SLIDE|TRANSITION|ANNEXE) (\w+)[^\n]*\n", md, flags=re.M)
    for i in range(1, len(parts), 3):
        genre, num = parts[i].lower(), parts[i + 1]
        corps = parts[i + 2]
        # on s'arrête au titre de niveau 1 ou 2 suivant (séparateur de partie)
        corps = re.split(r"\n#{1,2} ", corps)[0]
        corps = corps.rstrip("-\n ")
        corps = corps.replace("\n---\n", "\n").strip()
        if genre == "annexe":
            cle = ("annexe", int(num.lstrip("Aa")))
        else:
            cle = (genre, int(num))
        out[cle] = corps
    return out


def echapper(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main():
    html = HTML.read_text(encoding="utf-8")
    b = blocs(MD.read_text(encoding="utf-8"))

    # on retire les templates déjà posés pour pouvoir relancer l'outil
    html = re.sub(r"\s*<template class=\"slide-script\">.*?</template>", "", html, flags=re.S)

    morceaux = re.split(r"(?=<section class=\"slide)", html)
    n_socle = n_annexe = n_inter = 0
    posés = 0
    for k in range(1, len(morceaux)):
        m = morceaux[k]
        entete = m[: m.index(">")]
        if "data-noscript" in entete:
            continue                      # slide-signal : elle ne porte aucune parole
        if "data-inter" in entete:
            # un interstitiel porte son numero de partie : il ne decale pas
            # la numerotation des slides du socle
            n_inter += 1
            cle = ("transition", int(re.search(r'data-inter="(\d+)"', entete).group(1)))
        elif "data-annex" in entete:
            n_annexe += 1
            cle = ("annexe", n_annexe)
        else:
            n_socle += 1
            # Un numéro explicite garde la référence quand une slide passe en annexe.
            numero = re.search(r'data-script-number="(\d+)"', entete)
            cle = ("slide", int(numero.group(1)) if numero else n_socle)
        txt = b.get(cle)
        if txt is None:
            print("  ! aucun bloc pour %s %d" % cle, file=sys.stderr)
            continue
        tpl = '\n        <template class="slide-script">%s</template>' % echapper(txt)
        i = m.rindex("</section>")
        morceaux[k] = m[:i] + tpl + "\n      " + m[i:]
        posés += 1

    HTML.write_text("".join(morceaux), encoding="utf-8")
    print(
        "%d slides alimentées (%d socle, %d interstitiels, %d annexes)"
        % (posés, n_socle, n_inter, n_annexe)
    )


if __name__ == "__main__":
    main()
