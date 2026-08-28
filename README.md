# PokeLike — Aventure Valmore & Orsyn

RPG de capture de créatures, **en 3D**, jouable au doigt et **installable sur mobile en un tap** (PWA — aucun store, aucun compte, fonctionne hors-ligne).

> **217 espèces** — 208 vrais Pokémon des générations 1 à 9 + 3 lignes exclusives · 16 arènes · une Ligue · un post-game complet façon Or/Argent · 103 capacités · les 18 types.

---

## Installer sur son téléphone

Le jeu est une **Progressive Web App** : on ouvre l'URL une fois, on l'ajoute à l'écran d'accueil, et il se lance ensuite en plein écran comme une vraie appli, même sans réseau.

| Plateforme | Marche à suivre |
|---|---|
| **Android / Chrome** | Ouvrir l'URL → bandeau « Installer l'application » (ou menu ⋮ → *Installer l'application*). Le bouton **📲 Installer l'appli** de l'écran-titre fait la même chose. |
| **iOS / Safari** | Ouvrir l'URL → bouton **Partager** → *Sur l'écran d'accueil*. |
| **Ordinateur** | Chrome/Edge : icône d'installation dans la barre d'adresse. |

La progression est enregistrée **sur l'appareil** (`localStorage`), avec sauvegarde automatique à chaque badge, chaque soin au Centre et à chaque mise en arrière-plan.

## Lancer en local

```bash
npm install
npm run dev        # serveur de développement (ouvrir l'URL affichée)
npm run build      # build de production dans dist/
npm run preview -- --host   # tester le build depuis un téléphone du même réseau
```

Node 18+ requis. Aucun asset externe : icônes, modèles 3D et musiques sont **générés par le code**.

## Déploiement

Un workflow GitHub Actions (`.github/workflows/deploy.yml`) publie `dist/` sur **GitHub Pages** à chaque push sur la branche par défaut. Activer *Settings → Pages → Source: GitHub Actions*, et l'URL obtenue est directement installable.
Le build utilise des chemins relatifs (`base: './'`), donc n'importe quel hébergeur statique convient (Netlify, Vercel, un simple dossier servi en HTTPS…).

---

## Le jeu

### Le Pokédex

**208 Pokémon officiels** couvrant les **neuf générations**, dont les 27 lignes de starters (Bulbizarre à Coiffeton), les pseudo-légendaires (Dracolosse, Tyranocif, Drattak, Carchacrok, Trioxhydre, Tranchodon, Lancargot) et huit légendaires itinérants (Mewtwo, Lugia, Rayquaza, Darkrai, Zekrom, Xerneas, Zacian, Koraidon).

Noms français, types, statistiques de base et chaînes d'évolution proviennent de sources ouvertes et sont **régénérés par script**, jamais recopiés à la main :

```bash
npm run pokedex   # @pkmn/dex + pokemon → src/data/pokedex.gen.ts
```

Les deux paquets sont des **dépendances de développement** : rien n'est téléchargé à l'exécution, et le jeu reste jouable hors-ligne. Les descripteurs visuels (silhouette, attributs, couleurs) qui pilotent les modèles 3D sont écrits à la main dans `scripts/roster-*.mjs`.

> ⚠️ Les noms et les créatures Pokémon appartiennent à Nintendo / Game Freak / The Pokémon Company. Ce dépôt est un projet personnel non commercial : ne le publiez pas sous une forme qui laisserait croire à un produit officiel.

Quelques choix de conception :

- Les évolutions par pierre, échange ou bonheur sont converties en **évolutions par niveau** (le moteur ne gère que celles-là) : Pikachu passe Raichu au niveau 30, Kadabra devient Alakazam au 36, etc.
- **Évoli** garde ses cinq voies : au niveau 30, le jeu demande quelle forme choisir.
- Les lignes de starters officielles se trouvent **dans la nature**, groupées par thème : les Plante en Route 2, les Eau sur la plage de la Route 4, les Feu sur la route du volcan.

### Les 3 starters (lignes exclusives)

| Départ | Stade 2 | Stade final | Types finaux |
|---|---|---|---|
| **Brasillon** (Feu) | Cendrailes | **Pyrodrakon** | 🔥 Feu / 🐉 Dragon |
| **Ondulin** (Eau) | Brumaspectre | **Abyssire** | 💧 Eau / 👻 Spectre |
| **Germinuit** (Plante) | Sylvombre | **Nocteracine** | 🌿 Plante / 🌑 Ténèbres |

Évolutions aux niveaux **16** et **36**. Le rival choisit systématiquement le starter qui vous contre et le fait évoluer au même rythme (4 duels scénarisés).

### Progression

**Région 1 — Valmore (8 arènes)**

| # | Ville | Champion | Type | Badge |
|---|---|---|---|---|
| 1 | Sérènis | Basile | Insecte | 🐛 Chrysalide |
| 2 | Cendrebourg | Garvin | Roche | 🪨 Granit |
| 3 | Port-Marée | Nérine | Eau | 🌊 Ressac |
| 4 | Fougèville | Solène | Plante | 🌿 Sylve |
| 5 | Voltac | Dorian | Électrik | ⚡ Voltage |
| 6 | Braisefort | Iskander | Feu | 🔥 Fournaise |
| 7 | Givrelune | Maëlis | Glace | ❄️ Frimas |
| 8 | Nyxhaven | Corvin | Spectre | 👻 Éther |

Puis la **Route Victoire** et la **Ligue** : Conseil des 4 (Théa, Rovan, Ilyane, Draguen) enchaîné sans soin, puis la Championne **Auréa** (niv. 56-60).

**Post-game — Orsyn (8 arènes de plus, façon Or/Argent)**

Devenir Maître débloque le **Passe d'Orsyn** et le ferry de Port-Marée vers une seconde région entière : Sirin (Vol), Bram (Sol), Tovald (Acier), Ysoline (Fée), Vask (Poison), Nyriel (Ténèbres), Hektor (Combat), Aldwin (Dragon) — niveaux 52 → 73.

Les 16 badges ouvrent le **Mont Cendre**, et à son sommet attend **Émeric**, un dresseur silencieux dont l'équipe (Pyrodrakon, Abyssire, Nocteracine, Souverain, Chronoss, **Ténébrarque**) culmine au **niveau 82**. C'est le vrai combat final.

Quatre **légendaires itinérants** (Ignivore, Abyssaltar, Sylvanor, Chronoss) n'apparaissent dans les hautes herbes qu'après le sacre.

### Systèmes

- **Combat** : tour par tour complet — table des 18 types, STAB, critiques, priorité, coups multiples, drain, contrecoup, paliers de stats (−6…+6), 7 statuts (brûlure, poison, poison grave, paralysie, sommeil, gel, confusion), IA qui monte en compétence sur les arènes/Ligue/boss (et qui utilise des soins).
- **Capture** : formule à 4 secousses, taux dépendant des PV restants, du statut et de la Sphère (Sphère → Maître).
- **Progression** : 100 niveaux, XP cubique, natures (25), IV, apprentissage de capacités avec remplacement au choix, évolutions annulables, PC de stockage illimité.
- **Confort mobile** : joystick tactile + boutons A/B, clavier pris en charge (flèches/ZQSD, Entrée, Échap, Maj pour courir), interface adaptée portrait **et** paysage, encoches respectées.

### Les créatures à l'écran

En combat, chaque créature est un **sprite plat** posé sur sa plateforme — la présentation des jeux DS. La texture vient de la première source disponible :

1. **Votre pack** — `public/sprites/<numéro national>.png` (et `back/<n>.png` pour la vue de dos). Rien n'est livré ni téléchargé : le dossier est vide et ignoré par git, vous y déposez ce que vous voulez. Un `index.json` optionnel évite les requêtes inutiles. Voir `public/sprites/LISEZMOI.md`.
2. **Cuisson du modèle 3D** — sinon, le modèle procédural est rendu une fois hors écran en 128×128, contour compris, et la texture est réutilisée (cache de 64, vue de face et vue de dos). C'est ce que vous voyez par défaut.

Le réglage **Créatures : Sprites / Modèles 3D** (Options) bascule entre les billboards et les modèles animés en volume.

> Les sprites des jeux appartiennent à Nintendo / Game Freak / Creatures. Ce dépôt n'en distribue ni n'en télécharge aucun — il se contente de laisser la place.

### Rendu « console portable »

Le jeu vise le rendu des Pokémon sur DS : basse définition, couleurs franches, contours nets — sans aucune texture ni asset.

- **Passe basse définition** : la 3D est rendue dans une cible de 232 px de côté court puis agrandie au plus proche voisin. C'est ce qui donne le grain « pixel » de la console.
- **Quantification 15 bits** (32 niveaux par canal), la profondeur couleur réelle de la DS.
- **Interface façon boîtes de dialogue Pokémon** : panneaux clairs, bordures épaisses, double liseré, barres de PV vertes/jaunes/rouges.
- Réglage **Rendu : Écran DS / Lisse** dans les Options pour repasser en pleine définition.

Par-dessous, le moteur reste du cel-shading :

- **Ombrage toon** (`MeshToonMaterial` + rampe de dégradé) sur tout ce qui est affiché, avec un ciel en dôme dégradé et un brouillard calé sur la couleur d'horizon.
- **Ombres portées** temps réel : le soleil suit le joueur pour garder une carte d'ombre nette autour de lui.
- **Contour façon dessin animé** sur les créatures — coque inversée décalée *en espace vue*, donc d'épaisseur constante quelle que soit la taille des pièces du modèle.
- **Silhouette dérivée des statistiques** : les gros PV s'épaississent, la Vitesse affine et allonge. Appliqué automatiquement aux 217 espèces.
- **Motifs** (bandes, taches, masque, anneaux) posés par-dessus la silhouette pour distinguer les espèces proches.
- **Terrain vallonné** : champ de hauteur bruité partagé aux coins des tuiles (donc sans fissure), aplati sous les chemins et les bâtiments, avec occlusion douce près des obstacles.
- **Couleurs fondues par famille de surface** : les nuances d'herbe se mélangent entre voisines, tandis que chemins, hautes herbes et rives gardent un bord net — les zones de rencontre restent lisibles d'un coup d'œil.
- **Végétation animée par le vent** (shader de déplacement instancié), **eau** avec houle, hauts-fonds dégradés et lit sombre, **nuages** dérivants et **chaîne de montagnes** à l'horizon.
- Onze palettes de biome (plaine, forêt, montagne, plage, désert, neige, sommet, volcan, marais, grotte, intérieur) : chaque région a sa lumière, ses props et son ciel.
- Combats : arène en deux plateformes, décor de fond sur deux profondeurs, poussières en suspension, ondes de choc au sol, gerbes de particules aux couleurs du type et ombres de contact.

Le tout tient en ~40 appels de rendu et ~26 000 triangles par image — largement dans le budget d'un téléphone milieu de gamme, et la passe basse définition divise encore le coût de remplissage. Un réglage **Graphismes : Élevés / Légers** (menu Options) coupe les ombres pour les appareils modestes.

### Contenu généré par le code

Rien n'est téléchargé : les cartes (villes, routes, grottes, arènes, intérieurs — **114 cartes**) sont générées de façon **déterministe** à partir d'une graine, les **217 modèles 3D** sont construits à la volée à partir d'un descripteur (14 silhouettes × 16 attributs × couleurs propres à l'espèce), et la bande-son chiptune est synthétisée en Web Audio.

