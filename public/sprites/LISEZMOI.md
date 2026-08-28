# Pack de sprites (optionnel)

Ce dossier est **vide volontairement** : aucune image Pokémon n'est livrée avec le jeu.
Les créatures sont rendues à partir des modèles 3D procéduraux tant qu'aucun sprite
n'est déposé ici.

## Importer un pack en une commande

```sh
npm run sprites -- --from "<gabarit d'URL>" [--back "<gabarit d'URL>"]
```

Le gabarit est **à vous** : le dépôt ne connaît aucune adresse de téléchargement.
Jetons utilisables : `{dex}` (numéro national), `{dex3}` (sur 3 chiffres), `{id}`
(nom anglais en minuscules), `{name}` (nom français).

```sh
# exemple avec une source fictive
npm run sprites -- --from "https://mon-pack.exemple/front/{dex}.png" \
                   --back "https://mon-pack.exemple/back/{dex}.png"

npm run sprites -- --help          # toutes les options
npm run sprites -- --dry-run --from "…"   # afficher les URL sans rien télécharger
npm run sprites -- --only 1-151 --from "…" # se limiter à la 1re génération
npm run sprites -- --index-only    # régénérer index.json depuis les fichiers présents
```

Le script vérifie que chaque réponse est bien un PNG, saute les 404 (espèce absente
du pack), reprend deux fois sur erreur réseau, n'écrase rien sans `--force`, écrit
`index.json` et affiche la couverture obtenue.

## Ou à la main

Déposez des PNG à fond transparent nommés par **numéro national** :

```
public/sprites/25.png          → vue de face   (adversaire)
public/sprites/back/25.png     → vue de dos    (votre créature, facultatif)
public/sprites/index.json      → { "dex": [1, 2, 3, …] }  (facultatif mais conseillé)
```

- Si `back/<n>.png` est absent, la vue de face est réutilisée.
- Les tailles autour de 96×96 à 256×256 conviennent ; le rendu est en plus proche
  voisin, donc les sprites pixel art restent nets.
- Les images sont **rognées automatiquement** sur leurs pixels opaques, puis mises à
  l'échelle de la créature : une marge vide dans le PNG ne fait plus flotter le sprite.
- `index.json` évite des requêtes inutiles ; sans lui, trois échecs d'affilée
  suffisent à conclure qu'aucun pack n'est installé.
- Le chargement est paresseux : seule une espèce réellement rencontrée est demandée,
  une seule fois par session.
- Les numéros correspondent au Pokédex national (voir `src/data/pokedex.gen.ts`).
  Les 9 espèces exclusives de Valmore (1101 à 1109) ne lisent jamais ce dossier.

## Droits

Les sprites des jeux Pokémon appartiennent à Nintendo / Game Freak / Creatures.
Ce dépôt n'en distribue aucun, n'en télécharge aucun de lui-même et ne contient
aucune adresse de source. Ce que vous importez ici n'engage que vous, et le dossier
est ignoré par git (`.gitignore`).
