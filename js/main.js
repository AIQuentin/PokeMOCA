// Point d'entrée principal de PokeMOCA
import {
    buildBattlePokemon, STARTERS, PIKACHU_STARTER_NAME
} from './api.js';
import {
    calculateDamage, attackHits, spawnWildPokemon, spawnChampion, pickEnemyMove
} from './battle.js';

// État global du jeu
const state = {
    trainerName: '',
    team: [],          // Équipe du joueur (max 6)
    battlesWon: 0,
    requiredWins: 3,
    inBattle: false,
    currentBattle: null,
    easterEggTriggered: false
};

// === Helpers DOM ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${id}`).classList.add('active');
}

function showToast(message, duration = 4000) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, duration);
}

function logBattle(message) {
    const log = $('#battle-log');
    const p = document.createElement('p');
    p.textContent = message;
    log.appendChild(p);
    // Garde seulement les 4 derniers messages
    while (log.children.length > 4) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
}

function updateHpBar(prefix, pokemon) {
    const fill = $(`#${prefix}-hp-fill`);
    const text = $(`#${prefix}-hp-text`);
    const pct = (pokemon.currentHp / pokemon.maxHp) * 100;
    fill.style.width = `${pct}%`;
    fill.classList.remove('medium', 'low');
    if (pct < 25) fill.classList.add('low');
    else if (pct < 50) fill.classList.add('medium');
    text.textContent = `${pokemon.currentHp}/${pokemon.maxHp}`;
}

// === Easter egg : déclenché par le nom du dresseur ===
function isEasterEggName(name) {
    const normalized = name.trim().toLowerCase();
    return normalized === 'sacha' || normalized === 'red' || normalized === 'ash';
}

// === Étape 1 : nom du dresseur ===
$('#btn-validate-name').addEventListener('click', () => {
    const name = $('#trainer-name').value.trim();
    if (name.length < 2) {
        showToast('Ton nom doit contenir au moins 2 caractères !');
        return;
    }
    state.trainerName = name;
    $('#trainer-name-display').textContent = name;
    $('#trainer-card').hidden = false;

    if (isEasterEggName(name)) {
        state.easterEggTriggered = true;
        // On affiche directement Pikachu comme starter unique offert
        showStarterScreenWithPikachu();
    } else {
        showStarterScreen();
    }
});

// Permet de valider avec Entrée
$('#trainer-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-validate-name').click();
});

// === Étape 2 : choix du starter (cas normal) ===
async function showStarterScreen() {
    showScreen('screen-starter');
    const grid = $('#starter-grid');
    grid.innerHTML = '<div class="starter-loading">Chargement des starters…</div>';

    try {
        const starters = await Promise.all(
            STARTERS.map(s => buildBattlePokemon(s.name, 5))
        );
        grid.innerHTML = '';
        starters.forEach((pokemon, i) => {
            const meta = STARTERS[i];
            const card = createStarterCard(pokemon, meta);
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = `<div class="starter-loading">Erreur de chargement. Vérifie ta connexion à PokeAPI.</div>`;
        console.error(err);
    }
}

// === Étape 2bis : easter egg Pikachu ===
async function showStarterScreenWithPikachu() {
    showScreen('screen-starter');
    $('.starter-header h2').textContent = 'Tiens, c\'est toi…';
    $('.starter-header p').textContent =
        `Le Professeur Chen avait un Pokémon réservé spécialement pour toi, ${state.trainerName} !`;

    const grid = $('#starter-grid');
    grid.innerHTML = '<div class="starter-loading">Quelqu\'un t\'attend…</div>';
    grid.style.gridTemplateColumns = '1fr';
    grid.style.maxWidth = '420px';

    try {
        const pikachu = await buildBattlePokemon(PIKACHU_STARTER_NAME, 5);
        const meta = {
            name: 'pikachu',
            displayName: 'Pikachu',
            desc: 'Comme dans l\'anime ! Ton compagnon électrique inséparable. Petit mais redoutable.'
        };
        grid.innerHTML = '';
        grid.appendChild(createStarterCard(pikachu, meta));
        showToast('⚡ Easter egg : tu as débloqué Pikachu en starter !', 5000);
    } catch (err) {
        grid.innerHTML = `<div class="starter-loading">Erreur de chargement.</div>`;
        console.error(err);
    }
}

function createStarterCard(pokemon, meta) {
    const card = document.createElement('div');
    card.className = 'starter-card';

    const types = pokemon.types
        .map(t => `<span class="type-badge type-${t}">${t}</span>`)
        .join('');

    card.innerHTML = `
        <img src="${pokemon.sprite}" alt="${pokemon.name}" loading="lazy">
        <div class="starter-name">${meta.displayName}</div>
        <div class="starter-types">${types}</div>
        <div class="starter-desc">${meta.desc}</div>
    `;

    card.addEventListener('click', () => chooseStarter(pokemon));
    return card;
}

function chooseStarter(pokemon) {
    state.team = [pokemon];
    showToast(`Tu as choisi ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} !`);
    enterHub();
}

// === Étape 3 : Hub ===
function enterHub() {
    showScreen('screen-hub');
    refreshHub();
}

function refreshHub() {
    // Roster
    const roster = $('#team-roster');
    roster.innerHTML = '';
    state.team.forEach(p => {
        const div = document.createElement('div');
        div.className = 'team-member';
        div.innerHTML = `
            <img src="${p.sprite}" alt="${p.name}">
            <div class="team-member-info">
                <div class="team-member-name">${p.name}</div>
                <div class="team-member-hp">PV ${p.currentHp}/${p.maxHp} • Niv. ${p.level}</div>
            </div>
        `;
        roster.appendChild(div);
    });

    // Progression
    $('#battles-won').textContent = state.battlesWon;
    const pct = Math.min(100, (state.battlesWon / state.requiredWins) * 100);
    $('#progress-fill').style.width = `${pct}%`;

    // Champion débloqué ?
    const championCard = $('#action-champion');
    if (state.battlesWon >= state.requiredWins) {
        championCard.classList.add('primary');
        championCard.classList.remove('disabled');
        $('#champion-desc').textContent = 'Tu es prêt(e) ! Affronte le Champion pour gagner.';
    } else {
        championCard.classList.remove('primary');
        $('#champion-desc').textContent =
            `Bats encore ${state.requiredWins - state.battlesWon} Pokémon sauvage(s)`;
    }
}

// Actions du hub
$('#action-explore').addEventListener('click', async () => {
    if (state.inBattle) return;
    await startBattle('wild');
});

$('#action-champion').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (state.battlesWon < state.requiredWins) {
        showToast(`Tu dois d'abord gagner ${state.requiredWins} combats !`);
        return;
    }
    await startBattle('champion');
});