Aucun sprite ni aucune illustration Pokémon n'est copié dans le dépôt : les créatures sont des interprétations low-poly bâties par le code.

---

## Commandes

| Action | Tactile | Clavier |
|---|---|---|
| Se déplacer | Joystick (bas-gauche) | Flèches / ZQSD |
| Courir | — | Maj |
| Parler / valider | **A** ou taper l'écran | Entrée / Espace |
| Annuler | **B** | Échap |
| Menu | **☰** | Tab / M |

Le menu **Options** règle le son, les créatures (sprites ou 3D), le rendu (écran DS ou lisse) et le niveau de détail graphique.

---

## Architecture

```
src/
  data/        types, capacités, espèces, objets, monde (zones, arènes, Ligue)
               pokedex.gen.ts est généré — voir scripts/gen-pokedex.mjs
  engine/      rendu Three.js, entrées tactiles, audio chiptune, RNG déterministe
  world/       génération procédurale des cartes + scène 3D d'exploration
  creature/    construction procédurale des modèles 3D + cuisson en sprites et pack joueur
  battle/      moteur de combat + scène 3D de combat
  game/        état de la partie, sauvegarde, modèle d'une créature
  ui/          dialogues, menus, sac, Dex, boutique, interface de combat
scripts/       génération du Pokédex et des icônes PWA + tests de bout en bout (Playwright)
```

Tests de bout en bout, dans un vrai navigateur (Playwright) :

```bash
npm test                # build + les quatre suites
npm run test:smoke      # écran-titre → nouvelle partie → exploration
npm run test:battle     # combat sauvage complet
npm run test:flow       # cohérence du Pokédex, 114 cartes, arène, boutique, soins, badges, sauvegarde
npm run test:sprites    # cuisson des modèles ET chargement d'un pack (pack factice généré à la volée)
```

`npm run sprites:demo` fabrique un petit pack de démonstration (silhouettes colorées générées par le script, aucune image Pokémon) pour voir le mécanisme à l'œuvre.

Les captures d'écran atterrissent dans `screenshots/`. Sur une machine où Chromium
est déjà installé ailleurs, pointer `CHROMIUM_PATH` dessus.
