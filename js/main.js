// Point d'entrée principal de PokeMOCA
import {
    buildBattlePokemon, STARTERS, PIKACHU_STARTER_NAME, TYPE_FR,
    ROUTES, getRoutePokemonPreview, showdownSprites,
    GEN1_IDS, getDexSpriteUrl, getMaxChainSize
} from './api.js';
import {
    calculateDamage, attackHits, spawnWildPokemon, spawnChampion,
    pickEnemyMove, pickBestMove, attemptCapture, awardExp
} from './battle.js';
import { VERSION, CODENAME, PATCH_NOTES, ROADMAP } from './version.js';

// === Persistance ===
const STORAGE_KEYS = {
    pokedex: 'pokemoca_pokedex',
    seen: 'pokemoca_pokedex_seen',
    options: 'pokemoca_options'
};

function loadPokedex() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.pokedex);
        if (!raw) return new Map();
        const arr = JSON.parse(raw);
        return new Map(arr.map(e => [e.id, e]));
    } catch { return new Map(); }
}

function savePokedex(map) {
    try {
        localStorage.setItem(STORAGE_KEYS.pokedex, JSON.stringify([...map.values()]));
    } catch {}
}

function loadSeen() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.seen);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw));
    } catch { return new Set(); }
}

function saveSeen(set) {
    try {
        localStorage.setItem(STORAGE_KEYS.seen, JSON.stringify([...set]));
    } catch {}
}

const DEFAULT_OPTIONS = {
    theme: 'light',
    autoBattleDefault: false,
    autoCapture: false,
    battleSpeed: 'normal'
};

function loadOptions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.options);
        if (!raw) return { ...DEFAULT_OPTIONS };
        return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
    } catch { return { ...DEFAULT_OPTIONS }; }
}

function saveOptions(opts) {
    try {
        localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(opts));
    } catch {}
}

// État global du jeu
const state = {
    mode: null,
    trainerName: '',
    team: [],
    battlesWon: 0,
    requiredWins: 3,
    inBattle: false,
    currentBattle: null,
    easterEggTriggered: false,
    inventory: { pokeballs: 5 },
    currentRoute: 'route-1',
    autobattle: false,
    reorderMode: false,
    pokedex: loadPokedex(),
    pokedexSeen: loadSeen(),
    options: loadOptions(),
    chain: { remaining: 0, total: 0 },
    chainSize: 1,
    dexFilter: 'all'
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// === Vitesse de combat ===
function speedMultiplier() {
    if (state.options.battleSpeed === 'slow') return 1.6;
    if (state.options.battleSpeed === 'fast') return 0.45;
    return 1;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * speedMultiplier()));
}

// === Thème ===
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    $$('.theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
    });
}