// === Étape 4 : Combat ===
async function startBattle(mode) {
    state.inBattle = true;

    // Soigner le starter avant le combat (gameplay rapide en v1)
    const player = state.team[0];
    player.currentHp = player.maxHp;
    player.moves.forEach(m => { m.currentPp = m.pp; });

    showScreen('screen-battle');
    $('#battle-log').innerHTML = '';
    $('#battle-actions').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ba3b4;">Chargement…</div>';

    try {
        const enemy = mode === 'champion'
            ? await spawnChampion(8)
            : await spawnWildPokemon(4);

        state.currentBattle = { player, enemy, mode };

        // UI
        $('#enemy-name').textContent = enemy.name;
        $('#enemy-sprite').src = enemy.sprite;
        $('#player-name').textContent = player.name;
        $('#player-level').textContent = `Niv. ${player.level}`;
        $('#player-sprite').src = player.backSprite;
        updateHpBar('enemy', enemy);
        updateHpBar('player', player);

        const intro = mode === 'champion'
            ? `Le Champion envoie ${enemy.name.toUpperCase()} !`
            : `Un ${enemy.name.toUpperCase()} sauvage apparaît !`;
        logBattle(intro);
        renderMoves();
    } catch (err) {
        console.error(err);
        logBattle('Erreur lors du démarrage du combat.');
    }
}

function renderMoves() {
    const actionsDiv = $('#battle-actions');
    actionsDiv.innerHTML = '';
    const { player } = state.currentBattle;
    player.moves.forEach((move, i) => {
        const btn = document.createElement('button');
        btn.className = 'move-btn';
        btn.disabled = move.currentPp <= 0;
        btn.innerHTML = `
            <div class="move-name">${move.name}</div>
            <div class="move-meta">
                <span class="type-badge type-${move.type}">${move.type}</span>
                Puiss. ${move.power} • PP ${move.currentPp}/${move.pp}
            </div>
        `;
        btn.addEventListener('click', () => playerTurn(i));
        actionsDiv.appendChild(btn);
    });
}

