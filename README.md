# PokeLike — Aventure Valmore & Orsyn

RPG de capture de créatures, **en 3D**, jouable au doigt et **installable sur mobile en un tap** (PWA — aucun store, aucun compte, fonctionne hors-ligne).

> 3 starters exclusifs · 16 arènes · une Ligue · un post-game complet façon Or/Argent · 76 créatures · 103 capacités · les 18 types.

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

### Rendu 3D

Le jeu vise un rendu **cel-shading** lisible sur petit écran, sans aucune texture ni asset :

- **Ombrage toon** (`MeshToonMaterial` + rampe de dégradé) sur tout ce qui est affiché, avec un ciel en dôme dégradé et un brouillard calé sur la couleur d'horizon.
- **Ombres portées** temps réel : le soleil suit le joueur pour garder une carte d'ombre nette autour de lui.
- **Contour façon dessin animé** sur les créatures en combat — coque inversée décalée *en espace vue*, donc d'épaisseur constante quelle que soit la taille des pièces du modèle.
- **Terrain vallonné** : champ de hauteur bruité partagé aux coins des tuiles (donc sans fissure), aplati sous les chemins et les bâtiments, avec occlusion douce près des obstacles.
- **Couleurs fondues par famille de surface** : les nuances d'herbe se mélangent entre voisines, tandis que chemins, hautes herbes et rives gardent un bord net — les zones de rencontre restent lisibles d'un coup d'œil.
- **Végétation animée par le vent** (shader de déplacement instancié), **eau** avec houle, hauts-fonds dégradés et lit sombre, **nuages** dérivants et **chaîne de montagnes** à l'horizon.
- Onze palettes de biome (plaine, forêt, montagne, plage, désert, neige, sommet, volcan, marais, grotte, intérieur) : chaque région a sa lumière, ses props et son ciel.
- Combats : arène en deux plateformes, décor de fond sur deux profondeurs, poussières en suspension, ondes de choc au sol, gerbes de particules aux couleurs du type et ombres de contact.

Le tout tient en ~40 appels de rendu et ~26 000 triangles par image — largement dans le budget d'un téléphone milieu de gamme. Un réglage **Graphismes : Élevés / Légers** (menu Options) coupe les ombres et abaisse la résolution interne pour les appareils modestes.

### Contenu généré par le code

Rien n'est téléchargé : les cartes (villes, routes, grottes, arènes, intérieurs — **114 cartes**) sont générées de façon **déterministe** à partir d'une graine, les modèles 3D des créatures sont construits à partir de leur silhouette et de leurs types, et la bande-son chiptune est synthétisée en Web Audio.

---

## Commandes

| Action | Tactile | Clavier |
|---|---|---|
| Se déplacer | Joystick (bas-gauche) | Flèches / ZQSD |
| Courir | — | Maj |
| Parler / valider | **A** ou taper l'écran | Entrée / Espace |
| Annuler | **B** | Échap |
| Menu | **☰** | Tab / M |

Le menu **Options** règle le son et le niveau de détail graphique.

---

## Architecture

```
src/
  data/        types, capacités, espèces, objets, monde (zones, arènes, Ligue)
  engine/      rendu Three.js, entrées tactiles, audio chiptune, RNG déterministe
  world/       génération procédurale des cartes + scène 3D d'exploration
  creature/    construction procédurale des modèles 3D
  battle/      moteur de combat + scène 3D de combat
  game/        état de la partie, sauvegarde, modèle d'une créature
  ui/          dialogues, menus, sac, Dex, boutique, interface de combat
scripts/       génération des icônes PWA + tests de bout en bout (Playwright)
```

Tests de bout en bout, dans un vrai navigateur (Playwright) :

```bash
npm test                # build + les trois suites
npm run test:smoke      # écran-titre → nouvelle partie → exploration
npm run test:battle     # combat sauvage complet
npm run test:flow       # 114 cartes, arène, boutique, soins, badges, sauvegarde/rechargement
```

Les captures d'écran atterrissent dans `screenshots/`. Sur une machine où Chromium
est déjà installé ailleurs, pointer `CHROMIUM_PATH` dessus.
