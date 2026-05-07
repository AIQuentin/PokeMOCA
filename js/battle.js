// Système de combat tour par tour simplifié
import { buildBattlePokemon, GEN1_WILD_POOL, CHAMPION_POKEMON } from './api.js';

// Table d'efficacité des types (simplifiée, suffisante pour Gen 1)
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

// Calcul de dégâts simplifié (formule inspirée des jeux)
export function calculateDamage(attacker, defender, move) {
    const isCrit = Math.random() < 0.0625; // ~6% de critique
    const critMult = isCrit ? 1.5 : 1;

    const stab = attacker.types.includes(move.type) ? 1.5 : 1;
    const typeMult = typeMultiplier(move.type, defender.types);
    const random = 0.85 + Math.random() * 0.15; // 0.85 - 1.0

    const baseDamage = (((2 * attacker.level / 5 + 2) * move.power * (attacker.attack / defender.defense)) / 50) + 2;
    const damage = Math.floor(baseDamage * stab * typeMult * critMult * random);

    return {
        damage: Math.max(1, damage),
        isCrit,
        typeMult,
        effectiveness: typeMult > 1 ? 'super' : (typeMult < 1 && typeMult > 0 ? 'weak' : (typeMult === 0 ? 'none' : 'normal'))
    };
}

// Vérifie si l'attaque touche
export function attackHits(move) {
    return Math.random() * 100 < move.accuracy;
}

// Génère un Pokémon sauvage aléatoire (Gen 1 uniquement)
export async function spawnWildPokemon(level = 4) {
    const pool = GEN1_WILD_POOL;
    const name = pool[Math.floor(Math.random() * pool.length)];
    return buildBattlePokemon(name, level + Math.floor(Math.random() * 2));
}

// Génère le champion de fin
export async function spawnChampion(level = 8) {
    const pool = CHAMPION_POKEMON;
    const name = pool[Math.floor(Math.random() * pool.length)];
    return buildBattlePokemon(name, level);
}

// IA simple pour l'adversaire : choisit l'attaque la plus puissante (ou aléatoire)
export function pickEnemyMove(enemy, player) {
    const usable = enemy.moves.filter(m => m.currentPp > 0);
    if (usable.length === 0) return enemy.moves[0]; // Lutte par défaut
    // 70% : meilleure attaque, 30% : aléatoire
    if (Math.random() < 0.7) {
        return usable.reduce((best, m) => {
            const bestEff = (best.power || 0) * typeMultiplier(best.type, player.types);
            const mEff = (m.power || 0) * typeMultiplier(m.type, player.types);
            return mEff > bestEff ? m : best;
        });
    }
    return usable[Math.floor(Math.random() * usable.length)];
}
