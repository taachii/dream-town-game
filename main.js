(function () {
  const W = 6, H = 5;

  const TYPES = { empty: 0, house: 1, forest: 2, pond: 3, plaza: 4 };
  const TYPE_NAME = { 1: 'Dom', 2: 'Las', 3: 'Staw', 4: 'Plac' };
  const TYPE_EMOJI = { 1: '🏠', 2: '🌲', 3: '💧', 4: '⬜' };
  const TYPE_CLASS = { 1: 'house', 2: 'forest', 3: 'pond', 4: 'plaza' };
  const DIE_TO_TYPE = (v) => ({ 1: TYPES.house, 2: TYPES.forest, 3: TYPES.pond, 4: TYPES.house, 5: TYPES.forest, 6: TYPES.pond }[v]);

  const state = {
    started: false,
    round: 0,
    phase: 'idle',
    dice: [0, 0],
    needPlacements: [],
    grid: Array.from({ length: H }, () => Array.from({ length: W }, () => ({ t: TYPES.empty })))
  };

  const el = {
    grid: document.getElementById('grid'),
    startBtn: document.getElementById('startBtn'),
    rollBtn: document.getElementById('rollBtn'),
    dieA: document.getElementById('dieA'),
    dieB: document.getElementById('dieB'),
    round: document.getElementById('round'),
    phase: document.getElementById('phase'),
    sum: document.getElementById('sum'),
    log: document.getElementById('log'),
    hint: document.getElementById('phaseHint')
  };

  /* === HELPERS === */
  function rowLabel(row) {
    return row === 1 ? '3–4'
      : row === 2 ? '5–6'
      : row === 3 ? '7'
      : row === 4 ? '8–9'
      : row === 5 ? '10–11'
      : '?';
  }

  function pushLog(msg) {
    el.log.innerHTML = `<div>${msg}</div>` + el.log.innerHTML;
  }

  /* === RENDER GRID === */
  function renderGrid() {
    el.grid.innerHTML = '';

    // narożnik
    const corner = document.createElement('div');
    corner.className = 'hdr';
    el.grid.appendChild(corner);

    // nagłówki kolumn
    for (let c = 1; c <= W; c++) {
      const h = document.createElement('div');
      h.className = 'hdr';
      h.textContent = c;
      el.grid.appendChild(h);
    }

    // wiersze
    for (let r = 1; r <= H; r++) {
      const rh = document.createElement('div');
      rh.className = 'hdr rowhdr';
      rh.textContent = rowLabel(r);
      el.grid.appendChild(rh);

      for (let c = 1; c <= W; c++) {
        const cellData = state.grid[r - 1][c - 1];
        const div = document.createElement('div');
        div.className = 'cell';

        // istniejący żeton
        if (cellData.t !== TYPES.empty) {
          const chip = document.createElement('div');
          chip.className = `chip ${TYPE_CLASS[cellData.t]}`;
          chip.textContent = TYPE_EMOJI[cellData.t];
          div.appendChild(chip);
        }

        // dozwolone pole do kliknięcia
        if (isCellAllowed(r, c)) {
          div.classList.add('allowed');
          div.addEventListener('click', () => onCellClick(r, c));
        }

        el.grid.appendChild(div);
      }
    }
  }

  /* === START, ROLL, HEADER === */
  function updateHeader() {
    el.round.textContent = state.round || '–';
    el.phase.textContent = state.phase || '–';
    const [a, b] = state.dice;
    el.sum.textContent = a && b ? (a + b) : '–';
  }

  function updatePhaseHint() {
    if (!state.started) {
      el.hint.innerHTML = 'Kliknij „Start nowej gry”.';
      return;
    }
    if (state.phase === 'idle') {
      el.hint.innerHTML = 'Kliknij „Rzuć kośćmi”.';
    } else if (state.phase === 'build') {
      const current = state.needPlacements[0];
      if (current)
        el.hint.innerHTML = `Ustaw ${TYPE_NAME[current.type]} w kolumnie ${current.column}.`;
      else
        el.hint.innerHTML = 'Budowa zakończona.';
    }
  }

  function startGame() {
    Object.assign(state, {
      started: true,
      round: 1,
      phase: 'idle',
      dice: [0, 0],
      grid: Array.from({ length: H }, () => Array.from({ length: W }, () => ({ t: TYPES.empty })))
    });

    el.dieA.textContent = '–';
    el.dieB.textContent = '–';
    el.rollBtn.disabled = false;

    updateHeader();
    updatePhaseHint();
    renderGrid();
    pushLog('🚀 Nowa gra rozpoczęta. Runda 1.');
  }

  function rollDice() {
    if (state.phase !== 'idle') return;

    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    state.dice = [a, b];
    el.dieA.textContent = a;
    el.dieB.textContent = b;

    const tA = DIE_TO_TYPE(a);
    const tB = DIE_TO_TYPE(b);
    state.needPlacements = [
      { type: tA, column: b },
      { type: tB, column: a }
    ];

    state.phase = 'build';
    el.rollBtn.disabled = true;

    updateHeader();
    updatePhaseHint();
    renderGrid();

    pushLog(`🎲 Rzut: ${a} & ${b} → ${TYPE_NAME[tA]} w kol. ${b}, ${TYPE_NAME[tB]} w kol. ${a}.`);
  }

  /* === INTERAKCJE NA PLANSZY === */
  function isCellAllowed(r, c) {
    if (state.needPlacements.length === 0) return false;
    const need = state.needPlacements[0];
    return c === need.column && state.grid[r - 1][c - 1].t === TYPES.empty;
  }

  function onCellClick(r, c) {
    const need = state.needPlacements[0];
    if (!need) return;
    if (!isCellAllowed(r, c)) return;

    state.grid[r - 1][c - 1].t = need.type;
    state.needPlacements.shift();

    renderGrid();
    updatePhaseHint();

    if (state.needPlacements.length === 0) {
      state.phase = 'idle';
      el.rollBtn.disabled = false;
      updateHeader();
      pushLog(`✅ Zakończono budowę w rundzie ${state.round}.`);
    }
  }

  /* === INIT === */
  renderGrid();
  updateHeader();
  updatePhaseHint();

  el.startBtn.addEventListener('click', startGame);
  el.rollBtn.addEventListener('click', rollDice);
})();
