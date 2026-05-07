// Module d'accès à la PokeAPI (Génération I uniquement)
// Avec récupération des noms français + sprites Pokémon Showdown
const API_BASE = 'https://pokeapi.co/api/v2';
const SHOWDOWN_BASE = 'https://play.pokemonshowdown.com/sprites';

const cache = new Map();

// Taux shiny (Gen 1 base : 1 sur 8192)
export const SHINY_RATE = 8192;

async function cachedFetch(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PokeAPI error: ${res.status} on ${url}`);
    const data = await res.json();
    cache.set(url, data);
    return data;
}

export async function getPokemon(nameOrId) {
    return cachedFetch(`${API_BASE}/pokemon/${nameOrId}`);
}

export async function getMove(nameOrId) {
    return cachedFetch(`${API_BASE}/move/${nameOrId}`);
}

export async function getSpecies(nameOrId) {
    return cachedFetch(`${API_BASE}/pokemon-species/${nameOrId}`);
}

function getFrenchName(namesArray, fallback) {
    const fr = namesArray?.find(n => n.language?.name === 'fr');
    return fr?.name || fallback;
}

function showdownName(name) {
    return name.toLowerCase().replace(/[-.\s']/g, '');
}

export function showdownSprites(name) {
    const slug = showdownName(name);
    return {
        front: `${SHOWDOWN_BASE}/ani/${slug}.gif`,
        frontShiny: `${SHOWDOWN_BASE}/ani-shiny/${slug}.gif`,
        back: `${SHOWDOWN_BASE}/ani-back/${slug}.gif`,
        backShiny: `${SHOWDOWN_BASE}/ani-back-shiny/${slug}.gif`,
        mini: `${SHOWDOWN_BASE}/gen5/${slug}.png`,
        miniShiny: `${SHOWDOWN_BASE}/gen5-shiny/${slug}.png`
    };
}

export const TYPE_FR = {
    normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik',
    grass: 'Plante', ice: 'Glace', fighting: 'Combat', poison: 'Poison',
    ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
    rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres',
    steel: 'Acier', fairy: 'Fée'
};

function computeStats(base, level) {
    return {
        maxHp: Math.floor(((2 * base.hp + 30) * level) / 100) + level + 10,
        attack: Math.floor(((2 * base.attack + 30) * level) / 100) + 5,
        defense: Math.floor(((2 * base.defense + 30) * level) / 100) + 5,
        speed: Math.floor(((2 * base.speed + 30) * level) / 100) + 5
    };
}

export function expToNextLevel(level) {
    return Math.floor(40 + level * 25);
}

export function expGained(enemyLevel, baseExp = 60) {
    return Math.floor((baseExp * enemyLevel) / 7);
}

export function applyLevelUp(pokemon) {
    pokemon.level += 1;
    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    const stats = computeStats(pokemon.base, pokemon.level);
    pokemon.maxHp = stats.maxHp;
    pokemon.attack = stats.attack;
    pokemon.defense = stats.defense;
    pokemon.speed = stats.speed;
    pokemon.currentHp = Math.max(1, Math.floor(stats.maxHp * hpRatio));
    pokemon.expToNext = expToNextLevel(pokemon.level);
}

export async function buildBattlePokemon(nameOrId, level = 5, opts = {}) {
    const raw = await getPokemon(nameOrId);

    if (raw.id > 151) {
        throw new Error(`${raw.name} n'est pas de la Génération I`);
    }

    let nameFr = raw.name;
    let captureRate = 190;
    try {
        const species = await getSpecies(raw.id);
        nameFr = getFrenchName(species.names, raw.name);
        captureRate = species.capture_rate || 190;
    } catch (e) {}

    const base = {};
    raw.stats.forEach(s => { base[s.stat.name] = s.base_stat; });

    const stats = computeStats(base, level);

    const candidateMoves = raw.moves
        .filter(m => {
            const detail = m.version_group_details.find(v => v.version_group.name === 'red-blue');
            if (!detail) return false;
            return detail.move_learn_method.name === 'level-up'
                && detail.level_learned_at > 0
                && detail.level_learned_at <= level + 5;
        })
        .map(m => m.move.name);

    let moveNames = candidateMoves.slice(0, 4);
    if (moveNames.length < 2) {
        moveNames = raw.moves.slice(0, 4).map(m => m.move.name);
    }

    const movesData = await Promise.all(
        moveNames.map(async (name) => {
            try {
                const move = await getMove(name);
                const moveNameFr = getFrenchName(move.names, move.name.replace(/-/g, ' '));
                return {
                    name: moveNameFr,
                    rawName: move.name,
                    power: move.power || 40,
                    accuracy: move.accuracy || 100,
                    type: move.type.name
                };
            } catch {
                return null;
            }
        })
    );

    const moves = movesData.filter(Boolean);

    if (moves.length === 0) {
        moves.push({
            name: 'Charge', rawName: 'tackle', power: 40, accuracy: 100,
            type: 'normal'
        });
    }

    const showdown = showdownSprites(raw.name);
    const fallbackSprite = raw.sprites.front_default || '';
    const fallbackBack = raw.sprites.back_default || fallbackSprite;

    // Les Pokémon de dresseurs ne sont jamais shinies
    const isShiny = opts.forceShiny ?? (opts.noShiny ? false : Math.random() < 1 / SHINY_RATE);

    return {
        id: raw.id,
        name: raw.name,
        nameFr,
        level,
        types: raw.types.map(t => t.type.name),
        base,
        maxHp: stats.maxHp,
        currentHp: stats.maxHp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        moves,
        sprite: isShiny ? showdown.frontShiny : showdown.front,
        backSprite: isShiny ? showdown.backShiny : showdown.back,
        miniSprite: isShiny ? showdown.miniShiny : showdown.mini,
        spriteFallback: fallbackSprite,
        backSpriteFallback: fallbackBack,
        captureRate,
        isShiny,
        exp: 0,
        expToNext: expToNextLevel(level),
        baseExp: 60
    };
}

