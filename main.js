(function () {
  const W = 6, H = 5;

  const state = {
    started: false,
    round: 0,       // ustawimy na 1 po starcie
    phase: 'idle',  // 'idle' | 'build' | ...
    dice: [0, 0]
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
    total: document.getElementById('total'),
    tableBody: document.getElementById('roundTable')?.querySelector('tbody'),
    hint: document.getElementById('phaseHint')
  };

  function rowLabel(row) {
    return row === 1 ? '3–4'
      : row === 2 ? '5–6'
      : row === 3 ? '7'
      : row === 4 ? '8–9'
      : row === 5 ? '10–11'
      : '?';
  }

  function renderGrid() {
    el.grid.innerHTML = '';

    // narożnik
    const corner = document.createElement('div');
    corner.className = 'hdr';
    el.grid.appendChild(corner);

    // nagłówki kolumn (1..6)
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
        const cell = document.createElement('div');
        cell.className = 'cell';
        el.grid.appendChild(cell);
      }
    }
  }

  function pushLog(msg) {
    if (!el.log) return;
    el.log.innerHTML = `<div>${msg}</div>` + el.log.innerHTML;
  }

  function updateHeader() {
    el.round.textContent = state.round || '–';
    el.phase.textContent = state.phase || '–';
    const [a, b] = state.dice;
    el.sum.textContent = a && b ? (a + b) : '–';
  }

  function updatePhaseHint() {
    if (!el.hint) return;

    if (!state.started) {
      el.hint.innerHTML = 'Kliknij „Start nowej gry”.';
      el.hint.style.display = 'block';
      return;
    }

    switch (state.phase) {
      case 'idle':
        el.hint.innerHTML = 'Gotowe do rzutu. Kliknij „Rzuć kośćmi”.';
        break;
      case 'build':
        el.hint.innerHTML = 'Budowa (wkrótce): połączymy rzuty z ustawianiem projektów.';
        break;
      default:
        el.hint.innerHTML = '';
    }
    el.hint.style.display = 'block';
  }

  function startGame() {
    state.started = true;
    state.round = 1;
    state.phase = 'idle';
    state.dice = [0, 0];

    el.dieA.textContent = '–';
    el.dieB.textContent = '–';

    el.rollBtn.disabled = false;
    updateHeader();
    updatePhaseHint();
    renderGrid();
    pushLog('🚀 Nowa gra rozpoczęta. Runda 1.');
  }

  function rollDice() {
    if (!state.started || state.phase !== 'idle') return;

    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    state.dice = [a, b];

    el.dieA.textContent = a;
    el.dieB.textContent = b;

    state.phase = 'build';
    updateHeader();
    updatePhaseHint();

    pushLog(`🎲 Rzut kośćmi: ${a} & ${b}. (W następnym commicie dodamy ustawianie projektów)`);
    // Na tym etapie nie blokujemy Roll – możesz sobie klikać, by testować rzuty.
    // W kolejnym commicie pojawi się faktyczna kolejka akcji i blokada przycisku.
  }

  // init
  renderGrid();
  updateHeader();
  updatePhaseHint();

  // handlers
  el.startBtn?.addEventListener('click', startGame);
  el.rollBtn?.addEventListener('click', rollDice);
})();