function applySpeedUI() {
    $$('.speed-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.speed === state.options.battleSpeed);
    });
}

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${id}`).classList.add('active');
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    if (id === 'screen-bag') $('#nav-bag')?.classList.add('active');
    else if (id === 'screen-map') $('#nav-map')?.classList.add('active');
    else if (id === 'screen-pokedex') $('#nav-pokedex')?.classList.add('active');
    else if (id === 'screen-options') $('.nav-item[data-tab="options"]')?.classList.add('active');
    else if (id === 'screen-patchnotes') $('.nav-item[data-tab="patchnotes"]')?.classList.add('active');
    else $('.nav-item[data-tab="game"]')?.classList.add('active');
}

function showToast(message, duration = 4000) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, duration);
}

function logBattle(message, cls = '') {
    const log = $('#battle-log');
    const p = document.createElement('p');
    p.textContent = message;
    if (cls) p.classList.add(cls);
    log.appendChild(p);
    while (log.children.length > 5) log.removeChild(log.firstChild);
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

function updateExpBar(pokemon) {
    const fill = $('#player-exp-fill');
    if (!fill) return;
    const pct = (pokemon.exp / pokemon.expToNext) * 100;
    fill.style.width = `${Math.min(100, pct)}%`;
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
    [$('#nav-bag'), $('#nav-map')].forEach(navBtn => {
        if (!navBtn) return;
        if (available) {
            navBtn.disabled = false;
            navBtn.classList.remove('disabled');
        } else {
            navBtn.disabled = true;
            navBtn.classList.add('disabled');
        }
    });
}

function updateDexBadge() {
    const badge = $('#dex-badge');
    if (badge) badge.textContent = state.pokedex.size;
}

// === Étape 0 : choix du mode ===
$$('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        state.mode = card.dataset.mode;
        const label = state.mode === 'hardcore' ? 'Hardcore' : 'Normal';
        $('#trainer-mode-display').textContent = `Dresseur · ${label}`;
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
        showToast('Ton nom doit contenir au moins 2 caractères.');
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
        grid.innerHTML = `<div class="starter-loading">Erreur de chargement. Vérifie ta connexion.</div>`;
        console.error(err);
    }
}

async function showStarterScreenWithPikachu() {
    showScreen('screen-starter');
    $('.starter-header h2').textContent = 'Tiens, c\'est toi…';
    $('.starter-header p').textContent =
        `Le Professeur Chen avait un Pokémon réservé spécialement pour toi, ${state.trainerName}.`;

    const grid = $('#starter-grid');
    grid.innerHTML = '<div class="starter-loading">Quelqu\'un t\'attend…</div>';
    grid.style.gridTemplateColumns = '1fr';
    grid.style.maxWidth = '420px';

    try {
        const pikachu = await buildBattlePokemon(PIKACHU_STARTER_NAME, 5);
        const meta = {
            name: 'pikachu',
            displayName: pikachu.nameFr || 'Pikachu',
            desc: 'Comme dans l\'anime. Ton compagnon électrique inséparable. Petit mais redoutable.'
        };
        grid.innerHTML = '';
        grid.appendChild(createStarterCard(pikachu, meta));
        showToast('Easter egg : tu as débloqué Pikachu en starter.', 5000);
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
    const spriteSrc = pokemon.sprite || pokemon.spriteFallback;

    card.innerHTML = `
        <img src="${spriteSrc}" alt="${displayName}" loading="lazy"
             onerror="this.onerror=null;this.src='${pokemon.spriteFallback}'">
        <div class="starter-name">${displayName}</div>
        <div class="starter-types">${types}</div>
        <div class="starter-desc">${meta.desc}</div>
    `;

    card.addEventListener('click', () => chooseStarter(pokemon, displayName));
    return card;
}

function chooseStarter(pokemon, displayName) {
    state.team = [pokemon];
    // Le starter rejoint le Pokédex
    addToPokedex(pokemon);
    showToast(`Tu as choisi ${displayName}.`);
    setBagAvailable(true);
    enterHub();
}

// === Pokédex helpers ===
function addToPokedex(pokemon) {
    const existing = state.pokedex.get(pokemon.id);
    state.pokedex.set(pokemon.id, {
        id: pokemon.id,
        nameFr: pokemon.nameFr || pokemon.name,
        name: pokemon.name,
        types: pokemon.types,
        isShiny: existing?.isShiny || pokemon.isShiny || false
    });
    state.pokedexSeen.add(pokemon.id);
    savePokedex(state.pokedex);
    saveSeen(state.pokedexSeen);
    updateDexBadge();
}

function markSeen(pokemon) {
    state.pokedexSeen.add(pokemon.id);
    saveSeen(state.pokedexSeen);
}

// === Étape 3 : Hub ===
function enterHub() {
    showScreen('screen-hub');
    refreshHub();
}

function refreshHub() {
    // Route actuelle
    const route = ROUTES.find(r => r.id === state.currentRoute) || ROUTES[0];
    $('#hub-route-name').textContent = route.name;
    $('#hub-route-desc').textContent = route.desc;

    // Roster
    renderRoster();

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
        $('#champion-desc').textContent = 'Tu es prêt(e). Affronte le Champion pour gagner.';
    } else {
        championCard.classList.remove('primary');
        $('#champion-desc').textContent =
            `Bats encore ${state.requiredWins - state.battlesWon} Pokémon sauvage(s)`;
    }

    updateInventoryDisplay();
    renderChainControls();
}

function renderRoster() {
    const roster = $('#team-roster');
    roster.innerHTML = '';
    state.team.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'team-member'
            + (p.currentHp <= 0 ? ' fainted' : '')
            + (p.isShiny ? ' shiny' : '');
        const displayName = p.nameFr || p.name;
        const expPct = (p.exp / p.expToNext) * 100;
        const miniSrc = p.miniSprite || p.spriteFallback;
        const star = p.isShiny ? '<span class="shiny-star">★</span>' : '';
        const badge = p.currentHp <= 0 ? '<span style="color:var(--text-dim);font-size:11px">K.O.</span>' : '';

        let reorderHtml = '';
        if (state.reorderMode && state.team.length > 1) {
            reorderHtml = `
                <div class="team-reorder">
                    <button class="reorder-btn" data-dir="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                    <button class="reorder-btn" data-dir="down" data-idx="${idx}" ${idx === state.team.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
            `;
        }

        div.innerHTML = `
            <img src="${miniSrc}" alt="${displayName}"
                 onerror="this.onerror=null;this.src='${p.spriteFallback}'">
            <div class="team-member-info">
                <div class="team-member-name">${displayName} ${star}</div>
                <div class="team-member-hp">PV ${p.currentHp}/${p.maxHp} · Niv. ${p.level}</div>
                <div class="exp-mini-bar"><div class="exp-mini-fill" style="width:${expPct}%"></div></div>
            </div>
            ${reorderHtml || badge}
        `;
        roster.appendChild(div);
    });

    if (state.reorderMode) {
        $$('.reorder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                const dir = btn.dataset.dir === 'up' ? -1 : 1;
                const newIdx = idx + dir;
                if (newIdx < 0 || newIdx >= state.team.length) return;
                const tmp = state.team[idx];
                state.team[idx] = state.team[newIdx];
                state.team[newIdx] = tmp;
                renderRoster();
            });
        });
    }
}

$('#btn-toggle-reorder').addEventListener('click', () => {
    state.reorderMode = !state.reorderMode;
    $('#btn-toggle-reorder').textContent = state.reorderMode ? 'Terminer' : 'Réorganiser';
    renderRoster();
});

// === Chaînes de combats ===
function renderChainControls() {
    const container = $('#chain-controls');
    if (!container) return;
    const max = getMaxChainSize(state.battlesWon);
    container.innerHTML = '';

    if (state.chainSize > max) state.chainSize = max;

    for (let i = 1; i <= 7; i++) {
        const btn = document.createElement('button');
        btn.className = 'chain-btn' + (state.chainSize === i ? ' active' : '');
        btn.textContent = `×${i}`;
        if (i > max) {
            btn.disabled = true;
            const need = i === 4 ? 3 : i === 5 ? 6 : i === 6 ? 10 : 15;
            btn.title = `Débloqué à ${need} victoires`;
        } else {
            btn.addEventListener('click', () => {
                state.chainSize = i;
                renderChainControls();
            });
        }
        container.appendChild(btn);
    }

    const hint = $('#chain-hint');
    if (hint) {
        if (state.chainSize === 1) {
            hint.textContent = 'Combat unique';
        } else {
            hint.textContent = `${state.chainSize} combats sans soin`;
        }
    }
}

function isTeamWiped() {
    return state.team.every(p => p.currentHp <= 0);
}

function healFullTeam() {
    state.team.forEach(p => {
        p.currentHp = p.maxHp;
    });
}

function getActivePokemon() {
    return state.team.find(p => p.currentHp > 0) || state.team[0];
}

// === Actions du hub ===
$('#action-explore').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. Va d\'abord au Centre Pokémon.');
        return;
    }
    // Démarre la chaîne
    state.chain.total = state.chainSize;
    state.chain.remaining = state.chainSize;
    await startBattle('wild');
});

$('#action-map').addEventListener('click', () => {
    if (state.inBattle) return;
    showMapScreen();
});

$('#action-heal').addEventListener('click', () => {
    if (state.inBattle) return;
    healFullTeam();
    showToast('Ton équipe est complètement soignée.');
    refreshHub();
});

$('#action-champion').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (state.battlesWon < state.requiredWins) {
        showToast(`Tu dois d'abord gagner ${state.requiredWins} combats.`);
        return;
    }
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. Va d\'abord au Centre Pokémon.');
        return;
    }
    state.chain.total = 0;
    state.chain.remaining = 0;
    await startBattle('champion');
});