export const GEN1_WILD_POOL = ['pidgey', 'rattata', 'caterpie', 'weedle', 'spearow'];
export const GEN1_IDS = Array.from({ length: 151 }, (_, i) => i + 1);

export function getDexSpriteUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function getMaxChainSize(badges) {
    if (badges < 1) return 3;
    if (badges < 3) return 4;
    if (badges < 5) return 5;
    if (badges < 7) return 6;
    return 7;
}

// === ARÈNES OFFICIELLES ROUGE/BLEU ===
// Équipes exactes des leaders de Kanto (jeu original Gen 1)
export const GYMS = {
    brock: {
        id: 'brock',
        order: 1,
        leaderName: 'Pierre',
        title: 'Champion d\'Argenta',
        type: 'rock',
        badge: 'Roche',
        badgeIcon: '🪨',
        intro: 'Je suis Pierre, le maître des Pokémon Roche !',
        team: [
            { name: 'geodude', level: 12 },
            { name: 'onix', level: 14 }
        ]
    },
    misty: {
        id: 'misty',
        order: 2,
        leaderName: 'Ondine',
        title: 'Championne d\'Azuria',
        type: 'water',
        badge: 'Cascade',
        badgeIcon: '💧',
        intro: 'Mon nom est Ondine, la sirène des combats Pokémon !',
        team: [
            { name: 'staryu', level: 18 },
            { name: 'starmie', level: 21 }
        ]
    },
    surge: {
        id: 'surge',
        order: 3,
        leaderName: 'Major Bob',
        title: 'Champion de Carmin',
        type: 'electric',
        badge: 'Foudre',
        badgeIcon: '⚡',
        intro: 'Mes Pokémon Électrik vont te griller, gamin !',
        team: [
            { name: 'voltorb', level: 21 },
            { name: 'pikachu', level: 18 },
            { name: 'raichu', level: 24 }
        ]
    },
    erika: {
        id: 'erika',
        order: 4,
        leaderName: 'Erika',
        title: 'Championne de Céladopole',
        type: 'grass',
        badge: 'Prisme',
        badgeIcon: '🌷',
        intro: 'Bienvenue. J\'enseigne l\'art floral, mais je suis aussi dresseuse Pokémon.',
        team: [
            { name: 'victreebel', level: 29 },
            { name: 'tangela', level: 24 },
            { name: 'vileplume', level: 29 }
        ]
    },
    koga: {
        id: 'koga',
        order: 5,
        leaderName: 'Koga',
        title: 'Champion de Parmanie',
        type: 'poison',
        badge: 'Âme',
        badgeIcon: '☠️',
        intro: 'Crains la science ninja ! Mes Pokémon Poison te paralyseront.',
        team: [
            { name: 'koffing', level: 37 },
            { name: 'muk', level: 39 },
            { name: 'koffing', level: 37 },
            { name: 'weezing', level: 43 }
        ]
    },
    sabrina: {
        id: 'sabrina',
        order: 6,
        leaderName: 'Sabrina',
        title: 'Championne de Safrania',
        type: 'psychic',
        badge: 'Marais',
        badgeIcon: '🔮',
        intro: 'J\'ai prédit ta venue. Mes pouvoirs psy seront ton tombeau.',
        team: [
            { name: 'kadabra', level: 38 },
            { name: 'mr-mime', level: 37 },
            { name: 'venomoth', level: 38 },
            { name: 'alakazam', level: 43 }
        ]
    },
    blaine: {
        id: 'blaine',
        order: 7,
        leaderName: 'Auguste',
        title: 'Champion de Cramois\'Île',
        type: 'fire',
        badge: 'Volcan',
        badgeIcon: '🔥',
        intro: 'Hot hot hot ! Mes Pokémon Feu vont te calciner !',
        team: [
            { name: 'growlithe', level: 42 },
            { name: 'ponyta', level: 40 },
            { name: 'rapidash', level: 42 },
            { name: 'arcanine', level: 47 }
        ]
    },
    giovanni: {
        id: 'giovanni',
        order: 8,
        leaderName: 'Giovanni',
        title: 'Champion de Jadielle',
        type: 'ground',
        badge: 'Terre',
        badgeIcon: '🌍',
        intro: 'Tu as démasqué la Team Rocket. Maintenant, prépare-toi à perdre.',
        team: [
            { name: 'rhyhorn', level: 45 },
            { name: 'dugtrio', level: 42 },
            { name: 'nidoqueen', level: 44 },
            { name: 'nidoking', level: 45 },
            { name: 'rhydon', level: 50 }
        ]
    }
};

