// Système de combat tour par tour simplifié
import {
    buildBattlePokemon, GEN1_WILD_POOL, CHAMPION_POKEMON, LOCATIONS,
    expGained, applyLevelUp
} from './api.js';

// Table d'efficacité des types (Gen 1)
const TYPE_CHART = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 }
};

function typeMultiplier(attackType, defenderTypes) {
    let mult = 1;
    for (const defType of defenderTypes) {
        const eff = TYPE_CHART[attackType]?.[defType];
        if (eff !== undefined) mult *= eff;
    }
    return mult;
}

// Calcul de dégâts (légèrement abaissé pour la difficulté)
export function calculateDamage(attacker, defender, move, isPlayerAttacker = true) {
    const isCrit = Math.random() < 0.0625;
    const critMult = isCrit ? 1.5 : 1;

    const stab = attacker.types.includes(move.type) ? 1.5 : 1;
    const typeMult = typeMultiplier(move.type, defender.types);
    const random = 0.85 + Math.random() * 0.15;

    let baseDamage = (((2 * attacker.level / 5 + 2) * move.power * (attacker.attack / defender.defense)) / 50) + 2;

    // Réduction de difficulté : les attaques ennemies font 25% de dégâts en moins
    if (!isPlayerAttacker) baseDamage *= 0.75;

    const damage = Math.floor(baseDamage * stab * typeMult * critMult * random);

    return {
        damage: Math.max(1, damage),
        isCrit,
        typeMult,
        effectiveness: typeMult > 1 ? 'super' : (typeMult < 1 && typeMult > 0 ? 'weak' : (typeMult === 0 ? 'none' : 'normal'))
    };
}

export function attackHits(move) {
    return Math.random() * 100 < move.accuracy;
}

// Sélectionne le meilleur move pour l'autobattle / l'IA ennemie
// Évalue chaque attaque par : power × STAB × multiplicateur de type
export function pickBestMove(attacker, defender) {
    let best = attacker.moves[0];
    let bestScore = -1;
    for (const m of attacker.moves) {
        const stab = attacker.types.includes(m.type) ? 1.5 : 1;
        const tm = typeMultiplier(m.type, defender.types);
        const score = (m.power || 0) * stab * tm;
        if (score > bestScore) {
            bestScore = score;
            best = m;
        }
    }
    return best;
}

// Spawn d'un Pokémon sauvage à partir d'une route (ou pool legacy)
export async function spawnWildPokemon(routeId = null) {
    let pool, levelMin, levelMax;
    if (routeId) {
        const route = LOCATIONS.find(r => r.id === routeId && r.type === 'route');
        if (route) {
            pool = route.pool;
            levelMin = route.levelMin;
            levelMax = route.levelMax;
        }
    }
    if (!pool) {
        pool = GEN1_WILD_POOL;
        levelMin = 2;
        levelMax = 3;
    }
    const name = pool[Math.floor(Math.random() * pool.length)];
    const level = levelMin + Math.floor(Math.random() * (levelMax - levelMin + 1));
    return buildBattlePokemon(name, level);
}

export async function spawnChampion() {
    const pool = CHAMPION_POKEMON;
    const name = pool[Math.floor(Math.random() * pool.length)];
    return buildBattlePokemon(name, 7, { noShiny: true });
}

// IA ennemie : 70% meilleur move, 30% aléatoire (pour rester surprenant)
export function pickEnemyMove(enemy, player) {
    if (Math.random() < 0.7) {
        return pickBestMove(enemy, player);
    }
    return enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
}

// Système de capture
// Probabilité simplifiée basée sur le HP restant et le captureRate du Pokémon
export function attemptCapture(pokemon, isChampionBattle = false) {
    if (isChampionBattle) {
        return { caught: false, reason: 'champion' };
    }

    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    const baseRate = pokemon.captureRate / 255;
    const hpBonus = (1 - hpRatio) * 0.6;
    const finalChance = Math.min(0.95, baseRate * 0.7 + hpBonus + 0.15);

    const success = Math.random() < finalChance;
    return { caught: success, chance: finalChance };
}

// Attribue de l'EXP au Pokémon et applique tous les level up déclenchés
// Retourne la liste des niveaux atteints (vide si pas de level up)
export function awardExp(pokemon, enemy) {
    const gain = expGained(enemy.level, enemy.baseExp || 60);
    return addExpAndLevel(pokemon, gain);
}

function addExpAndLevel(pokemon, gain) {
    pokemon.exp += gain;
    const levelUps = [];
    while (pokemon.exp >= pokemon.expToNext && pokemon.level < 100) {
        pokemon.exp -= pokemon.expToNext;
        applyLevelUp(pokemon);
        levelUps.push(pokemon.level);
    }
    return { gain, levelUps };
}

// Multi-EXP partagé : 50 % au combattant actif, 50 % partagé entre les autres valides.
// Si le combattant actif est seul valide, il reçoit 100 %.
// Retourne un tableau [{ pokemon, gain, levelUps }] (un par bénéficiaire).
export function awardExpToTeam(team, active, enemy) {
    const totalGain = expGained(enemy.level, enemy.baseExp || 60);
    const others = team.filter(p => p !== active && p.currentHp > 0);
    const results = [];

    if (others.length === 0) {
        const r = addExpAndLevel(active, totalGain);
        results.push({ pokemon: active, ...r });
        return results;
    }

    const activeShare = Math.max(1, Math.floor(totalGain * 0.5));
    const otherShare = Math.max(1, Math.floor((totalGain * 0.5) / others.length));

    const ra = addExpAndLevel(active, activeShare);
    results.push({ pokemon: active, ...ra });

    for (const p of others) {
        const r = addExpAndLevel(p, otherShare);
        results.push({ pokemon: p, ...r });
    }
    return results;
}
