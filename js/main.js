// Point d'entrée principal de PokeMOCA
import {
    buildBattlePokemon, STARTERS, PIKACHU_STARTER_NAME, TYPE_FR
} from './api.js';
import {
    calculateDamage, attackHits, spawnWildPokemon, spawnChampion,
    pickEnemyMove, attemptCapture
} from './battle.js';

// État global du jeu
const state = {
    mode: null,         // 'normal' | 'hardcore'
    trainerName: '',
    team: [],
    battlesWon: 0,
    requiredWins: 3,
    inBattle: false,
    currentBattle: null,
    easterEggTriggered: false,
    inventory: { pokeballs: 5 }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${id}`).classList.add('active');
    // Met à jour la sidebar nav active
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    if (id === 'screen-bag') $('#nav-bag').classList.add('active');
    else $('.nav-item[data-tab="game"]').classList.add('active');
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

function isEasterEggName(name) {
    const normalized = name.trim().toLowerCase();
    return normalized === 'sacha' || normalized === 'red' || normalized === 'ash';
}

function updateInventoryDisplay() {
    $('#pokeball-count').textContent = state.inventory.pokeballs;
    $('#pokeball-count-hub').textContent = state.inventory.pokeballs;
}

function setBagAvailable(available) {
    const navBag = $('#nav-bag');
    if (available) {
        navBag.disabled = false;
        navBag.classList.remove('disabled');
    } else {
        navBag.disabled = true;
        navBag.classList.add('disabled');
    }
}

// === Étape 0 : choix du mode ===
$$('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        state.mode = card.dataset.mode;
        const label = state.mode === 'hardcore' ? '💀 Hardcore' : '😊 Normal';
        $('#trainer-mode-display').textContent = `Dresseur • ${label}`;
        showScreen('screen-welcome');
    });
});

$('#btn-back-mode').addEventListener('click', () => {
    showScreen('screen-mode');
});

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
        showStarterScreenWithPikachu();
    } else {
        showStarterScreen();
    }
});

$('#trainer-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-validate-name').click();
});

// === Étape 2 : choix du starter ===
async function showStarterScreen() {
    showScreen('screen-starter');
    const grid = $('#starter-grid');
    grid.style.gridTemplateColumns = '';
    grid.style.maxWidth = '';
    $('.starter-header h2').textContent = 'Choisis ton premier Pokémon';
    $('.starter-header p').textContent = 'Trois Pokémon t\'attendent dans le laboratoire. Lequel deviendra ton compagnon ?';
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
            displayName: pikachu.nameFr || 'Pikachu',
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
        .map(t => `<span class="type-badge type-${t}">${TYPE_FR[t] || t}</span>`)
        .join('');

    const displayName = meta.displayName || pokemon.nameFr || pokemon.name;

    card.innerHTML = `
        <img src="${pokemon.sprite}" alt="${displayName}" loading="lazy">
        <div class="starter-name">${displayName}</div>
        <div class="starter-types">${types}</div>
        <div class="starter-desc">${meta.desc}</div>
    `;

    card.addEventListener('click', () => chooseStarter(pokemon, displayName));
    return card;
}

function chooseStarter(pokemon, displayName) {
    state.team = [pokemon];
    showToast(`Tu as choisi ${displayName} !`);
    setBagAvailable(true);
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
        div.className = 'team-member' + (p.currentHp <= 0 ? ' fainted' : '');
        const displayName = p.nameFr || p.name;
        const badge = p.currentHp <= 0 ? '💀' : '';
        div.innerHTML = `
            <img src="${p.sprite}" alt="${displayName}">
            <div class="team-member-info">
                <div class="team-member-name">${displayName}</div>
                <div class="team-member-hp">PV ${p.currentHp}/${p.maxHp} • Niv. ${p.level}</div>
            </div>
            <div class="team-member-badge">${badge}</div>
        `;
        roster.appendChild(div);
    });
    $('#team-count').textContent = state.team.length;

    // Progression
    $('#battles-won').textContent = state.battlesWon;
    const pct = Math.min(100, (state.battlesWon / state.requiredWins) * 100);
    $('#progress-fill').style.width = `${pct}%`;

    // Champion
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

    updateInventoryDisplay();
}

// Vérifie si toute l'équipe est K.O.
function isTeamWiped() {
    return state.team.every(p => p.currentHp <= 0);
}

// Soigne toute l'équipe
function healFullTeam() {
    state.team.forEach(p => {
        p.currentHp = p.maxHp;
        p.moves.forEach(m => { m.currentPp = m.pp; });
    });
}

// Premier Pokémon vivant
function getActivePokemon() {
    return state.team.find(p => p.currentHp > 0) || state.team[0];
}

// === Actions du hub ===
$('#action-explore').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. ! Va d\'abord au Centre Pokémon.');
        return;
    }
    await startBattle('wild');
});

$('#action-heal').addEventListener('click', () => {
    if (state.inBattle) return;
    healFullTeam();
    showToast('🏥 Ton équipe est complètement soignée !');
    refreshHub();
});

$('#action-champion').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (state.battlesWon < state.requiredWins) {
        showToast(`Tu dois d'abord gagner ${state.requiredWins} combats !`);
        return;
    }
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. ! Va d\'abord au Centre Pokémon.');
        return;
    }
    await startBattle('champion');
});

