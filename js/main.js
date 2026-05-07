// Point d'entrée principal de PokeMOCA
import {
    buildBattlePokemon, STARTERS, PIKACHU_STARTER_NAME, TYPE_FR,
    getRoutePokemonPreview, showdownSprites,
    GEN1_IDS, getDexSpriteUrl, getMaxChainSize,
    LOCATIONS, getLocationById, isLocationUnlocked,
    GYMS, GYM_ORDER, ELITE_FOUR, getGymByOrder, getNextGym,
    spawnTrainerTeam, INFO_NOTES
} from './api.js';
import {
    calculateDamage, attackHits, spawnWildPokemon,
    pickEnemyMove, pickBestMove, attemptCapture,
    awardExpToTeam
} from './battle.js';
import { VERSION, CODENAME, PATCH_NOTES, ROADMAP } from './version.js';
import { startSnakeGame, stopSnakeGame } from './snake.js';

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
    badges: [],                  // tableau d'IDs de gym battus ('brock', 'misty', ...)
    inBattle: false,
    currentBattle: null,
    easterEggTriggered: false,
    inventory: { pokeballs: 5 },
    currentLocation: 'palette',  // ID de location (town ou route)
    autobattle: false,
    reorderMode: false,
    pokedex: loadPokedex(),
    pokedexSeen: loadSeen(),
    options: loadOptions(),
    chain: { remaining: 0, total: 0 },
    chainSize: 1,
    dexFilter: 'all',
    elite: null,                 // { trainers, currentIdx } pour Plateau Indigo
    pendingSwitch: null          // resolver Promise pour le switch sur K.O.
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
    else if (id === 'screen-info') $('#nav-info')?.classList.add('active');
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
    // Location actuelle (peut être une ville ou une route)
    const loc = getLocationById(state.currentLocation) || getLocationById('palette');
    const routeNameEl = $('#hub-route-name');
    routeNameEl.textContent = loc.name;
    $('#hub-route-desc').textContent = loc.desc;

    // Easter egg : titre cliquable à Bourg Palette
    setupEasterTrigger(loc.id === 'palette');

    // Roster
    renderRoster();
    $('#team-count').textContent = state.team.length;

    // Affichage des actions selon le type de zone
    const exploreCard = $('#action-explore');
    const gymCard = $('#action-gym');
    const eliteCard = $('#action-elite');
    const chainPanel = $('#hub-chain');

    exploreCard.hidden = true;
    gymCard.hidden = true;
    eliteCard.hidden = true;
    chainPanel.style.display = 'none';

    if (loc.type === 'route') {
        exploreCard.hidden = false;
        chainPanel.style.display = '';
        $('#explore-desc').textContent = `Pokémon sauvages niv. ${loc.levelMin}–${loc.levelMax}`;
    } else if (loc.type === 'town') {
        if (loc.gymId === 'elite-four') {
            // Plateau Indigo : verrouillé tant que les 8 badges ne sont pas obtenus
            if (state.badges.length >= 8) {
                eliteCard.hidden = false;
            }
        } else if (loc.gymId) {
            const gym = GYMS[loc.gymId];
            const earned = state.badges.includes(loc.gymId);
            const unlockOk = (loc.gymUnlockBadges ?? 0) <= state.badges.length;

            gymCard.hidden = false;
            $('#gym-icon').textContent = gym.badgeIcon || '🏆';
            $('#gym-title').textContent = earned
                ? `${gym.leaderName} — Badge obtenu`
                : `Affronter ${gym.leaderName}`;
            if (earned) {
                $('#gym-desc').textContent = `Tu as déjà obtenu le Badge ${gym.badge}.`;
                gymCard.classList.add('disabled');
                gymCard.classList.remove('primary');
            } else if (!unlockOk) {
                $('#gym-desc').textContent = `Arène fermée — il te faut ${loc.gymUnlockBadges} badges.`;
                gymCard.classList.add('disabled');
                gymCard.classList.remove('primary');
            } else {
                $('#gym-desc').textContent = `${gym.title} — type ${TYPE_FR[gym.type] || gym.type}`;
                gymCard.classList.remove('disabled');
                gymCard.classList.add('primary');
            }
        }
    }

    updateInventoryDisplay();
    renderChainControls();
    renderBadges();
}

