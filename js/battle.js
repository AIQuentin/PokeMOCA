// Système de combat tour par tour simplifié
import { buildBattlePokemon, GEN1_WILD_POOL, CHAMPION_POKEMON } from './api.js';

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

// Difficulté abaissée : niveaux plus bas
export async function spawnWildPokemon() {
    const pool = GEN1_WILD_POOL;
    const name = pool[Math.floor(Math.random() * pool.length)];
    // Niveau 2-3 (au lieu de 4-5 avant)
    const level = 2 + Math.floor(Math.random() * 2);
    return buildBattlePokemon(name, level);
}

export async function spawnChampion() {
    const pool = CHAMPION_POKEMON;
    const name = pool[Math.floor(Math.random() * pool.length)];
    // Niveau 7 (au lieu de 8 avant)
    return buildBattlePokemon(name, 7);
}

// IA simple pour l'adversaire
export function pickEnemyMove(enemy, player) {
    const usable = enemy.moves.filter(m => m.currentPp > 0);
    if (usable.length === 0) return enemy.moves[0];
    if (Math.random() < 0.65) {
        return usable.reduce((best, m) => {
            const bestEff = (best.power || 0) * typeMultiplier(best.type, player.types);
            const mEff = (m.power || 0) * typeMultiplier(m.type, player.types);
            return mEff > bestEff ? m : best;
        });
    }
    return usable[Math.floor(Math.random() * usable.length)];
}

// Système de capture
// Probabilité simplifiée basée sur le HP restant et le captureRate du Pokémon
export function attemptCapture(pokemon, isChampionBattle = false) {
    if (isChampionBattle) {
        return { caught: false, reason: 'champion' };
    }

    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    // Plus le HP est bas, plus le taux est élevé
    // captureRate va de ~45 à ~255 sur PokeAPI
    const baseRate = pokemon.captureRate / 255; // 0 à 1
    // Bonus si Pokémon affaibli : jusqu'à +60%
    const hpBonus = (1 - hpRatio) * 0.6;
    const finalChance = Math.min(0.95, baseRate * 0.7 + hpBonus + 0.15);

    const success = Math.random() < finalChance;
    return { caught: success, chance: finalChance };
}
