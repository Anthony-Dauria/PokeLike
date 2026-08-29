# Planches sources

Les dessins d'origine et l'outil qui les découpe. Rien ici n'est utilisé à
l'exécution : le jeu ne lit que les PNG produits dans `public/valmore/` et
`public/monde/`. Ces fichiers sont conservés pour pouvoir refaire un découpage
sans redemander les planches.

## Refaire un export

```sh
node art/slice.mjs art/starters.png art/starters.spec.json   # les 9 créatures
node art/slice.mjs art/starters.png art/prof.spec.json       # le buste du professeur
node art/slice.mjs art/monde.png    art/monde.spec.json      # bâtiments, arbres, décor
```

Un fichier de découpe liste des rectangles `{ name, x, y, w, h }` pris dans la
planche. Deux modes de cadrage :

- **cadre commun** (`frameW`/`frameH`, `scale`) pour les créatures. La taille à
  l'écran vient du rapport « hauteur du sujet / hauteur du cadre », donc garder
  une seule échelle pour toute la planche préserve les proportions voulues entre
  les stades d'évolution.
- **`tight`** pour les décors, dont la taille est fixée en unités du monde par le
  code : le cadre colle alors au sujet.

## Traitements appliqués

- Fond blanc retiré par **remplissage depuis les bords**, jamais par test de
  couleur : les zones blanches internes (blouse, phare) doivent survivre.
- **Érosion du liseré** clair et peu saturé que la planche dessine autour de
  chaque sujet ; sans elle, chaque sprite porte un halo blanc en jeu.
- **Débordement de couleur** sous la transparence, pour que le filtrage n'aille
  pas chercher du blanc au bord des sprites.