async function playerTurn(moveIndex) {
    const { player, enemy } = state.currentBattle;
    const move = player.moves[moveIndex];

    if (move.currentPp <= 0) return;
    move.currentPp--;

    // Désactive les boutons pendant l'animation
    $$('#battle-actions .move-btn').forEach(b => b.disabled = true);

    // Tour basé sur la vitesse
    const playerFirst = player.speed >= enemy.speed;

    if (playerFirst) {
        await executeMove(player, enemy, move, 'player', 'enemy');
        if (enemy.currentHp > 0) {
            const enemyMove = pickEnemyMove(enemy, player);
            enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
            await delay(700);
            await executeMove(enemy, player, enemyMove, 'enemy', 'player');
        }
    } else {
        const enemyMove = pickEnemyMove(enemy, player);
        enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player');
        if (player.currentHp > 0) {
            await delay(700);
            await executeMove(player, enemy, move, 'player', 'enemy');
        }
    }

    // Vérifie la fin du combat
    if (enemy.currentHp <= 0) {
        await delay(800);
        endBattle('win');
    } else if (player.currentHp <= 0) {
        await delay(800);
        endBattle('lose');
    } else {
        renderMoves();
    }
}

async function executeMove(attacker, defender, move, attackerSide, defenderSide) {
    logBattle(`${attacker.name.toUpperCase()} utilise ${move.name.toUpperCase()} !`);
    await delay(500);

    if (!attackHits(move)) {
        logBattle(`L'attaque échoue !`);
        return;
    }

    const result = calculateDamage(attacker, defender, move);
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);

    // Animation : shake du défenseur
    const sprite = $(`#${defenderSide}-sprite`).parentElement;
    sprite.classList.add('shake');
    setTimeout(() => sprite.classList.remove('shake'), 300);

    updateHpBar(defenderSide, defender);

    if (result.isCrit) logBattle('Coup critique !');
    if (result.effectiveness === 'super') logBattle("C'est super efficace !");
    else if (result.effectiveness === 'weak') logBattle('Ce n\'est pas très efficace…');
    else if (result.effectiveness === 'none') logBattle('Ça n\'affecte pas l\'adversaire !');
}

function endBattle(outcome) {
    const { mode, enemy } = state.currentBattle;
    state.inBattle = false;

    if (outcome === 'win') {
        if (mode === 'champion') {
            // Victoire finale
            showEnd('champion-win');
            return;
        }
        state.battlesWon++;
        logBattle(`Tu as battu ${enemy.name.toUpperCase()} !`);
        setTimeout(() => {
            refreshHub();
            showScreen('screen-hub');
        }, 1500);
    } else {
        // Défaite
        showEnd(mode === 'champion' ? 'champion-lose' : 'wild-lose');
    }
}

function showEnd(type) {
    showScreen('screen-end');
    const card = $('#end-card');
    const icon = $('#end-icon');
    const title = $('#end-title');
    const message = $('#end-message');

    if (type === 'champion-win') {
        icon.textContent = '🏆';
        title.textContent = `Bravo, Maître ${state.trainerName} !`;
        message.textContent = `Tu as vaincu le Champion avec ${state.team[0].name.toUpperCase()} ! Tu es désormais le Maître Pokémon de la région.`;
    } else if (type === 'champion-lose') {
        icon.textContent = '😢';
        title.textContent = 'Le Champion était trop fort…';
        message.textContent = 'Mais ne te décourage pas, tente ta chance à nouveau !';
    } else {
        icon.textContent = '💀';
        title.textContent = 'Ton Pokémon est K.O. !';
        message.textContent = 'Retourne au Centre Pokémon… ah, il n\'y en a pas encore. Tente une nouvelle aventure !';
    }
}

$('#btn-restart').addEventListener('click', () => {
    // Reset complet
    state.trainerName = '';
    state.team = [];
    state.battlesWon = 0;
    state.inBattle = false;
    state.currentBattle = null;
    state.easterEggTriggered = false;
    $('#trainer-name').value = '';
    $('#trainer-card').hidden = true;
    // Réinitialise le titre des starters
    $('.starter-header h2').textContent = 'Choisis ton premier Pokémon';
    $('.starter-header p').textContent = 'Trois Pokémon t\'attendent dans le laboratoire. Lequel deviendra ton compagnon ?';
    $('#starter-grid').style.gridTemplateColumns = '';
    $('#starter-grid').style.maxWidth = '';
    showScreen('screen-welcome');
});

// === Onglets de la sidebar ===
$$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.classList.contains('disabled')) {
            showToast('Cette fonctionnalité sera disponible dans une future mise à jour !');
            return;
        }
        const tab = item.dataset.tab;
        if (tab === 'game') {
            // Retour à l'écran approprié selon l'état
            if (state.team.length === 0) showScreen('screen-welcome');
            else if (state.inBattle) showScreen('screen-battle');
            else showScreen('screen-hub');
        }
    });
});

// === Utilitaires ===
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Démarrage
showScreen('screen-welcome');
