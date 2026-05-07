// Module d'accès à la PokeAPI (Génération I uniquement)
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

// Construit un Pokémon de combat normalisé pour le jeu
export async function buildBattlePokemon(nameOrId, level = 5) {
    const raw = await getPokemon(nameOrId);

    // Filtre Gen 1 : on ne garde que les Pokémon avec ID <= 151
    if (raw.id > 151) {
        throw new Error(`${raw.name} n'est pas de la Génération I`);
    }

    // Stats de base
    const stats = {};
    raw.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });

    // Calcul simplifié des PV en fonction du niveau
    // Formule simplifiée inspirée des jeux : ((2*base + 30) * niveau / 100) + niveau + 10
    const maxHp = Math.floor(((2 * stats.hp + 30) * level) / 100) + level + 10;
    const attack = Math.floor(((2 * stats.attack + 30) * level) / 100) + 5;
    const defense = Math.floor(((2 * stats.defense + 30) * level) / 100) + 5;
    const speed = Math.floor(((2 * stats.speed + 30) * level) / 100) + 5;

    // On sélectionne 4 attaques apprenables au niveau bas
    // (PokeAPI renvoie des centaines d'attaques par Pokémon, on filtre intelligemment)
    const candidateMoves = raw.moves
        .filter(m => {
            // On prend les attaques apprises par level-up dans Red/Blue à un niveau <= level + 5
            const detail = m.version_group_details.find(v => v.version_group.name === 'red-blue');
            if (!detail) return false;
            return detail.move_learn_method.name === 'level-up'
                && detail.level_learned_at > 0
                && detail.level_learned_at <= level + 5;
        })
        .map(m => m.move.name);

    // Si pas assez d'attaques, on complète avec les premières dispo
    let moveNames = candidateMoves.slice(0, 4);
    if (moveNames.length < 2) {
        moveNames = raw.moves.slice(0, 4).map(m => m.move.name);
    }

    // On charge les détails de chaque attaque
    const movesData = await Promise.all(
        moveNames.map(async (name) => {
            try {
                const move = await getMove(name);
                return {
                    name: move.name.replace(/-/g, ' '),
                    rawName: move.name,
                    power: move.power || 40, // Attaques de statut → 40 par défaut
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

    // Si vraiment aucune attaque trouvée, attaque par défaut
    if (moves.length === 0) {
        moves.push({
            name: 'tackle', rawName: 'tackle', power: 40, accuracy: 100,
            type: 'normal', pp: 35, currentPp: 35
        });
    }

    // Sprite : on privilégie le sprite officiel, fallback sur le sprite par défaut
    const sprite = raw.sprites.front_default
        || raw.sprites.other?.['official-artwork']?.front_default
        || '';
    const backSprite = raw.sprites.back_default || sprite;

    return {
        id: raw.id,
        name: raw.name,
        level,
        types: raw.types.map(t => t.type.name),
        maxHp,
        currentHp: maxHp,
        attack,
        defense,
        speed,
        moves,
        sprite,
        backSprite
    };
}

// Liste des Pokémon sauvages possibles sur la "Route 1" (Gen 1, faibles)
export const WILD_POKEMON_POOL = [
    'pidgey', 'rattata', 'caterpie', 'weedle',
    'spearow', 'sentret', 'nidoran-m', 'nidoran-f'
].filter(p => !['sentret'].includes(p)); // sentret est gen 2 → on le retire

// Pool propre Gen 1
export const GEN1_WILD_POOL = ['pidgey', 'rattata', 'caterpie', 'weedle', 'spearow'];

// Champion de fin (un Pokémon plus costaud, toujours Gen 1)
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

// Easter egg : Pikachu comme starter
export const PIKACHU_STARTER_NAME = 'pikachu';
