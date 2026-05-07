// Version du jeu — source de vérité unique
export const VERSION = '1.2.0';
export const CODENAME = 'Kanto & Progression';
export const RELEASE_DATE = '2026-05-07';

// Notes de patch — affichées dans l'onglet dédié
export const PATCH_NOTES = [
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
                    'Routes débloquées au fil des victoires (Route 1 → Forêt de Jade → Mont Sélénite…)',
                    'Pokémon sauvages tirés du pool spécifique à chaque zone'
                ]
            },
            {
                title: '⭐ Pokémon shinies',
                items: [
                    'Chaque Pokémon sauvage a une chance d\'être shiny (1/8192, taux Gen 1)',
                    'Sprites alternatifs colorés et animation d\'apparition',
                    'Notification spéciale lors d\'une rencontre shiny'
                ]
            },
            {
                title: '📈 Système d\'expérience',
                items: [
                    'Tes Pokémon gagnent de l\'EXP après chaque combat',
                    'Montée de niveau automatique avec recalcul des stats',
                    'Barre d\'EXP visible sur chaque membre de l\'équipe',
                    'Plus l\'adversaire est fort, plus l\'EXP gagnée est importante'
                ]
            },
            {
                title: '🤖 Autobattle',
                items: [
                    'Bouton « Auto » en combat : ton Pokémon choisit l\'attaque la plus efficace',
                    'Idéal pour enchaîner les combats rapidement',
                    'Activable/désactivable à tout moment'
                ]
            },
            {
                title: '🎨 Sprites animés',
                items: [
                    'Sprites animés tirés de Pokémon Showdown',
                    'Animations en boucle pendant les combats',
                    'Variantes shinies pour chaque Pokémon'
                ]
            },
            {
                title: '🎯 Quality of Life',
                items: [
                    'Réorganisation de l\'équipe possible (boutons ↑ / ↓)',
                    'Suppression des PP : enchaîne les attaques sans limite',
                    'Sprite d\'objet pour la Pokéball',
                    'Bug corrigé : blocage au 2ème combat après une capture'
                ]
            },
            {
                title: '✨ Refonte visuelle',
                items: [
                    'Palette plus sobre et professionnelle (slate / accent rouge)',
                    'Typographie épurée, moins d\'emojis dans les libellés',
                    'Cartes aux contours nets, ombres plus discrètes',
                    'Lisibilité améliorée sur les écrans denses'
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
                    'Pokémon sauvages désormais niveau 2-3 (au lieu de 4-5)',
                    'Champion niveau 7 (au lieu de 8)',
                    'Attaques ennemies : -25% de dégâts',
                    'Affichage du niveau du Pokémon sauvage dans sa fiche'
                ]
            },
            {
                title: 'Nouvelles fonctionnalités',
                items: [
                    'Choix du mode de jeu : Normal ou Hardcore',
                    'Système de capture avec 5 Pokéballs au départ',
                    'Centre Pokémon disponible dès le hub',
                    'Onglet Sac activé après le choix du starter',
                    'Menu de combat : Attaque / Sac / Fuite'
                ]
            },
            {
                title: 'Interface',
                items: [
                    'Positions des Pokémon inversées en combat (vue classique)',
                    'Arène agrandie (320 → 460 px) et sprites plus grands',
                    'Localisation française complète (Pokémon, attaques, types)'
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
                    'Choix du nom du dresseur',
                    'Sélection du starter (Bulbizarre / Salamèche / Carapuce)',
                    'Easter egg : nom Sacha / Red / Ash → Pikachu en starter',
                    'Système de combat tour par tour (dégâts, types, critiques, STAB)',
                    'Hub Route 1 + Champion final',
                    'Interface complète avec onglets futurs grisés',
                    'Données 100% issues de la PokeAPI (Gen 1 uniquement)'
                ]
            }
        ]
    }
];

// Roadmap des versions à venir
export const ROADMAP = [
    {
        version: '1.3',
        codename: 'Pokédex',
        items: [
            'Onglet Pokédex fonctionnel avec progression',
            'Statistiques de capture (vus / capturés)',
            'Fiche détaillée par Pokémon'
        ]
    },
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
            'Multijoueur en ligne',
            'Options de personnalisation'
        ]
    }
];