// === Carte de Kanto ===
async function showMapScreen() {
    showScreen('screen-map');
    const grid = $('#kanto-map');
    grid.innerHTML = '<div class="route-loading">Chargement des zones…</div>';

    const previews = await Promise.all(
        ROUTES.map(r => getRoutePokemonPreview(r.pool))
    );

    grid.innerHTML = '';
    ROUTES.forEach((route, i) => {
        const unlocked = state.battlesWon >= route.requires;
        const isCurrent = state.currentRoute === route.id;
        const card = document.createElement('div');
        card.className = 'route-card'
            + (isCurrent ? ' current' : '')
            + (!unlocked ? ' locked' : '');
        card.dataset.route = route.id;

        let tag = '';
        if (isCurrent) tag = '<span class="route-name-tag current">Actuelle</span>';
        else if (!unlocked) tag = `<span class="route-name-tag locked">${route.requires} victoires</span>`;

        const pokemonsHtml = previews[i].map(p => `
            <div class="route-poke" title="${p.nameFr}">
                <img src="${p.sprite}" alt="${p.nameFr}" loading="lazy">
                <span class="route-poke-name">${p.nameFr}</span>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="route-head">
                <div class="route-icon">${route.icon}</div>
                <div class="route-info">
                    <div class="route-name">${route.name}${tag}</div>
                    <div class="route-desc">${route.desc}</div>
                </div>
            </div>
            <div class="route-pokemons">
                <div class="route-pokemons-title">
                    <span>Pokémon capturables</span>
                    <span class="route-level-range">Niv. ${route.levelMin}–${route.levelMax}</span>
                </div>
                <div class="route-poke-list">${pokemonsHtml}</div>
            </div>
        `;

        if (unlocked) {
            card.addEventListener('click', () => selectRoute(route.id));
        }
        grid.appendChild(card);
    });
}

function selectRoute(routeId) {
    state.currentRoute = routeId;
    const route = ROUTES.find(r => r.id === routeId);
    showToast(`Direction ${route.name}.`);
    enterHub();
}

// === Étape 4 : Combat ===
async function startBattle(mode) {
    state.inBattle = true;
    const player = getActivePokemon();

    showScreen('screen-battle');
    $('#battle-log').innerHTML = '';
    $('#battle-actions').innerHTML = '';

    enableBattleButtons();
    $('#use-pokeball').disabled = state.inventory.pokeballs <= 0;

    showBattleMenu();

    // Indicateur de chaîne
    const chainIndicator = $('#chain-indicator');
    if (mode === 'wild' && state.chain.total > 1) {
        const current = state.chain.total - state.chain.remaining + 1;
        $('#chain-current').textContent = current;
        $('#chain-total').textContent = state.chain.total;
        chainIndicator.hidden = false;
    } else {
        chainIndicator.hidden = true;
    }

    // Autobattle par défaut
    state.autobattle = state.options.autoBattleDefault;

    try {
        const enemy = mode === 'champion'
            ? await spawnChampion()
            : await spawnWildPokemon(state.currentRoute);

        state.currentBattle = { player, enemy, mode };

        // Marqueur Pokédex (vu)
        markSeen(enemy);

        const enemyName = enemy.nameFr || enemy.name;
        const playerName = player.nameFr || player.name;

        $('#enemy-name').textContent = enemyName;
        $('#enemy-level').textContent = `Niv. ${enemy.level}`;
        $('#enemy-sprite').src = enemy.sprite;
        $('#enemy-sprite').onerror = function() {
            this.onerror = null;
            this.src = enemy.spriteFallback;
        };
        $('#enemy-shiny').hidden = !enemy.isShiny;
        $('.pokemon-sprite.enemy').classList.toggle('shiny', !!enemy.isShiny);

        // Marque "déjà au Pokédex"
        $('#enemy-dex-mark').hidden = !state.pokedex.has(enemy.id);

        $('#player-name').textContent = playerName;
        $('#player-level').textContent = `Niv. ${player.level}`;
        $('#player-sprite').src = player.backSprite;
        $('#player-sprite').onerror = function() {
            this.onerror = null;
            this.src = player.backSpriteFallback;
        };
        $('#player-shiny').hidden = !player.isShiny;
        $('.pokemon-sprite.player').classList.toggle('shiny', !!player.isShiny);

        updateHpBar('enemy', enemy);
        updateHpBar('player', player);
        updateExpBar(player);

        if (enemy.isShiny) {
            logBattle(`✨ Un ${enemyName} SHINY apparaît ! C'est extrêmement rare !`, 'shiny-msg');
        } else {
            const intro = mode === 'champion'
                ? `Le Champion envoie ${enemyName} (Niv. ${enemy.level}) !`
                : `Un ${enemyName} sauvage de niveau ${enemy.level} apparaît !`;
            logBattle(intro);
        }

        $('#btn-autobattle').classList.toggle('active', state.autobattle);

        // Autocapture : si activée, jamais capturé, et pokéballs dispo
        if (mode === 'wild'
            && state.options.autoCapture
            && !state.pokedex.has(enemy.id)
            && state.inventory.pokeballs > 0) {
            await delay(700);
            logBattle(`Autocapture : ${enemyName} n'est pas encore au Pokédex.`, 'exp-msg');
            await delay(400);
            await throwPokeball();
            return;
        }

        if (state.autobattle) {
            await delay(700);
            const move = pickBestMove(player, enemy);
            const idx = player.moves.indexOf(move);
            await playerTurn(idx);
        }
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
        else if (action === 'auto') toggleAutobattle();
    });
});