// === Étape 4 : Combat ===
async function startBattle(mode) {
    state.inBattle = true;
    const player = getActivePokemon();

    showScreen('screen-battle');
    $('#battle-log').innerHTML = '';
    $('#battle-actions').innerHTML = '';
    showBattleMenu();

    try {
        const enemy = mode === 'champion'
            ? await spawnChampion()
            : await spawnWildPokemon();

        state.currentBattle = { player, enemy, mode };

        const enemyName = enemy.nameFr || enemy.name;
        const playerName = player.nameFr || player.name;

        $('#enemy-name').textContent = enemyName;
        $('#enemy-level').textContent = `Niv. ${enemy.level}`;
        $('#enemy-sprite').src = enemy.sprite;
        $('#player-name').textContent = playerName;
        $('#player-level').textContent = `Niv. ${player.level}`;
        $('#player-sprite').src = player.backSprite;
        updateHpBar('enemy', enemy);
        updateHpBar('player', player);

        const intro = mode === 'champion'
            ? `Le Champion envoie ${enemyName} (Niv. ${enemy.level}) !`
            : `Un ${enemyName} sauvage de niveau ${enemy.level} apparaît !`;
        logBattle(intro);
    } catch (err) {
        console.error(err);
        logBattle('Erreur lors du démarrage du combat.');
    }
}

// === Menus de combat ===
function showBattleMenu() {
    $('#battle-menu').hidden = false;
    $('#battle-actions').hidden = true;
    $('#battle-bag').hidden = true;
}

function showAttackMenu() {
    $('#battle-menu').hidden = true;
    $('#battle-actions').hidden = false;
    $('#battle-bag').hidden = true;
    renderMoves();
}

function showBagMenu() {
    $('#battle-menu').hidden = true;
    $('#battle-actions').hidden = true;
    $('#battle-bag').hidden = false;
    updateInventoryDisplay();
    $('#use-pokeball').disabled = state.inventory.pokeballs <= 0;
}

$$('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'attack') showAttackMenu();
        else if (action === 'bag') showBagMenu();
        else if (action === 'flee') attemptFlee();
    });
});

