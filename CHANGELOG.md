# Notes de patch — PokeMOCA

## v1.3.0 — « Pokédex & Liberté » (2026-05-07)

### 📖 Pokédex fonctionnel
- Nouvel onglet **Pokédex** avec les **151 Pokémon de Kanto**
- **Silhouettes par défaut**, sprites colorés une fois capturés
- Compteur de progression **vus / capturés / 151**
- Filtres : **Tous / Capturés / Vus uniquement / Inconnus**
- Modal de détail au clic sur un Pokémon capturé
- Marqueur **📖** affiché en combat sur les Pokémon déjà au Pokédex

### 🗺️ Vraie carte de Kanto
- Carte revue avec **positionnement géographique** des routes
- Bourg Palette au sud, Cerulean au nord, comme dans le jeu original
- **Lignes de connexion** entre les routes (pseudo-éléments CSS)
- Code couleur pour les zones débloquées / verrouillées
- Indicateur **⬆ NORD** pour bien se repérer

### ⚙️ Options personnalisables
- **Mode sombre / mode clair** (préférence sauvegardée)
- **Autobattle activé par défaut** au début de chaque combat
- **Autocapture** sur les Pokémon non encore enregistrés au Pokédex
- **Vitesse de combat** : Lent / Normal / Rapide
- Bouton **Effacer le Pokédex** pour repartir à zéro
- Toutes les préférences persistent entre les sessions (localStorage)

### 🔁 Chaînes de combats
- Choisis le nombre de combats à enchaîner sur une route (×1 à ×N)
- **Limite progressive** selon ta progression :
  - <3 victoires → ×3 max
  - <6 victoires → ×4
  - <10 victoires → ×5
  - <15 victoires → ×6
  - 15+ victoires → ×7
- **Pas de soin** entre les combats : la tension monte
- Indicateur de chaîne en haut de l'arène
- Interrompue si toute ton équipe est K.O.

### 🎯 Autocapture
- Active l'option pour qu'une Pokéball soit lancée automatiquement
- Déclenchée uniquement sur les **Pokémon pas encore au Pokédex**
- Nécessite d'avoir au moins une Pokéball dans le sac

### 🎨 Refonte visuelle
- Nouvelle **palette colorée** inspirée des jeux Pokémon
  - Rouge Pokéball, bleu Dresseur, jaune Pikachu
- **Coins arrondis** et formes plus douces (radius 12-16px)
- Pattern subtil en arrière-plan
- **Notes de patch déplacées tout en bas** de la sidebar
- **Multijoueur retiré** de la sidebar (focus sur l'expérience solo)
- Type badges aux **couleurs officielles** des jeux

---

## v1.2.0 — « Kanto & Progression » (2026-05-07)

### 🗺️ Carte de Kanto
- **6 zones explorables** débloquées par tes victoires
  - Route 1, Forêt de Jade, Route 3, Mont Sélénite, Route 4, Route 24
- Aperçu des **Pokémon capturables sur chaque route** avec leur fourchette de niveau
- Onglet **Carte** dans la sidebar
- Action « Changer de zone » dans le hub

### ✨ Pokémon shinies
- Taux d'apparition **1 sur 8192** (comme dans le jeu original Gen 1)
- Étoile dorée et halo lumineux pour les distinguer
- Notification spéciale quand un shiny apparaît

### 📈 Système d'expérience
- Gagne de l'**EXP** après chaque combat
- **Montée de niveau** automatique avec recalcul des stats
- Barre d'EXP affichée en combat et dans le roster
- Courbe de progression équilibrée

### ⚡ Autobattle
- Bouton **Auto** en combat : ton Pokémon attaque automatiquement
- IA choisit toujours la meilleure attaque (puissance × STAB × type)
- Idéal pour farmer rapidement

### 🎨 Sprites animés
- Sprites issus de **Pokémon Showdown** (animés en combat)
- Mini-sprites de qualité pour le roster et la carte
- Fallback automatique vers les sprites PokeAPI si nécessaire

### 🛠️ Quality of Life
- **🐛 Bug corrigé** : on n'est plus bloqué au 2ème combat après une capture
- **Réorganisation de l'équipe** : déplace tes Pokémon avec ▲/▼
- **Suppression des PP** : les attaques sont illimitées
- Sprites des objets (Pokéball, Potion, Super Ball) en CSS pur

---

## v1.1.0 — « Capture & Confort » (2026-05-07)

### 🎯 Équilibrage
- **Difficulté réduite** sur les premiers combats
  - Pokémon sauvages : niveau **2-3** (avant : 4-5)
  - Champion : niveau **7** (avant : 8)
  - Les attaques ennemies infligent **25% de dégâts en moins**
- Affichage du **niveau du Pokémon sauvage** dans sa fiche

### 🆕 Nouvelles fonctionnalités
- **Choix du mode de jeu** au démarrage
  - 😊 Normal — équipe soignée automatiquement en cas de K.O.
  - 💀 Hardcore — Game Over si toute l'équipe tombe
- **Système de capture** avec Pokéballs
  - 5 Pokéballs offertes au début
  - Taux de capture qui augmente quand le Pokémon est blessé
  - Animation de Pokéball avec shake
- **Centre Pokémon** disponible dès le hub pour soigner l'équipe
- **Onglet Sac** activé après le choix du starter
- **Menu de combat** repensé : Attaque / Sac / Fuite

### 🎨 Interface
- Positions des Pokémon **inversées** en combat (vue classique : ennemi en haut-droite, joueur en bas-gauche)
- **Arène agrandie** : zone de combat passée de 320 px à 460 px
- Sprites des Pokémon plus grands et mieux mis en valeur
- **Localisation française** complète : noms des Pokémon, des attaques et des types tirés de la PokeAPI

---

## v1.0.0 — « First Catch » (2026-05-07)

### 🎮 Lancement
- Choix du nom du dresseur
- Sélection du starter parmi Bulbizarre, Salamèche et Carapuce
- **Easter egg** : nom « Sacha », « Red » ou « Ash » → Pikachu en starter
- Système de combat tour par tour avec :
  - Calcul de dégâts inspiré des jeux officiels
  - Table d'efficacité des types Gen 1
  - Coups critiques et bonus STAB
- Hub Route 1 avec exploration et combat contre le Champion (3 victoires requises)
- Données 100% issues de la **PokeAPI** (Génération I uniquement, ID ≤ 151)

---

## 🗺️ Prochaines versions prévues

### v1.4 — « Économie »
- Boutique pour acheter des Pokéballs et des potions
- Système de PokéDollars gagnés en combat
- Potions et Super Balls utilisables en combat

### v1.5 — « Box & Switch »
- Box PC pour stocker plus de 6 Pokémon
- Changement de Pokémon en combat
- Évolutions à un niveau seuil

### v2.0 — « Ligue Pokémon »
- Conseil des 4 + Maître final
- Combats contre les leaders d'arène
- Trophées et statistiques
