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

// Extrait le nom français depuis un tableau "names" PokeAPI
function getFrenchName(namesArray, fallback) {
    const fr = namesArray?.find(n => n.language?.name === 'fr');
    return fr?.name || fallback;
}

// Conversion d'un nom PokeAPI vers le format Pokémon Showdown
// nidoran-m → nidoranm, mr-mime → mrmime, farfetch'd reste tel quel
function showdownName(name) {
    return name.toLowerCase().replace(/[-.\s']/g, '');
}

// URLs des sprites Showdown (animés) — front, back, et variantes shinies
export function showdownSprites(name) {
    const slug = showdownName(name);
    return {
        front: `${SHOWDOWN_BASE}/ani/${slug}.gif`,
        frontShiny: `${SHOWDOWN_BASE}/ani-shiny/${slug}.gif`,
        back: `${SHOWDOWN_BASE}/ani-back/${slug}.gif`,
        backShiny: `${SHOWDOWN_BASE}/ani-back-shiny/${slug}.gif`,
        // Mini-sprite statique pour la liste des routes / équipe
        mini: `${SHOWDOWN_BASE}/gen5/${slug}.png`,
        miniShiny: `${SHOWDOWN_BASE}/gen5-shiny/${slug}.png`
    };
}

// Traduction FR des types Pokémon
export const TYPE_FR = {
    normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik',
    grass: 'Plante', ice: 'Glace', fighting: 'Combat', poison: 'Poison',
    ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
    rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres',
    steel: 'Acier', fairy: 'Fée'
};

// Calcule les stats d'un Pokémon à un niveau donné (formule Gen 1 simplifiée)
function computeStats(base, level) {
    return {
        maxHp: Math.floor(((2 * base.hp + 30) * level) / 100) + level + 10,
        attack: Math.floor(((2 * base.attack + 30) * level) / 100) + 5,
        defense: Math.floor(((2 * base.defense + 30) * level) / 100) + 5,
        speed: Math.floor(((2 * base.speed + 30) * level) / 100) + 5
    };
}

// EXP nécessaire pour atteindre le niveau suivant (courbe simple)
export function expToNextLevel(level) {
    return Math.floor(40 + level * 25);
}

// EXP gagnée en battant un Pokémon
export function expGained(enemyLevel, baseExp = 60) {
    return Math.floor((baseExp * enemyLevel) / 7);
}

// Recalcule les stats d'un Pokémon après un level up (conserve le ratio HP)
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

// Construit un Pokémon de combat normalisé pour le jeu
export async function buildBattlePokemon(nameOrId, level = 5, opts = {}) {
    const raw = await getPokemon(nameOrId);

    // Filtre Gen 1 : on ne garde que les Pokémon avec ID <= 151
    if (raw.id > 151) {
        throw new Error(`${raw.name} n'est pas de la Génération I`);
    }

    // Récupération du nom français + base experience via species
    let nameFr = raw.name;
    let captureRate = 190;
    try {
        const species = await getSpecies(raw.id);
        nameFr = getFrenchName(species.names, raw.name);
        captureRate = species.capture_rate || 190;
    } catch (e) {
        // Fallback silencieux
    }

    // Stats de base
    const base = {};
    raw.stats.forEach(s => { base[s.stat.name] = s.base_stat; });

    const stats = computeStats(base, level);

    // Sélection des attaques apprenables au level-up dans Red/Blue
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

    // Détails de chaque attaque + nom français (sans PP en v1.2)
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

    // Sprites : Showdown animés en priorité, fallback PokeAPI
    const showdown = showdownSprites(raw.name);
    const fallbackSprite = raw.sprites.front_default || '';
    const fallbackBack = raw.sprites.back_default || fallbackSprite;

    // Shiny : taux 1/8192 (sauf si forcé via opts)
    const isShiny = opts.forceShiny ?? (Math.random() < 1 / SHINY_RATE);

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
        // Sprites animés
        sprite: isShiny ? showdown.frontShiny : showdown.front,
        backSprite: isShiny ? showdown.backShiny : showdown.back,
        miniSprite: isShiny ? showdown.miniShiny : showdown.mini,
        spriteFallback: fallbackSprite,
        backSpriteFallback: fallbackBack,
        captureRate,
        isShiny,
        // Système d'EXP
        exp: 0,
        expToNext: expToNextLevel(level),
        baseExp: 60
    };
}

// Pool propre Gen 1 - Route 1 (legacy, conservé pour compatibilité)
export const GEN1_WILD_POOL = ['pidgey', 'rattata', 'caterpie', 'weedle', 'spearow'];

// Champion de fin (Pokémon plus costauds, toujours Gen 1)
export const CHAMPION_POKEMON = ['onix', 'machop', 'geodude'];

// === ROUTES DE KANTO ===
// Chaque route a un pool de Pokémon, une fourchette de niveaux, et un seuil de victoires requis
export const ROUTES = [
    {
        id: 'route-1',
        name: 'Route 1',
        desc: 'Une route paisible aux herbes hautes. Idéal pour débuter.',
        icon: '🌿',
        pool: ['pidgey', 'rattata'],
        levelMin: 2,
        levelMax: 4,
        requires: 0
    },
    {
        id: 'viridian-forest',
        name: 'Forêt de Jade',
        desc: 'Une forêt dense peuplée d\'insectes et d\'un Pokémon électrique légendaire…',
        icon: '🌲',
        pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu'],
        levelMin: 4,
        levelMax: 6,
        requires: 2
    },
    {
        id: 'route-3',
        name: 'Route 3',
        desc: 'Sur le chemin du Mont Sélénite, des dresseurs et des oiseaux sauvages.',
        icon: '🏞️',
        pool: ['spearow', 'jigglypuff', 'mankey'],
        levelMin: 5,
        levelMax: 8,
        requires: 4
    },
    {
        id: 'mt-moon',
        name: 'Mont Sélénite',
        desc: 'Une grotte sombre où les Pokémon Roche prospèrent.',
        icon: '⛰️',
        pool: ['zubat', 'geodude', 'paras', 'clefairy'],
        levelMin: 6,
        levelMax: 9,
        requires: 6
    },
    {
        id: 'route-4',
        name: 'Route 4',
        desc: 'Une zone désertique où rôdent des serpents et des Pokémon Sol.',
        icon: '🏜️',
        pool: ['ekans', 'sandshrew', 'spearow', 'mankey'],
        levelMin: 8,
        levelMax: 11,
        requires: 8
    },
    {
        id: 'route-24',
        name: 'Route 24',
        desc: 'Une route fluviale réputée pour ses Pokémon variés et puissants.',
        icon: '🌊',
        pool: ['oddish', 'bellsprout', 'venonat', 'abra'],
        levelMin: 10,
        levelMax: 13,
        requires: 12
    }
];

// Récupère un aperçu (nom FR + mini-sprite) pour les Pokémon d'une route
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

// Starters de Gen 1
export const STARTERS = [
    {
        id: 1,
        name: 'bulbasaur',
        displayName: 'Bulbizarre',
        desc: 'Pokémon Plante/Poison équilibré, idéal pour les débutants. Ses attaques végétales prennent l\'avantage sur l\'eau et la roche.'
    },
    {
        id: 4,
        name: 'charmander',
        displayName: 'Salamèche',
        desc: 'Pokémon Feu rapide et puissant en attaque. Plus risqué, mais redoutable une fois maîtrisé.'
    },
    {
        id: 7,
        name: 'squirtle',
        displayName: 'Carapuce',
        desc: 'Pokémon Eau résistant grâce à sa carapace. Une option défensive solide pour explorer en sécurité.'
    }
];

export const PIKACHU_STARTER_NAME = 'pikachu';