export const GYM_ORDER = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];

// === CONSEIL DES 4 + CHAMPION ===
// 5 combats enchaînés, sans soin entre les combats
export const ELITE_FOUR = [
    {
        id: 'lorelei',
        order: 1,
        leaderName: 'Olga',
        title: 'Conseil des 4 — Glace',
        type: 'ice',
        intro: 'Je suis Olga, la première du Conseil. Mes Pokémon Glace gèleront ton âme.',
        team: [
            { name: 'dewgong', level: 54 },
            { name: 'cloyster', level: 53 },
            { name: 'slowbro', level: 54 },
            { name: 'jynx', level: 56 },
            { name: 'lapras', level: 56 }
        ]
    },
    {
        id: 'bruno',
        order: 2,
        leaderName: 'Aldo',
        title: 'Conseil des 4 — Combat',
        type: 'fighting',
        intro: 'Hwa ha ha ! Mes Pokémon Combat vont t\'écraser !',
        team: [
            { name: 'onix', level: 53 },
            { name: 'hitmonchan', level: 55 },
            { name: 'hitmonlee', level: 55 },
            { name: 'onix', level: 56 },
            { name: 'machamp', level: 58 }
        ]
    },
    {
        id: 'agatha',
        order: 3,
        leaderName: 'Agatha',
        title: 'Conseil des 4 — Spectre',
        type: 'ghost',
        intro: 'Je vais te montrer ce qu\'est la vraie peur, gamin.',
        team: [
            { name: 'gengar', level: 56 },
            { name: 'golbat', level: 56 },
            { name: 'haunter', level: 55 },
            { name: 'arbok', level: 58 },
            { name: 'gengar', level: 60 }
        ]
    },
    {
        id: 'lance',
        order: 4,
        leaderName: 'Peter',
        title: 'Conseil des 4 — Dragon',
        type: 'dragon',
        intro: 'Je suis Peter, dresseur de Dragons. Le plus fort du Conseil.',
        team: [
            { name: 'gyarados', level: 58 },
            { name: 'dragonair', level: 56 },
            { name: 'dragonair', level: 56 },
            { name: 'aerodactyl', level: 60 },
            { name: 'dragonite', level: 62 }
        ]
    },
    {
        id: 'champion-blue',
        order: 5,
        leaderName: 'Bleu',
        title: 'Maître Pokémon',
        type: 'mixed',
        intro: 'Hé hé ! Je t\'attendais. Je suis le nouveau Maître. À toi de me détrôner.',
        team: [
            { name: 'pidgeot', level: 61 },
            { name: 'alakazam', level: 59 },
            { name: 'rhydon', level: 61 },
            { name: 'arcanine', level: 61 },
            { name: 'exeggutor', level: 59 },
            { name: 'gyarados', level: 61 }
        ]
    }
];