function toggleAutobattle() {
    state.autobattle = !state.autobattle;
    $('#btn-autobattle').classList.toggle('active', state.autobattle);
    showToast(state.autobattle
        ? 'Autobattle activé : ton Pokémon attaque automatiquement.'
        : 'Autobattle désactivé.');

    if (state.autobattle && state.inBattle && state.currentBattle) {
        const { player, enemy } = state.currentBattle;
        if (player.currentHp > 0 && enemy.currentHp > 0) {
            const move = pickBestMove(player, enemy);
            const idx = player.moves.indexOf(move);
            playerTurn(idx);
        }
    }
}

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
        btn.innerHTML = `
            <div class="move-name">${move.name}</div>
            <div class="move-meta">
                <span class="type-badge type-${move.type}">${TYPE_FR[move.type] || move.type}</span>
                <span>Puiss. ${move.power}</span>
            </div>
        `;
        btn.addEventListener('click', () => playerTurn(i));
        actionsDiv.appendChild(btn);
    });
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
    $$('#battle-actions .move-btn').forEach(b => b.disabled = false);
}

// === Tour du joueur (attaque) ===
async function playerTurn(moveIndex) {
    const { player, enemy } = state.currentBattle;
    const move = player.moves[moveIndex];
    if (!move) return;
    disableAllBattleButtons();

    const playerFirst = player.speed >= enemy.speed;

    if (playerFirst) {
        await executeMove(player, enemy, move, 'player', 'enemy', true);
        if (enemy.currentHp > 0) {
            await delay(700);
            const enemyMove = pickEnemyMove(enemy, player);
            await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
        }
    } else {
        const enemyMove = pickEnemyMove(enemy, player);
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
    await delay(450);

    if (!attackHits(move)) {
        logBattle(`L'attaque échoue.`);
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
    else if (result.effectiveness === 'none') logBattle("Ça n'affecte pas l'adversaire.");
}

// === Pokéball ===
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
    logBattle(`Tu lances une Pokéball sur ${enemyName}.`);

    const sprite = $('.pokemon-sprite.enemy');
    for (let i = 0; i < 3; i++) {
        await delay(380);
        sprite.classList.add('shake');
        setTimeout(() => sprite.classList.remove('shake'), 280);
    }
    await delay(450);

    const result = attemptCapture(enemy, mode === 'champion');

    if (result.reason === 'champion') {
        logBattle(`Tu ne peux pas capturer le Pokémon du Champion.`);
        await delay(700);
        const enemyMove = pickEnemyMove(enemy, player);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
        await checkBattleEnd();
        return;
    }

    if (result.caught) {
        const star = enemy.isShiny ? '★ ' : '';
        logBattle(`${star}Bravo ! ${enemyName} est capturé !`);
        await delay(900);
        captureSuccess(enemy);
        return;
    }

    logBattle(`${enemyName} s'est échappé !`);
    await delay(700);
    if (enemy.currentHp > 0) {
        const enemyMove = pickEnemyMove(enemy, player);
        await executeMove(enemy, player, enemyMove, 'enemy', 'player', false);
    }
    await checkBattleEnd();
}

function captureSuccess(enemy) {
    addToPokedex(enemy);
    state.inBattle = false;
    state.currentBattle = null;
    enableBattleButtons();
    if (state.team.length < 6) {
        enemy.currentHp = enemy.maxHp;
        state.team.push(enemy);
        const star = enemy.isShiny ? ' ★ shiny' : '';
        showToast(`${enemy.nameFr || enemy.name}${star} rejoint ton équipe !`);
    } else {
        showToast(`Ton équipe est pleine. Le Pokémon est ajouté au Pokédex et relâché.`);
    }
    state.battlesWon++;
    // Décrémente la chaîne
    advanceChain();
}

// === Fuite ===
async function attemptFlee() {
    const { mode } = state.currentBattle;
    if (mode === 'champion') {
        showToast('Tu ne peux pas fuir face au Champion.');
        return;
    }
    disableAllBattleButtons();
    logBattle('Tu prends la fuite…');
    await delay(800);
    state.inBattle = false;
    state.currentBattle = null;
    state.chain.remaining = 0;
    state.chain.total = 0;
    enableBattleButtons();
    showScreen('screen-hub');
    refreshHub();
}

// === Fin du combat ===
async function checkBattleEnd() {
    const { enemy, player, mode } = state.currentBattle;

    if (enemy.currentHp <= 0) {
        const enemyName = enemy.nameFr || enemy.name;
        logBattle(`${enemyName} est K.O. !`);
        await delay(700);

        if (mode !== 'champion') {
            const { gain, levelUps } = awardExp(player, enemy);
            logBattle(`${player.nameFr || player.name} gagne ${gain} EXP.`, 'exp-msg');
            updateExpBar(player);
            for (const newLvl of levelUps) {
                await delay(500);
                logBattle(`${player.nameFr || player.name} monte au niveau ${newLvl} !`, 'exp-msg');
                $('#player-level').textContent = `Niv. ${player.level}`;
                updateHpBar('player', player);
                updateExpBar(player);
            }
            await delay(700);
        }

        await endBattle('win');
        return;
    }

    if (player.currentHp <= 0) {
        const playerName = player.nameFr || player.name;
        logBattle(`${playerName} est K.O. !`);
        await delay(800);
        endBattle('lose');
        return;
    }

    enableBattleButtons();
    showBattleMenu();

    if (state.autobattle) {
        await delay(500);
        const move = pickBestMove(player, enemy);
        const idx = player.moves.indexOf(move);
        playerTurn(idx);
    }
}

async function endBattle(outcome) {
    const { mode } = state.currentBattle;
    state.inBattle = false;
    state.currentBattle = null;
    enableBattleButtons();

    if (outcome === 'win') {
        if (mode === 'champion') {
            showEnd('champion-win');
            return;
        }
        state.battlesWon++;
        advanceChain();
    } else {
        // Défaite : interrompt la chaîne
        state.chain.remaining = 0;
        state.chain.total = 0;
        if (isTeamWiped()) {
            if (state.mode === 'hardcore') {
                showEnd('hardcore-loss');
            } else {
                healFullTeam();
                setTimeout(() => {
                    showToast('Ton équipe a été soignée au Centre Pokémon.');
                    refreshHub();
                    showScreen('screen-hub');
                }, 1100);
            }
        } else {
            setTimeout(() => {
                refreshHub();
                showScreen('screen-hub');
            }, 1100);
        }
    }
}

// Avance dans la chaîne de combats : enchaîne ou retourne au hub
function advanceChain() {
    if (state.chain.remaining > 1 && !isTeamWiped()) {
        state.chain.remaining--;
        setTimeout(async () => {
            await startBattle('wild');
        }, 900);
    } else {
        state.chain.remaining = 0;
        state.chain.total = 0;
        setTimeout(() => {
            refreshHub();
            showScreen('screen-hub');
        }, 800);
    }
}

function showEnd(type) {
    showScreen('screen-end');
    const icon = $('#end-icon');
    const title = $('#end-title');
    const message = $('#end-message');

    if (type === 'champion-win') {
        icon.textContent = '★';
        title.textContent = `Bravo, Maître ${state.trainerName} !`;
        const starterName = state.team[0].nameFr || state.team[0].name;
        message.textContent = `Tu as vaincu le Champion avec ${starterName}. Tu es désormais le Maître Pokémon de la région.`;
    } else if (type === 'hardcore-loss') {
        icon.textContent = '✕';
        title.textContent = 'Game Over — Mode Hardcore';
        message.textContent = 'Toute ton équipe est K.O. En mode Hardcore, l\'aventure se termine ici. Tente à nouveau.';
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
    state.currentRoute = 'route-1';
    state.autobattle = false;
    state.reorderMode = false;
    state.chain = { remaining: 0, total: 0 };
    state.chainSize = 1;
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
                showToast('Cette fonctionnalité sera disponible dans une future mise à jour.');
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
        } else if (tab === 'map') {
            showMapScreen();
        } else if (tab === 'pokedex') {
            renderPokedex();
            showScreen('screen-pokedex');
        } else if (tab === 'options') {
            showScreen('screen-options');
        } else if (tab === 'patchnotes') {
            markVersionAsSeen();
            showScreen('screen-patchnotes');
        }
    });
});

