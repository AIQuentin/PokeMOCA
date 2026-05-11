// Version du jeu — source de vérité unique
export const VERSION = '1.5.1';
export const CODENAME = 'Carte au Hub';
export const RELEASE_DATE = '2026-05-11';

// Notes de patch — affichées dans l'onglet dédié
export const PATCH_NOTES = [
    {
        version: '1.5.1',
        codename: 'Carte au Hub',
        date: '2026-05-11',
        sections: [
            {
                title: '🗺️ Carte intégrée au hub',
                items: [
                    'La carte de Kanto s\'affiche directement sur l\'écran d\'accueil, sous les badges',
                    'Voyage en 1 clic : clique une zone débloquée pour t\'y rendre immédiatement',
                    'Clic long (½ seconde) sur n\'importe quelle zone pour ouvrir les détails',
                    'Onglet « Carte » de la barre latérale retiré (devenu redondant)',
                    'Action « Changer de zone » du hub retirée (devenue redondante)'
                ]
            }
        ]
    },
    {
        version: '1.5.0',
        codename: 'Polish & Confort',
        date: '2026-05-07',
        sections: [
            {
                title: '⚔️ Refonte de l\'écran de combat',
                items: [
                    'Nouvelle disposition côte à côte : actions à gauche, arène à droite',
                    'Arène plus immersive avec dégradé ciel / sol et ombre au sol',
                    'Sprites du joueur et de l\'adversaire mieux mis en valeur',
                    'Journal de combat plus lisible avec messages colorés (EXP, shiny)',
                    'Menu principal Attaque / Auto / Sac / Fuite plus clair'
                ]
            },
            {
                title: '🗺️ Carte de Kanto simplifiée',
                items: [
                    'Vignettes compactes pour chaque ville et route',
                    'Modal de détail au clic : description, Pokémon sauvages, arène',
                    'Bouton « Voyager ici » direct depuis la modal',
                    'Distinction visuelle nette entre villes, routes et arènes',
                    'Indicateur ⬆ NORD pour mieux se repérer'
                ]
            },
            {
                title: '🏅 Hub Aventure réorganisé',
                items: [
                    'Badges d\'arène en pastilles compactes en bas du hub',
                    'Tooltip au survol pour identifier chaque badge',
                    'Compteur 0/8 toujours visible',
                    'Bandeau de combat de dresseur avec balls de progression',
                    'Modal de switch sur K.O. plus claire avec aperçu de l\'équipe'
                ]
            },
            {
                title: '🧹 Nettoyage interne',
                items: [
                    'Suppression de fonctionnalités expérimentales jamais finalisées',
                    'Code allégé et plus facile à maintenir',
                    'Préparation du terrain pour les prochaines mises à jour'
                ]
            }
        ]
    },
    {
        version: '1.4.0',
        codename: 'Voyage à Kanto',
        date: '2026-05-07',
        sections: [
            {
                title: '🏆 8 arènes officielles',
                items: [
                    'Les 8 leaders de Kanto fidèles au jeu Rouge/Bleu',
                    'Pierre, Ondine, Major Bob, Erika, Koga, Sabrina, Auguste, Giovanni',
                    'Équipes et niveaux exacts du jeu original',
                    'Chaque victoire = 1 badge qui débloque la suite de la carte',
                    'Jadielle (Giovanni) ne s\'ouvre qu\'avec 7 badges'
                ]
            },
            {
                title: '👑 Plateau Indigo',
                items: [
                    'Conseil des 4 + Champion accessible avec les 8 badges',
                    '5 combats enchaînés : Olga, Aldo, Agatha, Peter, Bleu',
                    'Aucun soin entre les combats — la vraie épreuve finale',
                    'Une défaite = retour au hub, à recommencer entièrement'
                ]
            },
            {
                title: '🔄 Switch sur K.O.',
                items: [
                    'Quand ton Pokémon tombe K.O., choisis le suivant à envoyer',
                    'Switch automatique s\'il ne reste qu\'un Pokémon valide',
                    'Côté adverse : les dresseurs envoient leurs Pokémon dans l\'ordre',
                    'Toute l\'équipe K.O. = défaite (ou Game Over en Hardcore)'
                ]
            },
            {
                title: '📈 Multi-EXP partagé',
                items: [
                    'Le combattant actif reçoit 50 % de l\'EXP gagnée',
                    'Les autres membres encore valides se partagent les 50 % restants',
                    'Si le combattant actif est seul valide, il prend 100 %',
                    'Toute l\'équipe progresse, plus seulement la tête de file'
                ]
            },
            {
                title: '🗺️ Vraie carte de Kanto',
                items: [
                    'Carte sur grille fidèle au jeu Rouge/Bleu',
                    'Bourg Palette, Argenta, Azuria, Carmin, Céladopole, Safrania, Parmanie, Cramois\'Île, Jadielle, Plateau Indigo',
                    'Villes (avec arènes) et routes (Pokémon sauvages) bien distinctes',
                    'Déblocage progressif via les badges remportés'
                ]
            },
            {
                title: 'ℹ️ Nouvel onglet Informations',
                items: [
                    'Documentation pratique sur les mécaniques du jeu',
                    'Système de combat, capture, EXP, switch, shinies, modes',
                    'Tout ce qu\'il faut savoir pour bien jouer'
                ]
            },
            {
                title: '🧹 Refonte de la progression',
                items: [
                    'L\'ancien Champion à 3 victoires est entièrement remplacé',
                    'La progression se mesure désormais en badges (0 à 8)',
                    'Carte de Kanto déverrouillée au fil des badges',
                    'Pokédollars retirés (pour cette version) : focus sur l\'aventure'
                ]
            }
        ]
    },
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
        version: '1.6',
        codename: 'Économie & Objets',
        items: [
            'Boutique (Pokéballs, potions, Super Ball, Hyper Ball)',
            'PokéDollars gagnés en combat de dresseur',
            'Potions et objets utilisables en combat'
        ]
    },
    {
        version: '1.7',
        codename: 'Box & Évolutions',
        items: [
            'Box PC pour stocker plus de 6 Pokémon',
            'Évolutions automatiques à un niveau seuil',
            'Pierres d\'évolution pour les cas spéciaux'
        ]
    },
    {
        version: '2.0',
        codename: 'Team Rocket',
        items: [
            'Casino de Céladopole avec mini-jeux',
            'Quête principale Team Rocket',
            'Mont Sélénite et Tour Pokémon explorables',
            'Pokémon légendaires (Mewtwo, Articuno, Sulfura, Électhor)'
        ]
    }
];
