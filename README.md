# PokeMOCA 🎮

Petit jeu solo Pokémon en HTML/CSS/JavaScript pur, basé sur la [PokeAPI](https://pokeapi.co/).
Génération I uniquement.

## 🚀 Lancer le jeu

Aucune installation requise — c'est une application web statique.

### Option 1 : Double-clic
Ouvre simplement le fichier `index.html` dans ton navigateur (Chrome, Edge, Firefox).

### Option 2 : Serveur local (recommandé)
Si l'option 1 ne fonctionne pas (à cause des modules ES), lance un petit serveur :

```bash
# Avec Python 3
cd PokeMOCA
python -m http.server 8000

# Puis ouvre http://localhost:8000 dans ton navigateur
```

Ou avec Node :
```bash
npx http-server -p 8000
```

## 🎯 Gameplay (v1)

1. **Saisis ton nom** de dresseur
2. **Choisis ton starter** parmi Bulbizarre, Salamèche ou Carapuce
3. **Explore la Route 1** pour combattre des Pokémon sauvages
4. Après **3 victoires**, affronte le **Champion** pour gagner la partie

Durée : ~5 minutes par partie.

## 🥚 Easter egg

Essaie d'entrer **Sacha**, **Red** ou **Ash** comme nom de dresseur… 😉

## 🗺️ Fonctionnalités prévues (onglets grisés)

L'interface est déjà préparée pour les futures versions :

- 📖 **Pokédex** — collection complète Gen 1
- 🎒 **Sac** — objets, potions, Pokéballs
- 🏪 **Boutique** — achat d'objets
- 📦 **Box PC** — gestion d'équipe étendue
- 🏆 **Ligue** — Conseil des 4 + Champion
- 🌐 **Multijoueur** — combats en ligne
- ⚙️ **Options** — personnalisation

## 🛠️ Architecture

```
PokeMOCA/
├── index.html          # Structure principale + tous les écrans
├── css/styles.css      # Thème sombre + couleurs Pokémon
├── js/
│   ├── api.js          # Couche d'accès PokeAPI (avec cache)
│   ├── battle.js       # Système de combat (dégâts, types, IA)
│   └── main.js         # Orchestration & gestion d'état
└── README.md
```

## 📚 Données

Toutes les données Pokémon (sprites, stats, attaques, types) proviennent de la **PokeAPI**
(https://pokeapi.co/api/v2/). Les requêtes sont mises en cache côté client pour éviter
la duplication d'appels.

Filtrage strict Génération I : ID Pokédex ≤ 151.