// === Pokédex (écran) ===
function renderPokedex() {
    const grid = $('#pokedex-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let caughtCount = 0;
    let seenOnlyCount = 0;

    GEN1_IDS.forEach(id => {
        const caught = state.pokedex.get(id);
        const seen = state.pokedexSeen.has(id);
        if (caught) caughtCount++;
        else if (seen) seenOnlyCount++;

        // Filtre
        if (state.dexFilter === 'caught' && !caught) return;
        if (state.dexFilter === 'seen' && (caught || !seen)) return;
        if (state.dexFilter === 'missing' && (caught || seen)) return;

        const cell = document.createElement('div');
        let cls = 'dex-cell';
        if (caught) {
            cls += ' caught';
            if (caught.isShiny) cls += ' shiny-caught';
        } else if (seen) {
            cls += ' seen';
        } else {
            cls += ' missing';
        }
        cell.className = cls;

        const num = String(id).padStart(3, '0');
        const sprite = getDexSpriteUrl(id);
        const name = caught ? caught.nameFr : (seen ? '???' : '???');
        const shinyMark = caught?.isShiny ? '<span class="dex-cell-shiny">★</span>' : '';

        cell.innerHTML = `
            <div class="dex-cell-num">N°${num}</div>
            <img src="${sprite}" alt="${name}" loading="lazy">
            <div class="dex-cell-name">${name}</div>
            ${shinyMark}
        `;

        if (caught) {
            cell.addEventListener('click', () => showDexModal(caught));
        }

        grid.appendChild(cell);
    });

    $('#dex-caught').textContent = caughtCount;
    $('#dex-seen').textContent = caughtCount + seenOnlyCount;
}

$$('.dex-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        state.dexFilter = btn.dataset.filter;
        $$('.dex-filter').forEach(b => b.classList.toggle('active', b === btn));
        renderPokedex();
    });
});

