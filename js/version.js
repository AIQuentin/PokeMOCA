// Version du jeu — source de vérité unique
export const VERSION = '1.3.0';
export const CODENAME = 'Pokédex & Liberté';
export const RELEASE_DATE = '2026-05-07';

// Notes de patch — affichées dans l'onglet dédié
export const PATCH_NOTES = [
    {
        version: '1.3.0',
        codename: 'Pokédex & Liberté',
        date: '2026-05-07',
        sections: [
            {
                title: '📖 Pokédex fonctionnel',
                items: [
                    'Nouvel onglet Pokédex avec les 151 Pokémon de Kanto',
                    'Silhouettes par défaut, sprites colorés une fois capturés',
                    'Compteur de progression vus / capturés',
                    'Filtres : tous, capturés, vus, non rencontrés'
                ]
            },
            {
                title: '🗺️ Vraie carte de Kanto',
                items: [
                    'Carte revue avec positionnement géographique des routes',
                    'Pellet Town au sud, Cerulean au nord, comme dans le jeu original',
                    'Lignes de connexion entre routes',
                    'Code couleur pour les zones débloquées / verrouillées'
                ]
            },
            {
                title: '⚙️ Options personnalisables',
                items: [
                    'Mode sombre / mode clair',
                    'Autobattle activé par défaut',
                    'Autocapture sur les Pokémon non encore enregistrés au Pokédex',
                    'Vitesse des animations de combat (lent / normal / rapide)',
                    'Préférences sauvegardées entre les sessions'
                ]
            },
            {
                title: '🔁 Chaînes de combats',
                items: [
                    'Choisis le nombre de combats à enchaîner sur une route (×1 à ×N)',
                    'La limite augmente avec ta progression : ×3 au début, ×4, ×5, ×6, ×7',
                    'Soin automatique entre les combats désactivé : la tension monte',
                    'Interrompu si toute ton équipe est K.O.'
                ]
            },
            {
                title: '🎨 Refonte visuelle',
                items: [
                    'Palette colorée inspirée des jeux Pokémon (rouge / bleu / jaune)',
                    'Coins arrondis et formes plus douces',
                    'Notes de patch déplacées tout en bas de la sidebar',
                    'Multijoueur retiré (focus sur l\'expérience solo)'
                ]
            }
        ]
    },
    {
        version: '1.2.0',
        codename: 'Kanto & Progression',
        date: '2026-05-07',
        sections: [
            {
                title: '🗺️ Carte de Kanto',
                items: [
                    'Nouvel onglet « Carte » avec 6 zones explorables',
                    'Chaque route affiche les Pokémon capturables et leur niveau',
                    'Routes débloquées au fil des victoires',
                    'Pokémon sauvages tirés du pool spécifique à chaque zone'
                ]
            },
            {
                title: '⭐ Pokémon shinies',
                items: [
                    'Chaque Pokémon sauvage a une chance d\'être shiny (1/8192)',
                    'Sprites alternatifs colorés et animation d\'apparition'
                ]
            },
            {
                title: '📈 Système d\'expérience',
                items: [
                    'EXP gagnée après chaque combat, montée de niveau automatique',
                    'Barre d\'EXP visible sur chaque membre de l\'équipe'
                ]
            },
            {
                title: '🤖 Autobattle',
                items: [
                    'Bouton « Auto » en combat : ton Pokémon choisit l\'attaque la plus efficace'
                ]
            },
            {
                title: '🎨 Sprites animés',
                items: [
                    'Sprites animés tirés de Pokémon Showdown'
                ]
            },
            {
                title: '🎯 Quality of Life',
                items: [
                    'Réorganisation de l\'équipe possible (boutons ↑ / ↓)',
                    'Suppression des PP : enchaîne les attaques sans limite',
                    'Bug corrigé : blocage au 2ème combat après une capture'
                ]
            }
        ]
    },
    {
        version: '1.1.0',
        codename: 'Capture & Confort',
        date: '2026-05-07',
        sections: [
            {
                title: 'Équilibrage',
                items: [
                    'Difficulté réduite sur les premiers combats',
                    'Pokémon sauvages désormais niveau 2-3',
                    'Champion niveau 7',
                    'Attaques ennemies : -25% de dégâts'
                ]
            },
            {
                title: 'Nouvelles fonctionnalités',
                items: [
                    'Choix du mode de jeu : Normal ou Hardcore',
                    'Système de capture avec 5 Pokéballs au départ',
                    'Centre Pokémon disponible dès le hub'
                ]
            }
        ]
    },
    {
        version: '1.0.0',
        codename: 'First Catch',
        date: '2026-05-07',
        sections: [
            {
                title: 'Lancement initial',
                items: [
                    'Choix du nom du dresseur et du starter',
                    'Easter egg : nom Sacha / Red / Ash → Pikachu',
                    'Système de combat tour par tour (dégâts, types, critiques, STAB)',
                    'Données 100% PokeAPI (Gen 1 uniquement)'
                ]
            }
        ]
    }
];

// Roadmap des versions à venir
export const ROADMAP = [
    {
        version: '1.4',
        codename: 'Économie',
        items: [
            'Boutique (Pokéballs, potions, Super Ball)',
            'PokéDollars gagnés en combat',
            'Potions utilisables en combat'
        ]
    },
    {
        version: '1.5',
        codename: 'Box & Switch',
        items: [
            'Box PC pour stocker plus de 6 Pokémon',
            'Changement de Pokémon en combat',
            'Évolutions à un niveau seuil'
        ]
    },
    {
        version: '2.0',
        codename: 'Ligue Pokémon',
        items: [
            'Conseil des 4 + Maître final',
            'Combats contre les leaders d\'arène',
            'Trophées et statistiques'
        ]
    }
];
