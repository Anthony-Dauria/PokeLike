# Pack de sprites (optionnel)

Ce dossier est **vide volontairement** : aucune image Pokémon n'est livrée avec le jeu.
Les créatures sont rendues à partir des modèles 3D procéduraux tant qu'aucun sprite
n'est déposé ici.

## Comment ajouter un pack

Déposez des PNG à fond transparent nommés par **numéro national** :

```
public/sprites/25.png          → vue de face   (adversaire)
public/sprites/back/25.png     → vue de dos    (votre créature, facultatif)
```

- Si `back/<n>.png` est absent, la vue de face est réutilisée.
- Les tailles autour de 96×96 à 256×256 conviennent ; le rendu est en plus proche
  voisin, donc les sprites pixel art restent nets.
- Le chargement est paresseux : seule une espèce réellement rencontrée est demandée,
  une seule fois par session.
- Les numéros correspondent au Pokédex national (voir `src/data/pokedex.gen.ts`).
  Les 9 espèces exclusives de Valmore (1101 à 1109) ne lisent jamais ce dossier.

## Droits

Les sprites des jeux Pokémon appartiennent à Nintendo / Game Freak / Creatures.
Ce dépôt n'en distribue aucun et n'en télécharge aucun. Ce que vous placez ici
n'engage que vous, et le dossier est ignoré par git (`.gitignore`).