function showDexModal(entry) {
    const modal = $('#dex-modal');
    const content = $('#dex-modal-content');
    const num = String(entry.id).padStart(3, '0');
    const types = (entry.types || []).map(
        t => `<span class="type-badge type-${t}">${TYPE_FR[t] || t}</span>`
    ).join('');
    const star = entry.isShiny ? '<span class="shiny-star" style="font-size:18px;margin-left:4px">★</span>' : '';

    content.innerHTML = `
        <img src="${getDexSpriteUrl(entry.id)}" alt="${entry.nameFr}">
        <div class="modal-num">N°${num}</div>
        <div class="modal-name">${entry.nameFr} ${star}</div>
        <div class="modal-types">${types}</div>
        <button class="btn btn-secondary modal-close" data-close="modal">Fermer</button>
    `;
    modal.hidden = false;

    content.querySelector('[data-close="modal"]').addEventListener('click', closeDexModal);
}

function closeDexModal() {
    $('#dex-modal').hidden = true;
}

document.addEventListener('click', (e) => {
    if (e.target.matches('.modal-backdrop[data-close="modal"]')) closeDexModal();
});

// === Options ===
$$('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.options.theme = btn.dataset.theme;
        saveOptions(state.options);
        applyTheme(state.options.theme);
    });
});