$$('.btn-back-menu').forEach(btn => {
    btn.addEventListener('click', showBattleMenu);
});

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
                <span class="type-badge type-${move.type}">${TYPE_FR[move.type] || move.type}</span>
                Puiss. ${move.power} • PP ${move.currentPp}/${move.pp}
            </div>
        `;
        btn.addEventListener('click', () => playerTurn(i));
        actionsDiv.appendChild(btn);
    });
    // Bouton retour
    const back = document.createElement('button');
    back.className = 'btn btn-secondary btn-back-menu';
    back.style.gridColumn = '1 / -1';
    back.textContent = '← Retour';
    back.addEventListener('click', showBattleMenu);
    actionsDiv.appendChild(back);
}

function disableAllBattleButtons() {
    $$('#battle-actions .move-btn').forEach(b => b.disabled = true);
    $$('.menu-btn').forEach(b => b.disabled = true);
    $('#use-pokeball').disabled = true;
}

function enableBattleButtons() {
    $$('.menu-btn').forEach(b => b.disabled = false);
}

// === Tour du joueur (attaque) ===
async function playerTurn(moveIndex) {
    const { player, enemy } = state.currentBattle;
    const move = player.moves[moveIndex];
    if (move.currentPp <= 0) return;
    move.currentPp--;
    disableAllBattleButtons();

    const playerFirst = player.speed >= enemy.speed;

    if (playerFirst) {
        await executeMove(player, enemy, move, 'player', 'enemy', true);
        if (enemy.currentHp > 0) {
            await delay(700);
            const enemyMove = pickEnemyMove(enemy, player);
            enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
            await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
        }
    } else {
        const enemyMove = pickEnemyMove(enemy, player);
        enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
        if (player.currentHp > 0) {
            await delay(700);
            await executeMove(player, enemy, move, 'player', 'enemy', true);
        }
    }

    await checkBattleEnd();
}

async function executeMove(attacker, defender, move, attackerSide, defenderSide, isPlayerAttacker) {
    const attackerName = attacker.nameFr || attacker.name;
    logBattle(`${attackerName} utilise ${move.name} !`);
    await delay(500);

    if (!attackHits(move)) {
        logBattle(`L'attaque échoue !`);
        return;
    }

    const result = calculateDamage(attacker, defender, move, isPlayerAttacker);
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);

    const sprite = $(`#${defenderSide}-sprite`).parentElement;
    sprite.classList.add('shake');
    setTimeout(() => sprite.classList.remove('shake'), 300);

    updateHpBar(defenderSide, defender);

    if (result.isCrit) logBattle('Coup critique !');
    if (result.effectiveness === 'super') logBattle("C'est super efficace !");
    else if (result.effectiveness === 'weak') logBattle("Ce n'est pas très efficace…");
    else if (result.effectiveness === 'none') logBattle("Ça n'affecte pas l'adversaire !");
}

// === Tour du joueur (Pokéball) ===
$('#use-pokeball').addEventListener('click', async () => {
    if (state.inventory.pokeballs <= 0) return;
    await throwPokeball();
});

async function throwPokeball() {
    const { player, enemy, mode } = state.currentBattle;
    state.inventory.pokeballs--;
    updateInventoryDisplay();
    disableAllBattleButtons();

    const enemyName = enemy.nameFr || enemy.name;
    logBattle(`Tu lances une Pokéball sur ${enemyName} !`);

    // Mini animation : on fait shake l'ennemi 3x
    const sprite = $('.pokemon-sprite.enemy');
    for (let i = 0; i < 3; i++) {
        await delay(400);
        sprite.classList.add('shake');
        setTimeout(() => sprite.classList.remove('shake'), 300);
    }
    await delay(500);

    const result = attemptCapture(enemy, mode === 'champion');

    if (result.reason === 'champion') {
        logBattle(`Tu ne peux pas capturer le Pokémon du Champion !`);
        await delay(700);
        // L'ennemi attaque quand même
        const enemyMove = pickEnemyMove(enemy, player);
        enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
        await checkBattleEnd();
        return;
    }

    if (result.caught) {
        logBattle(`✨ Bravo ! ${enemyName} est capturé !`);
        await delay(900);
        captureSuccess(enemy);
        return;
    }

    logBattle(`Oh non ! ${enemyName} s'est échappé !`);
    await delay(700);
    // L'ennemi attaque
    if (enemy.currentHp > 0) {
        const enemyMove = pickEnemyMove(enemy, player);
        enemyMove.currentPp = Math.max(0, enemyMove.currentPp - 1);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
    }
    await checkBattleEnd();
}

function captureSuccess(enemy) {
    state.inBattle = false;
    if (state.team.length < 6) {
        // Soigne légèrement le Pokémon capturé
        enemy.currentHp = enemy.maxHp;
        state.team.push(enemy);
        showToast(`🎉 ${enemy.nameFr || enemy.name} rejoint ton équipe !`);
    } else {
        showToast(`Ton équipe est pleine ! Le Pokémon est relâché (Box PC bientôt disponible).`);
    }
    state.battlesWon++; // capture compte comme une victoire
    setTimeout(() => {
        refreshHub();
        showScreen('screen-hub');
    }, 1500);
}

