// Module d'accès à la PokeAPI (Génération I uniquement)
// Avec récupération des noms français
const API_BASE = 'https://pokeapi.co/api/v2';

const cache = new Map();

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

// Traduction FR des types Pokémon
export const TYPE_FR = {
    normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik',
    grass: 'Plante', ice: 'Glace', fighting: 'Combat', poison: 'Poison',
    ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
    rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres',
    steel: 'Acier', fairy: 'Fée'
};

// Construit un Pokémon de combat normalisé pour le jeu
export async function buildBattlePokemon(nameOrId, level = 5) {
    const raw = await getPokemon(nameOrId);

    // Filtre Gen 1 : on ne garde que les Pokémon avec ID <= 151
    if (raw.id > 151) {
        throw new Error(`${raw.name} n'est pas de la Génération I`);
    }

    // Récupération du nom français via species
    let nameFr = raw.name;
    try {
        const species = await getSpecies(raw.id);
        nameFr = getFrenchName(species.names, raw.name);
    } catch (e) {
        // Fallback silencieux sur le nom anglais
    }

    // Stats de base
    const stats = {};
    raw.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });

    // Calcul des PV en fonction du niveau
    const maxHp = Math.floor(((2 * stats.hp + 30) * level) / 100) + level + 10;
    const attack = Math.floor(((2 * stats.attack + 30) * level) / 100) + 5;
    const defense = Math.floor(((2 * stats.defense + 30) * level) / 100) + 5;
    const speed = Math.floor(((2 * stats.speed + 30) * level) / 100) + 5;

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

    // Détails de chaque attaque + nom français
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
                    type: move.type.name,
                    pp: move.pp || 10,
                    currentPp: move.pp || 10
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
            type: 'normal', pp: 35, currentPp: 35
        });
    }

    const sprite = raw.sprites.front_default
        || raw.sprites.other?.['official-artwork']?.front_default
        || '';
    const backSprite = raw.sprites.back_default || sprite;

    // Taux de capture (utilisé par species en théorie, mais on simplifie)
    let captureRate = 190; // valeur Gen 1 typique
    try {
        const species = await getSpecies(raw.id);
        captureRate = species.capture_rate || 190;
    } catch {}

    return {
        id: raw.id,
        name: raw.name,
        nameFr,
        level,
        types: raw.types.map(t => t.type.name),
        maxHp,
        currentHp: maxHp,
        attack,
        defense,
        speed,
        moves,
        sprite,
        backSprite,
        captureRate
    };
}

// Pool propre Gen 1 - Route 1 (Pokémon faciles)
export const GEN1_WILD_POOL = ['pidgey', 'rattata', 'caterpie', 'weedle', 'spearow'];

// Champion de fin (Pokémon plus costauds, toujours Gen 1)
export const CHAMPION_POKEMON = ['onix', 'machop', 'geodude'];

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