export function getGymByOrder(n) {
    const id = GYM_ORDER[n - 1];
    return id ? GYMS[id] : null;
}

export function getNextGym(badges) {
    if (badges >= 8) return null;
    return getGymByOrder(badges + 1);
}

// Construit l'équipe complète d'un dresseur (gym ou Conseil)
export async function spawnTrainerTeam(teamData) {
    const team = await Promise.all(
        teamData.map(p => buildBattlePokemon(p.name, p.level, { noShiny: true }))
    );
    return team;
}

// === CARTE DE KANTO ===
// Structure unifiée : villes (towns) et routes
// Layout sur grille 7 colonnes × 9 rangées (sud-nord inversé : row 1 = nord)
export const LOCATIONS = [
    // Sud — départ
    {
        id: 'palette',
        type: 'town',
        name: 'Bourg Palette',
        desc: 'Ton village natal. Le voyage commence ici.',
        icon: '🏠',
        col: 2, row: 9,
        requires: { badges: 0 }
    },
    {
        id: 'route-1',
        type: 'route',
        name: 'Route 1',
        desc: 'Une route paisible aux herbes hautes.',
        icon: '🌿',
        col: 2, row: 8,
        pool: ['pidgey', 'rattata'],
        levelMin: 2, levelMax: 4,
        requires: { badges: 0 }
    },
    {
        id: 'viridian',
        type: 'town',
        name: 'Jadielle',
        desc: 'Une ville paisible. Son arène est mystérieusement fermée…',
        icon: '🏘️',
        col: 2, row: 7,
        gymId: 'giovanni',
        gymUnlockBadges: 7,
        requires: { badges: 0 }
    },
    {
        id: 'route-2',
        type: 'route',
        name: 'Route 2',
        desc: 'Mène à la Forêt de Jade.',
        icon: '🛤️',
        col: 2, row: 6,
        pool: ['pidgey', 'rattata', 'caterpie', 'weedle'],
        levelMin: 3, levelMax: 5,
        requires: { badges: 0 }
    },
    {
        id: 'viridian-forest',
        type: 'route',
        name: 'Forêt de Jade',
        desc: 'Forêt dense peuplée d\'insectes et d\'un Pokémon électrique légendaire.',
        icon: '🌲',
        col: 2, row: 5,
        pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu'],
        levelMin: 4, levelMax: 6,
        requires: { badges: 0 }
    },
    {
        id: 'pewter',
        type: 'town',
        name: 'Argenta',
        desc: 'Ville aux pierres grises. Première arène de la région.',
        icon: '🏛️',
        col: 2, row: 4,
        gymId: 'brock',
        requires: { badges: 0 }
    },
    {
        id: 'route-3',
        type: 'route',
        name: 'Route 3',
        desc: 'Sur le chemin du Mont Sélénite.',
        icon: '🏞️',
        col: 3, row: 4,
        pool: ['spearow', 'jigglypuff', 'mankey'],
        levelMin: 7, levelMax: 10,
        requires: { badges: 1 }
    },
    {
        id: 'mt-moon',
        type: 'route',
        name: 'Mont Sélénite',
        desc: 'Une grotte sombre où prospèrent les Pokémon Roche.',
        icon: '⛰️',
        col: 4, row: 4,
        pool: ['zubat', 'geodude', 'paras', 'clefairy'],
        levelMin: 8, levelMax: 11,
        requires: { badges: 1 }
    },
    {
        id: 'route-4',
        type: 'route',
        name: 'Route 4',
        desc: 'Une zone aride menant à Azuria.',
        icon: '🏜️',
        col: 5, row: 4,
        pool: ['ekans', 'sandshrew', 'spearow', 'mankey'],
        levelMin: 10, levelMax: 13,
        requires: { badges: 1 }
    },
    {
        id: 'cerulean',
        type: 'town',
        name: 'Azuria',
        desc: 'Ville d\'eau aux fontaines cristallines.',
        icon: '🏛️',
        col: 6, row: 4,
        gymId: 'misty',
        requires: { badges: 1 }
    },
    {
        id: 'route-5',
        type: 'route',
        name: 'Route 5',
        desc: 'Route boisée vers le sud.',
        icon: '🌳',
        col: 6, row: 5,
        pool: ['oddish', 'bellsprout', 'pidgey', 'meowth'],
        levelMin: 12, levelMax: 15,
        requires: { badges: 2 }
    },
    {
        id: 'route-6',
        type: 'route',
        name: 'Route 6',
        desc: 'Mène à Carmin-sur-Mer.',
        icon: '🌳',
        col: 6, row: 6,
        pool: ['oddish', 'meowth', 'pidgey', 'mankey'],
        levelMin: 14, levelMax: 17,
        requires: { badges: 2 }
    },
    {
        id: 'vermilion',
        type: 'town',
        name: 'Carmin-sur-Mer',
        desc: 'Port animé. Un capitaine Pokémon t\'y attend.',
        icon: '🏛️',
        col: 6, row: 7,
        gymId: 'surge',
        requires: { badges: 2 }
    },
    {
        id: 'route-7',
        type: 'route',
        name: 'Route 7',
        desc: 'Mène à Céladopole.',
        icon: '🌳',
        col: 4, row: 6,
        pool: ['oddish', 'meowth', 'mankey', 'bellsprout'],
        levelMin: 16, levelMax: 19,
        requires: { badges: 3 }
    },
    {
        id: 'celadon',
        type: 'town',
        name: 'Céladopole',
        desc: 'La plus grande ville de Kanto. Boutiques et casino.',
        icon: '🏛️',
        col: 3, row: 6,
        gymId: 'erika',
        requires: { badges: 3 }
    },
    {
        id: 'route-8',
        type: 'route',
        name: 'Route 8',
        desc: 'Tunnel souterrain vers Lavanville.',
        icon: '🌳',
        col: 5, row: 6,
        pool: ['meowth', 'vulpix', 'growlithe', 'mankey'],
        levelMin: 18, levelMax: 21,
        requires: { badges: 3 }
    },
    {
        id: 'saffron',
        type: 'town',
        name: 'Safrania',
        desc: 'Centre névralgique de Kanto. Une arène redoutable.',
        icon: '🏛️',
        col: 5, row: 5,
        gymId: 'sabrina',
        requires: { badges: 5 }
    },
    {
        id: 'route-16',
        type: 'route',
        name: 'Piste cyclable',
        desc: 'Route 16-18, parfaite pour les Pokémon volants.',
        icon: '🚴',
        col: 3, row: 7,
        pool: ['rattata', 'spearow', 'doduo', 'fearow'],
        levelMin: 20, levelMax: 23,
        requires: { badges: 4 }
    },
    {
        id: 'fuchsia',
        type: 'town',
        name: 'Parmanie',
        desc: 'Cité du Safari Pokémon. Maître ninja en arène.',
        icon: '🏛️',
        col: 4, row: 8,
        gymId: 'koga',
        requires: { badges: 4 }
    },
    {
        id: 'route-19',
        type: 'route',
        name: 'Route Maritime',
        desc: 'Eaux poissonneuses au sud de Parmanie.',
        icon: '🌊',
        col: 5, row: 8,
        pool: ['tentacool', 'magikarp', 'horsea', 'staryu'],
        levelMin: 22, levelMax: 26,
        requires: { badges: 5 }
    },
    {
        id: 'cinnabar',
        type: 'town',
        name: 'Cramois\'Île',
        desc: 'Île volcanique. Laboratoire et arène de feu.',
        icon: '🌋',
        col: 5, row: 9,
        gymId: 'blaine',
        requires: { badges: 6 }
    },
    {
        id: 'route-22',
        type: 'route',
        name: 'Route 22',
        desc: 'Vers le Plateau Indigo. Réservée aux dresseurs aguerris.',
        icon: '🛤️',
        col: 1, row: 7,
        pool: ['mankey', 'spearow', 'nidoran-m', 'nidoran-f'],
        levelMin: 24, levelMax: 28,
        requires: { badges: 7 }
    },
    {
        id: 'indigo',
        type: 'town',
        name: 'Plateau Indigo',
        desc: 'La Ligue Pokémon. Conseil des 4 + Champion en 5 combats sans soin.',
        icon: '👑',
        col: 1, row: 5,
        gymId: 'elite-four',
        requires: { badges: 8 }
    }
];