$('#opt-autobattle')?.addEventListener('change', (e) => {
    state.options.autoBattleDefault = e.target.checked;
    saveOptions(state.options);
});

$('#opt-autocapture')?.addEventListener('change', (e) => {
    state.options.autoCapture = e.target.checked;
    saveOptions(state.options);
});

$$('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.options.battleSpeed = btn.dataset.speed;
        saveOptions(state.options);
        applySpeedUI();
    });
});

$('#btn-reset-dex')?.addEventListener('click', () => {
    if (!confirm('Effacer toutes les données du Pokédex ? Cette action est définitive.')) return;
    state.pokedex.clear();
    state.pokedexSeen.clear();
    savePokedex(state.pokedex);
    saveSeen(state.pokedexSeen);
    updateDexBadge();
    renderPokedex();
    showToast('Pokédex réinitialisé.');
});

function applyOptionsToUI() {
    applyTheme(state.options.theme);
    applySpeedUI();
    const ab = $('#opt-autobattle');
    if (ab) ab.checked = state.options.autoBattleDefault;
    const ac = $('#opt-autocapture');
    if (ac) ac.checked = state.options.autoCapture;
}

// === Notes de patch ===
function renderPatchNotes() {
    const container = $('#patchnotes-content');
    if (!container) return;

    const fragments = [];

    PATCH_NOTES.forEach((note, idx) => {
        const isLatest = idx === 0;
        const sections = note.sections.map(s => `
            <div class="patch-section">
                <div class="patch-section-title">${s.title}</div>
                <ul class="patch-list">
                    ${s.items.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
        `).join('');

        fragments.push(`
            <div class="patch-version ${isLatest ? 'latest' : ''}">
                <div class="patch-header">
                    <span class="patch-version-num">v${note.version}</span>
                    <span class="patch-codename">« ${note.codename} »</span>
                    ${isLatest ? '<span class="patch-tag current">Actuel</span>' : ''}
                </div>
                <div class="patch-date">Sortie le ${note.date}</div>
                ${sections}
            </div>
        `);
    });

    if (ROADMAP && ROADMAP.length) {
        fragments.push('<div class="roadmap-divider">Roadmap</div>');
        ROADMAP.forEach(r => {
            fragments.push(`
                <div class="patch-version upcoming">
                    <div class="patch-header">
                        <span class="patch-version-num">v${r.version}</span>
                        <span class="patch-codename">« ${r.codename} »</span>
                        <span class="patch-tag upcoming">À venir</span>
                    </div>
                    <ul class="patch-list">
                        ${r.items.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            `);
        });
    }

    container.innerHTML = fragments.join('');
}

function setupVersionDisplay() {
    const el = $('#version-display');
    if (el) el.textContent = `v${VERSION} — ${CODENAME}`;

    const seenVersion = localStorage.getItem('pokemoca_seen_version');
    if (seenVersion !== VERSION) {
        $('#badge-new').hidden = false;
    }
}

function markVersionAsSeen() {
    localStorage.setItem('pokemoca_seen_version', VERSION);
    $('#badge-new').hidden = true;
}

// === Démarrage ===
applyOptionsToUI();
updateDexBadge();
setupVersionDisplay();
renderPatchNotes();
showScreen('screen-mode');