// === Fuite ===
async function attemptFlee() {
    const { mode } = state.currentBattle;
    if (mode === 'champion') {
        showToast('Tu ne peux pas fuir face au Champion !');
        return;
    }
    disableAllBattleButtons();
    logBattle('Tu prends la fuite…');
    await delay(900);
    state.inBattle = false;
    showScreen('screen-hub');
    refreshHub();
}

// === Fin du combat ===
async function checkBattleEnd() {
    const { enemy, player, mode } = state.currentBattle;

    if (enemy.currentHp <= 0) {
        const enemyName = enemy.nameFr || enemy.name;
        logBattle(`${enemyName} est K.O. !`);
        await delay(900);
        endBattle('win');
        return;
    }

    if (player.currentHp <= 0) {
        const playerName = player.nameFr || player.name;
        logBattle(`${playerName} est K.O. !`);
        await delay(900);
        endBattle('lose');
        return;
    }

    enableBattleButtons();
    showBattleMenu();
}

function endBattle(outcome) {
    const { mode } = state.currentBattle;
    state.inBattle = false;

    if (outcome === 'win') {
        if (mode === 'champion') {
            showEnd('champion-win');
            return;
        }
        state.battlesWon++;
        setTimeout(() => {
            refreshHub();
            showScreen('screen-hub');
        }, 800);
    } else {
        // Défaite : action selon le mode
        if (isTeamWiped()) {
            if (state.mode === 'hardcore') {
                showEnd('hardcore-loss');
            } else {
                // Normal : on soigne et on retourne au hub
                healFullTeam();
                setTimeout(() => {
                    showToast('Ton équipe a été soignée au Centre Pokémon !');
                    refreshHub();
                    showScreen('screen-hub');
                }, 1200);
            }
        } else {
            // Il reste un Pokémon en vie : retour au hub
            setTimeout(() => {
                refreshHub();
                showScreen('screen-hub');
            }, 1200);
        }
    }
}

function showEnd(type) {
    showScreen('screen-end');
    const icon = $('#end-icon');
    const title = $('#end-title');
    const message = $('#end-message');

    if (type === 'champion-win') {
        icon.textContent = '🏆';
        title.textContent = `Bravo, Maître ${state.trainerName} !`;
        const starterName = state.team[0].nameFr || state.team[0].name;
        message.textContent = `Tu as vaincu le Champion avec ${starterName} ! Tu es désormais le Maître Pokémon de la région.`;
    } else if (type === 'hardcore-loss') {
        icon.textContent = '💀';
        title.textContent = 'Game Over — Mode Hardcore';
        message.textContent = 'Toute ton équipe est K.O. En mode Hardcore, l\'aventure se termine ici. Tente à nouveau !';
    }
}

$('#btn-restart').addEventListener('click', () => {
    state.mode = null;
    state.trainerName = '';
    state.team = [];
    state.battlesWon = 0;
    state.inBattle = false;
    state.currentBattle = null;
    state.easterEggTriggered = false;
    state.inventory = { pokeballs: 5 };
    $('#trainer-name').value = '';
    $('#trainer-card').hidden = true;
    setBagAvailable(false);
    showScreen('screen-mode');
});

// === Onglets sidebar ===
$$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.classList.contains('disabled') || item.disabled) {
            if (!item.disabled) {
                showToast('Cette fonctionnalité sera disponible dans une future mise à jour !');
            }
            return;
        }
        const tab = item.dataset.tab;
        if (tab === 'game') {
            if (state.team.length === 0) showScreen(state.mode ? 'screen-welcome' : 'screen-mode');
            else if (state.inBattle) showScreen('screen-battle');
            else showScreen('screen-hub');
        } else if (tab === 'bag') {
            updateInventoryDisplay();
            showScreen('screen-bag');
        }
    });
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Démarrage
showScreen('screen-mode');