export function getLocationById(id) {
    return LOCATIONS.find(l => l.id === id);
}

export function isLocationUnlocked(locationId, badges) {
    const loc = getLocationById(locationId);
    if (!loc) return false;
    return badges >= (loc.requires?.badges ?? 0);
}

export async function getRoutePokemonPreview(pool) {
    return Promise.all(
        pool.map(async (name) => {
            try {
                const raw = await getPokemon(name);
                let nameFr = raw.name;
                try {
                    const species = await getSpecies(raw.id);
                    nameFr = getFrenchName(species.names, raw.name);
                } catch {}
                return {
                    name,
                    nameFr,
                    sprite: showdownSprites(raw.name).mini,
                    types: raw.types.map(t => t.type.name)
                };
            } catch {
                return null;
            }
        })
    ).then(arr => arr.filter(Boolean));
}

// Compatibilité v1.3 (utilisé en fallback par battle.js)
export const ROUTES = LOCATIONS.filter(l => l.type === 'route');
export const CHAMPION_POKEMON = ['onix', 'machop', 'geodude'];

export const STARTERS = [
    {
        id: 1,
        name: 'bulbasaur',
        displayName: 'Bulbizarre',
        desc: 'Pokémon Plante/Poison équilibré. Avantage sur Roche, Eau, Sol.'
    },
    {
        id: 4,
        name: 'charmander',
        displayName: 'Salamèche',
        desc: 'Pokémon Feu rapide et offensif. Défi corsé en début de partie.'
    },
    {
        id: 7,
        name: 'squirtle',
        displayName: 'Carapuce',
        desc: 'Pokémon Eau résistant. Excellent choix défensif.'
    }
];