// Rendu des 8 badges en bas du hub
function renderBadges() {
    const row = $('#badges-row');
    if (!row) return;
    row.innerHTML = '';
    GYM_ORDER.forEach(gymId => {
        const gym = GYMS[gymId];
        const earned = state.badges.includes(gymId);
        const cell = document.createElement('div');
        cell.className = 'badge-cell' + (earned ? ' earned' : '');
        cell.innerHTML = `
            ${gym.badgeIcon}
            <span class="badge-tip">${gym.badge} — ${gym.leaderName}</span>
        `;
        row.appendChild(cell);
    });
    $('#badges-count').textContent = state.badges.length;
}

function renderRoster() {
    const roster = $('#team-roster');
    roster.innerHTML = '';
    state.team.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'team-member'
            + (p.currentHp <= 0 ? ' fainted' : '')
            + (p.isShiny ? ' shiny' : '')
            + (p.isSurfing ? ' surfing' : '');
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
    const max = getMaxChainSize(state.badges.length);
    container.innerHTML = '';

    if (state.chainSize > max) state.chainSize = max;

    for (let i = 1; i <= 7; i++) {
        const btn = document.createElement('button');
        btn.className = 'chain-btn' + (state.chainSize === i ? ' active' : '');
        btn.textContent = `×${i}`;
        if (i > max) {
            btn.disabled = true;
            const need = i === 4 ? 1 : i === 5 ? 3 : i === 6 ? 5 : 7;
            btn.title = `Débloqué à ${need} badge(s)`;
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
    const loc = getLocationById(state.currentLocation);
    if (!loc || loc.type !== 'route') return;
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. Va d\'abord au Centre Pokémon.');
        return;
    }
    // Démarre la chaîne
    state.chain.total = state.chainSize;
    state.chain.remaining = state.chainSize;
    await startBattle('wild');
});

$('#action-gym').addEventListener('click', async () => {
    if (state.inBattle) return;
    const loc = getLocationById(state.currentLocation);
    if (!loc || !loc.gymId || loc.gymId === 'elite-four') return;
    const gym = GYMS[loc.gymId];
    if (state.badges.includes(loc.gymId)) {
        showToast(`Tu as déjà battu ${gym.leaderName}.`);
        return;
    }
    if ((loc.gymUnlockBadges ?? 0) > state.badges.length) {
        showToast(`Cette arène nécessite ${loc.gymUnlockBadges} badges.`);
        return;
    }
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. Va d\'abord au Centre Pokémon.');
        return;
    }
    await startGymBattle(gym);
});

