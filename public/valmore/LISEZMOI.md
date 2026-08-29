# Images des espèces de Valmore

Contrairement à `public/sprites/`, **ce dossier est versionné**. Les 9 espèces
exclusives (Brasillon, Cendrailes, Pyrodrakon, Ondulin, Brumaspectre, Abyssire,
Germinuit, Sylvombre, Nocteracine) appartiennent au jeu : leurs images font
partie du dépôt et suivent donc le site publié.

## Nommage

Les fichiers portent l'**identifiant** de l'espèce, pas un numéro :

```
public/valmore/brasillon.png        → vue de face   (adversaire, menus, Pokédex)
public/valmore/back/brasillon.png   → vue de dos    (votre créature, facultatif)
```

Identifiants des trois lignées :

| Feu          | Eau            | Plante        |
|--------------|----------------|---------------|
| brasillon    | ondulin        | germinuit     |
| cendrailes   | brumaspectre   | sylvombre     |
| pyrodrakon   | abyssire       | nocteracine   |

Si `back/<id>.png` manque, la vue de face est réutilisée. Toute espèce sans
image garde son modèle 3D procédural : le dossier peut rester partiel.

## Format

- **PNG à fond transparent.** L'image est rognée automatiquement sur ses pixels
  opaques, donc la marge autour du sujet n'a pas d'importance.
- **96 × 96 donne le rendu le plus fidèle** : c'est la définition de l'ère DS, et
  le jeu affiche alors un texel par pixel de son rendu interne. Les planches plus
  grandes marchent aussi, ramenées à cette échelle et filtrées pour ne pas
  scintiller.
- La taille à l'écran vient de la taille du sujet **en pixels** : une créature
  dessinée petite dans sa planche apparaîtra petite en jeu, et inversement. C'est
  le moyen de régler les proportions entre les trois lignées.
- Les pieds doivent toucher le bas du sujet : le sprite est posé sur la
  plateforme par son bord inférieur.

## index.json (facultatif)

```json
{ "ids": ["brasillon", "cendrailes", "pyrodrakon"] }
```

Évite des requêtes inutiles pour les espèces sans image. Sans ce fichier, trois
échecs d'affilée suffisent à conclure que le dossier est vide.