export const PIKACHU_STARTER_NAME = 'pikachu';

// === INFOS PRATIQUES (onglet Informations) ===
export const INFO_NOTES = [
    {
        title: '⚔️ Système de combat',
        items: [
            'Calcul de dégâts inspiré des jeux Gen 1 (formule officielle)',
            'Coup critique : 6,25 % de chance (×1,5)',
            'Bonus STAB (×1,5) si l\'attaque correspond au type du Pokémon',
            'Table d\'efficacité des types : ×0, ×0,5, ×1, ×2',
            'Réduction de difficulté : -25 % de dégâts pour les attaques ennemies',
            'Coups illimités (pas de PP)'
        ]
    },
    {
        title: '🔄 Switch sur K.O.',
        items: [
            'Quand ton Pokémon tombe K.O., tu choisis le suivant à envoyer',
            'Si un seul est valide, le switch est automatique',
            'Toute l\'équipe K.O. = défaite (ou Game Over en Hardcore)',
            'Côté adverse : les dresseurs envoient leurs Pokémon dans l\'ordre'
        ]
    },
    {
        title: '📈 Multi-EXP partagé',
        items: [
            'Le combattant actif reçoit 50 % de l\'EXP gagnée',
            'Les autres membres encore valides se partagent les 50 % restants',
            'Si le combattant actif est seul valide, il prend 100 %',
            'Les Pokémon K.O. ne reçoivent pas d\'EXP'
        ]
    },
    {
        title: '🎯 Capture',
        items: [
            'Probabilité basée sur le captureRate officiel + HP restant',
            'Plus le Pokémon est blessé, meilleure est la capture',
            'Impossible de capturer le Pokémon d\'un dresseur ou Champion',
            'Autocapture : option déclenchée sur les Pokémon non encore enregistrés'
        ]
    },
    {
        title: '✨ Shinies',
        items: [
            'Taux d\'apparition : 1 sur 8192 (Gen 1 originale)',
            'Étoile dorée et halo lumineux pour les distinguer',
            'Les Pokémon de dresseurs ne sont jamais shinies',
            'Le statut shiny se voit aussi dans le Pokédex'
        ]
    },
    {
        title: '🗺️ Carte de Kanto',
        items: [
            'Layout fidèle au jeu Rouge/Bleu : Bourg Palette au sud, Plateau Indigo au nord-ouest',
            'Villes contiennent des arènes ; routes contiennent des Pokémon sauvages',
            'Déblocage progressif via les badges d\'arène',
            'L\'arène de Jadielle (Giovanni) ne s\'ouvre qu\'avec 7 badges'
        ]
    },
    {
        title: '🏆 Arènes officielles',
        items: [
            '8 leaders dans l\'ordre Rouge/Bleu : Pierre, Ondine, Major Bob, Erika, Koga, Sabrina, Auguste, Giovanni',
            'Équipes et niveaux exacts du jeu original',
            'Les leaders envoient leurs Pokémon dans l\'ordre, comme dans le vrai jeu',
            'Une victoire = 1 badge, qui débloque la suite de la carte'
        ]
    },
    {
        title: '👑 Plateau Indigo',
        items: [
            'Accessible avec les 8 badges',
            '5 combats enchaînés : Olga, Aldo, Agatha, Peter, Champion Bleu',
            'Aucun soin entre les combats — la vraie épreuve finale',
            'Une seule défaite = retour au hub, à recommencer entièrement'
        ]
    },
    {
        title: '🔁 Chaînes de combats sauvages',
        items: [
            'Sur les routes, choisis combien de combats enchaîner',
            'Limite progressive selon le nombre de badges : ×3 → ×7',
            'Pas de soin entre les combats',
            'Idéal pour farmer EXP et compléter le Pokédex'
        ]
    },
    {
        title: '⚙️ Préférences',
        items: [
            'Thème clair / sombre',
            'Vitesse de combat : lent / normal / rapide',
            'Autobattle activé par défaut',
            'Autocapture sur les Pokémon non encore enregistrés',
            'Toutes les préférences persistent en localStorage'
        ]
    },
    {
        title: '🎮 Modes de jeu',
        items: [
            'Normal : équipe soignée automatiquement en cas de K.O. total',
            'Hardcore : Game Over si toute l\'équipe tombe (à recommencer)',
            'Easter egg : nom Sacha / Red / Ash → Pikachu en starter'
        ]
    },
    {
        title: '🛠️ Données et sources',
        items: [
            'Toutes les données Pokémon proviennent de PokeAPI (Gen 1, ID ≤ 151)',
            'Sprites animés tirés de Pokémon Showdown',
            'Noms et types en français via PokeAPI',
            'Aucun serveur côté projet : tout tourne dans le navigateur'
        ]
    }
];