$('#action-elite').addEventListener('click', async () => {
    if (state.inBattle) return;
    if (state.badges.length < 8) {
        showToast('Le Plateau Indigo s\'ouvre avec les 8 badges.');
        return;
    }
    if (isTeamWiped()) {
        showToast('Toute ton équipe est K.O. Va d\'abord au Centre Pokémon.');
        return;
    }
    await startEliteChain();
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

// === Carte de Kanto ===
function showMapScreen() {
    showScreen('screen-map');
    const grid = $('#kanto-map');
    grid.innerHTML = '';

    LOCATIONS.forEach((loc) => {
        const unlocked = isLocationUnlocked(loc.id, state.badges.length);
        const isCurrent = state.currentLocation === loc.id;
        const card = document.createElement('div');

        let cls = 'route-card location-' + loc.type;
        if (isCurrent) cls += ' current';
        if (!unlocked) cls += ' locked';
        if (loc.type === 'town' && loc.gymId && loc.gymId !== 'elite-four') cls += ' gym-town';
        card.className = cls;
        card.dataset.route = loc.id;
        if (loc.col) card.style.gridColumn = loc.col;
        if (loc.row) card.style.gridRow = loc.row;

        // Petit tag selon état
        let tag = '';
        if (isCurrent) {
            tag = '<span class="route-tag-mini current">Ici</span>';
        } else if (!unlocked) {
            tag = `<span class="route-tag-mini locked">🔒 ${loc.requires?.badges ?? '?'}</span>`;
        } else if (loc.gymId === 'elite-four') {
            tag = '<span class="route-tag-mini elite">👑</span>';
        } else if (loc.type === 'town' && loc.gymId) {
            const earned = state.badges.includes(loc.gymId);
            tag = earned
                ? '<span class="route-tag-mini earned">✓</span>'
                : '<span class="route-tag-mini gym">Arène</span>';
        }

        card.innerHTML = `
            <div class="route-icon-mini">${loc.icon}</div>
            <div class="route-name-mini">${loc.name}</div>
            ${tag}
        `;

        card.addEventListener('click', () => openLocationModal(loc.id));
        grid.appendChild(card);
    });
}

async function openLocationModal(locId) {
    const loc = getLocationById(locId);
    if (!loc) return;
    const modal = $('#location-modal');
    const content = $('#location-modal-content');
    const unlocked = isLocationUnlocked(loc.id, state.badges.length);
    const isCurrent = state.currentLocation === loc.id;

    // En-tête + description
    let typeLabel = loc.type === 'town' ? 'Ville' : 'Route';
    if (loc.gymId === 'elite-four') typeLabel = 'Plateau';

    let stateBadge = '';
    if (isCurrent) stateBadge = '<span class="route-tag-mini current">Tu es ici</span>';
    else if (!unlocked) stateBadge = `<span class="route-tag-mini locked">🔒 ${loc.requires?.badges ?? '?'} badges</span>`;

    let sections = '';

    // Pokémon sauvages (routes)
    if (loc.type === 'route') {
        sections += `
            <div class="loc-modal-section">
                <div class="loc-modal-section-title">
                    <span>Pokémon sauvages</span>
                    <span class="route-level-range">Niv. ${loc.levelMin}–${loc.levelMax}</span>
                </div>
                <div class="loc-modal-pokemons" id="loc-modal-pokemons">
                    <div class="route-loading" style="padding:14px;font-size:12px">Chargement…</div>
                </div>
            </div>
        `;
    }

    // Arène / Plateau Indigo
    if (loc.type === 'town' && loc.gymId) {
        if (loc.gymId === 'elite-four') {
            const eliteOk = state.badges.length >= 8;
            sections += `
                <div class="loc-modal-section">
                    <div class="loc-modal-section-title"><span>👑 Plateau Indigo</span></div>
                    <div class="loc-modal-gym ${eliteOk ? '' : 'locked'}">
                        <div class="loc-modal-gym-title">Conseil des 4 + Champion</div>
                        <div class="loc-modal-gym-meta">
                            ${eliteOk
                                ? '5 combats enchaînés sans soin. La vraie épreuve finale.'
                                : `Verrouillé — il te faut les 8 badges (${state.badges.length}/8).`}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const gym = GYMS[loc.gymId];
            const earned = state.badges.includes(loc.gymId);
            const unlockOk = (loc.gymUnlockBadges ?? 0) <= state.badges.length;
            let cls = '';
            let meta = `${gym.title} — type ${TYPE_FR[gym.type] || gym.type}`;
            if (earned) { cls = 'earned'; meta = `Badge ${gym.badge} déjà obtenu.`; }
            else if (!unlockOk) { cls = 'locked'; meta = `Arène fermée — ${loc.gymUnlockBadges} badges requis (${state.badges.length}/${loc.gymUnlockBadges}).`; }
            sections += `
                <div class="loc-modal-section">
                    <div class="loc-modal-section-title"><span>Arène locale</span></div>
                    <div class="loc-modal-gym ${cls}">
                        <div class="loc-modal-gym-title">${gym.badgeIcon} ${gym.leaderName}</div>
                        <div class="loc-modal-gym-meta">${meta}</div>
                    </div>
                </div>
            `;
        }
    }

    // Boutons d'action
    let actions = '';
    if (isCurrent) {
        actions = `<button class="btn btn-secondary" data-close="location">Fermer</button>`;
    } else if (unlocked) {
        actions = `
            <button class="btn btn-secondary" data-close="location">Annuler</button>
            <button class="btn btn-primary" id="btn-loc-travel">🚶 Voyager ici</button>
        `;
    } else {
        actions = `<button class="btn btn-secondary" data-close="location">Fermer</button>`;
    }

    content.innerHTML = `
        <div class="loc-modal-head">
            <div class="loc-modal-icon">${loc.icon}</div>
            <div class="loc-modal-titles">
                <div class="loc-modal-name">${loc.name} ${stateBadge}</div>
                <div class="loc-modal-type">${typeLabel}</div>
            </div>
        </div>
        <div class="loc-modal-desc">${loc.desc}</div>
        ${sections}
        <div class="loc-modal-actions">${actions}</div>
    `;

    modal.hidden = false;

    // Bind close + travel
    content.querySelectorAll('[data-close="location"]').forEach(btn => {
        btn.addEventListener('click', closeLocationModal);
    });
    const travel = content.querySelector('#btn-loc-travel');
    if (travel) {
        travel.addEventListener('click', () => {
            closeLocationModal();
            selectLocation(loc.id);
        });
    }

    // Charger la preview de Pokémon en arrière-plan
    if (loc.type === 'route') {
        try {
            const items = await getRoutePokemonPreview(loc.pool);
            const target = $('#loc-modal-pokemons');
            if (target && !modal.hidden) {
                target.innerHTML = items.map(p => `
                    <div class="loc-modal-poke" title="${p.nameFr}">
                        <img src="${p.sprite}" alt="${p.nameFr}" loading="lazy">
                        <span class="loc-modal-poke-name">${p.nameFr}</span>
                    </div>
                `).join('') || '<div style="font-size:12px;color:var(--text-dim)">Aucun aperçu disponible.</div>';
            }
        } catch (err) {
            console.error(err);
        }
    }
}

function closeLocationModal() {
    $('#location-modal').hidden = true;
}

function selectLocation(locId) {
    const loc = getLocationById(locId);
    if (!loc) return;
    state.currentLocation = locId;
    showToast(`Direction ${loc.name}.`);
    enterHub();
}

// === Combats de dresseurs ===
async function startGymBattle(gym) {
    showScreen('screen-battle');
    $('#battle-log').innerHTML = '';
    logBattle(`${gym.leaderName} : « ${gym.intro} »`);
    await delay(600);

    try {
        const enemyTeam = await spawnTrainerTeam(gym.team);
        await startBattle('trainer', {
            trainer: {
                id: gym.id,
                kind: 'gym',
                leaderName: gym.leaderName,
                title: gym.title,
                team: enemyTeam,
                activeIndex: 0
            }
        });
    } catch (err) {
        console.error(err);
        logBattle('Erreur lors du démarrage du combat.');
    }
}

async function startEliteChain() {
    state.elite = { trainers: [...ELITE_FOUR], currentIdx: 0 };
    await startNextEliteTrainer();
}

async function startNextEliteTrainer() {
    if (!state.elite || state.elite.currentIdx >= state.elite.trainers.length) {
        // Tous battus
        state.elite = null;
        showEnd('elite-win');
        return;
    }
    const trainer = state.elite.trainers[state.elite.currentIdx];
    showScreen('screen-battle');
    $('#battle-log').innerHTML = '';
    logBattle(`${trainer.leaderName} : « ${trainer.intro} »`);
    await delay(600);

    try {
        const enemyTeam = await spawnTrainerTeam(trainer.team);
        await startBattle('trainer', {
            trainer: {
                id: trainer.id,
                kind: 'elite',
                leaderName: trainer.leaderName,
                title: trainer.title,
                team: enemyTeam,
                activeIndex: 0
            }
        });
    } catch (err) {
        console.error(err);
        logBattle('Erreur lors du démarrage du combat.');
    }
}

// === Étape 4 : Combat ===
async function startBattle(mode, opts = {}) {
    state.inBattle = true;
    const player = getActivePokemon();

    showScreen('screen-battle');
    if (mode !== 'trainer') $('#battle-log').innerHTML = '';
    $('#battle-actions').innerHTML = '';

    enableBattleButtons();
    $('#use-pokeball').disabled = state.inventory.pokeballs <= 0 || mode === 'trainer';

    showBattleMenu();

    // Bandeau de dresseur
    const banner = $('#trainer-banner');
    if (mode === 'trainer' && opts.trainer) {
        banner.hidden = false;
        $('#trainer-banner-title').textContent = opts.trainer.title;
        $('#trainer-banner-name').textContent = opts.trainer.leaderName;
        renderTrainerBalls(opts.trainer);
    } else {
        banner.hidden = true;
    }

    // Indicateur de chaîne (combats sauvages)
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
        let enemy;
        if (mode === 'trainer') {
            enemy = opts.trainer.team[opts.trainer.activeIndex];
            state.currentBattle = { player, enemy, mode, trainer: opts.trainer };
        } else {
            enemy = await spawnWildPokemon(state.currentLocation);
            state.currentBattle = { player, enemy, mode };
        }

        // Marqueur Pokédex (vu)
        markSeen(enemy);

        renderBattleSprites(player, enemy);

        if (enemy.isShiny) {
            logBattle(`✨ Un ${enemy.nameFr || enemy.name} SHINY apparaît ! C'est extrêmement rare !`, 'shiny-msg');
        } else if (mode === 'trainer') {
            logBattle(`${opts.trainer.leaderName} envoie ${enemy.nameFr || enemy.name} (Niv. ${enemy.level}) !`);
        } else {
            logBattle(`Un ${enemy.nameFr || enemy.name} sauvage de niveau ${enemy.level} apparaît !`);
        }

        $('#btn-autobattle').classList.toggle('active', state.autobattle);

        // Autocapture : seulement combats sauvages, pas encore capturé, pokéballs dispo
        if (mode === 'wild'
            && state.options.autoCapture
            && !state.pokedex.has(enemy.id)
            && state.inventory.pokeballs > 0) {
            await delay(700);
            logBattle(`Autocapture : ${enemy.nameFr || enemy.name} n'est pas encore au Pokédex.`, 'exp-msg');
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

// Rend les sprites du combat pour un nouveau Pokémon (joueur ou ennemi)
function renderBattleSprites(player, enemy) {
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
}

// Affiche les balls dans le bandeau du dresseur (active = en cours, fainted = K.O.)
function renderTrainerBalls(trainer) {
    const container = $('#trainer-balls-enemy');
    if (!container) return;
    container.innerHTML = '';
    trainer.team.forEach((p, idx) => {
        const ball = document.createElement('span');
        let cls = 'trainer-ball';
        if (p.currentHp <= 0) cls += ' fainted';
        else if (idx === trainer.activeIndex) cls += ' active';
        ball.className = cls;
        ball.title = `${p.nameFr || p.name} — Niv. ${p.level}`;
        container.appendChild(ball);
    });
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

    const result = attemptCapture(enemy, mode === 'trainer');

    if (result.reason === 'trainer' || result.reason === 'champion') {
        logBattle(`Tu ne peux pas capturer le Pokémon d'un dresseur.`);
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
    advanceChain();
}

// === Fuite ===
async function attemptFlee() {
    const { mode, trainer } = state.currentBattle;
    if (mode === 'trainer') {
        const lbl = trainer?.kind === 'elite' ? 'face au Conseil des 4' : 'face à un Champion d\'arène';
        showToast(`Tu ne peux pas fuir ${lbl}.`);
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
    const { enemy, player, mode, trainer } = state.currentBattle;

    if (enemy.currentHp <= 0) {
        const enemyName = enemy.nameFr || enemy.name;
        logBattle(`${enemyName} est K.O. !`);
        await delay(700);

        // Multi-EXP partagé
        const expResults = awardExpToTeam(state.team, player, enemy);
        for (const r of expResults) {
            const pName = r.pokemon.nameFr || r.pokemon.name;
            logBattle(`${pName} gagne ${r.gain} EXP.`, 'exp-msg');
        }
        updateExpBar(player);
        for (const r of expResults) {
            for (const newLvl of r.levelUps) {
                await delay(450);
                const pName = r.pokemon.nameFr || r.pokemon.name;
                logBattle(`${pName} monte au niveau ${newLvl} !`, 'exp-msg');
                if (r.pokemon === player) {
                    $('#player-level').textContent = `Niv. ${player.level}`;
                    updateHpBar('player', player);
                    updateExpBar(player);
                }
            }
        }
        await delay(500);

        // Mode dresseur : envoyer le prochain Pokémon ou terminer
        if (mode === 'trainer' && trainer) {
            trainer.activeIndex++;
            if (trainer.activeIndex < trainer.team.length) {
                const nextEnemy = trainer.team[trainer.activeIndex];
                state.currentBattle.enemy = nextEnemy;
                markSeen(nextEnemy);
                logBattle(`${trainer.leaderName} envoie ${nextEnemy.nameFr || nextEnemy.name} (Niv. ${nextEnemy.level}) !`);
                renderBattleSprites(player, nextEnemy);
                renderTrainerBalls(trainer);
                await delay(800);
                enableBattleButtons();
                showBattleMenu();
                if (state.autobattle) {
                    await delay(400);
                    const move = pickBestMove(player, nextEnemy);
                    const idx = player.moves.indexOf(move);
                    playerTurn(idx);
                }
                return;
            }
        }

        await endBattle('win');
        return;
    }

    if (player.currentHp <= 0) {
        const playerName = player.nameFr || player.name;
        logBattle(`${playerName} est K.O. !`);
        await delay(700);

        // Switch sur K.O. : si d'autres Pokémon valides, demander
        const alive = state.team.filter(p => p.currentHp > 0);
        if (alive.length > 0) {
            const next = alive.length === 1 ? alive[0] : await promptSwitch();
            // Place le nouveau combattant en tête
            const nextIdx = state.team.indexOf(next);
            const oldIdx = state.team.indexOf(player);
            if (nextIdx !== -1 && oldIdx !== -1) {
                state.team[oldIdx] = next;
                state.team[nextIdx] = player;
            }
            state.currentBattle.player = next;
            logBattle(`${state.trainerName} envoie ${next.nameFr || next.name} !`);
            renderBattleSprites(next, enemy);
            await delay(700);
            enableBattleButtons();
            showBattleMenu();
            if (state.autobattle) {
                await delay(400);
                const move = pickBestMove(next, enemy);
                const idx = next.moves.indexOf(move);
                playerTurn(idx);
            }
            return;
        }

        await delay(200);
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

// Demande au joueur de choisir le prochain Pokémon à envoyer
function promptSwitch() {
    return new Promise(resolve => {
        const modal = $('#switch-modal');
        const list = $('#switch-list');
        list.innerHTML = '';
        state.team.forEach(p => {
            if (p.currentHp <= 0) return;
            if (p === state.currentBattle.player) return;
            const btn = document.createElement('button');
            btn.className = 'switch-poke';
            const miniSrc = p.miniSprite || p.spriteFallback;
            const star = p.isShiny ? ' ★' : '';
            btn.innerHTML = `
                <img src="${miniSrc}" alt="${p.nameFr || p.name}"
                     onerror="this.onerror=null;this.src='${p.spriteFallback}'">
                <div class="switch-poke-info">
                    <span class="switch-poke-name">${p.nameFr || p.name}${star}</span>
                    <span class="switch-poke-meta">Niv. ${p.level} · PV ${p.currentHp}/${p.maxHp}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                modal.hidden = true;
                resolve(p);
            });
            list.appendChild(btn);
        });
        modal.hidden = false;
    });
}

async function endBattle(outcome) {
    const { mode, trainer } = state.currentBattle;
    state.inBattle = false;
    const finishedTrainer = trainer || null;
    state.currentBattle = null;
    enableBattleButtons();

    if (outcome === 'win') {
        if (mode === 'trainer' && finishedTrainer) {
            if (finishedTrainer.kind === 'gym') {
                // Badge gagné
                if (!state.badges.includes(finishedTrainer.id)) {
                    state.badges.push(finishedTrainer.id);
                }
                const gym = GYMS[finishedTrainer.id];
                logBattle(`Tu as obtenu le Badge ${gym.badge} !`, 'exp-msg');
                showToast(`Badge ${gym.badge} obtenu ! ${gym.leaderName} : « ${gym.outro} »`, 6000);
                setTimeout(() => {
                    refreshHub();
                    showScreen('screen-hub');
                }, 1400);
                return;
            }
            if (finishedTrainer.kind === 'elite') {
                // Avance au prochain membre du Conseil des 4 / Champion
                if (state.elite) {
                    state.elite.currentIdx++;
                    setTimeout(() => startNextEliteTrainer(), 1000);
                }
                return;
            }
        }
        // Combat sauvage : avance la chaîne
        advanceChain();
    } else {
        // Défaite : interrompt la chaîne et le Plateau Indigo
        state.chain.remaining = 0;
        state.chain.total = 0;
        state.elite = null;
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

    if (type === 'elite-win') {
        icon.textContent = '👑';
        title.textContent = `Bravo, Maître ${state.trainerName} !`;
        message.textContent = `Tu as vaincu le Conseil des 4 et le Champion. Tu es désormais le Maître Pokémon de Kanto.`;
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
    state.badges = [];
    state.inBattle = false;
    state.currentBattle = null;
    state.easterEggTriggered = false;
    state.inventory = { pokeballs: 5 };
    state.currentLocation = 'palette';
    state.autobattle = false;
    state.reorderMode = false;
    state.chain = { remaining: 0, total: 0 };
    state.chainSize = 1;
    state.elite = null;
    state.pendingSwitch = null;
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
        } else if (tab === 'info') {
            renderInfoNotes();
            showScreen('screen-info');
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
    if (e.target.matches('.modal-backdrop[data-close="location"]')) closeLocationModal();
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

// === Onglet Informations ===
function renderInfoNotes() {
    const container = $('#info-content');
    if (!container) return;
    container.innerHTML = INFO_NOTES.map(section => `
        <div class="info-section">
            <div class="info-section-title">${section.title}</div>
            <ul class="info-list">
                ${section.items.map(i => `<li>${i}</li>`).join('')}
            </ul>
        </div>
    `).join('');
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

// === Easter egg : Snake à Bourg Palette ===
const easterState = {
    bound: false,
    clicks: [],
    handler: null,
    glowTimer: null
};

function setupEasterTrigger(active) {
    const el = $('#hub-route-name');
    if (!el) return;

    if (!active) {
        el.classList.remove('easter-trigger', 'almost');
        if (easterState.handler) {
            el.removeEventListener('click', easterState.handler);
            easterState.handler = null;
        }
        easterState.bound = false;
        easterState.clicks = [];
        return;
    }

    el.classList.add('easter-trigger');
    if (easterState.bound) return;

    easterState.handler = () => {
        const now = Date.now();
        easterState.clicks = easterState.clicks.filter(t => now - t < 3000);
        easterState.clicks.push(now);

        if (easterState.clicks.length >= 5) {
            easterState.clicks = [];
            el.classList.remove('almost');
            openSnakeGame();
            return;
        }

        if (easterState.clicks.length >= 3) {
            el.classList.add('almost');
            clearTimeout(easterState.glowTimer);
            easterState.glowTimer = setTimeout(() => el.classList.remove('almost'), 1200);
        }
    };
    el.addEventListener('click', easterState.handler);
    easterState.bound = true;
}

function openSnakeGame() {
    const modal = $('#snake-modal');
    if (!modal) return;
    modal.hidden = false;
    startSnakeGame({
        onWin: rewardSurfingPikachu,
        onLose: (reason) => {
            const msg = reason === 'time'
                ? 'Trop tard ! Le temps est écoulé.'
                : reason === 'wall'
                    ? 'Aïe ! Pikachu s\'est cogné au mur.'
                    : 'Pikachu s\'est mordu la queue !';
            showToast(msg);
            closeSnakeGame();
        }
    });
}

function closeSnakeGame() {
    stopSnakeGame();
    const modal = $('#snake-modal');
    if (modal) modal.hidden = true;
}

async function rewardSurfingPikachu() {
    try {
        const pika = await buildBattlePokemon('pikachu', 10, { forceShiny: true });
        pika.nameFr = 'Pikachu Surfeur';
        pika.isSurfing = true;
        addToPokedex(pika);
        if (state.team.length < 6) {
            state.team.push(pika);
            showToast('🏄 Bravo ! Tu reçois un Pikachu Surfeur shiny !', 6000);
        } else {
            showToast('🏄 Pikachu Surfeur ajouté au Pokédex (équipe pleine).', 6000);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la récompense.');
    } finally {
        closeSnakeGame();
        refreshHub();
    }
}

$('#btn-snake-quit')?.addEventListener('click', closeSnakeGame);

// === Démarrage ===
applyOptionsToUI();
updateDexBadge();
setupVersionDisplay();
renderPatchNotes();
renderInfoNotes();
showScreen('screen-mode');
