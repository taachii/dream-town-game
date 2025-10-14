(function () {
  const W = 6, H = 5;

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
    tableBody: document.getElementById('roundTable')?.querySelector('tbody')
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

  // prosta pomocnicza funkcja do loga
  function pushLog(msg) {
    if (!el.log) return;
    el.log.innerHTML = `<div>${msg}</div>` + el.log.innerHTML;
  }

  renderGrid();
  // Przyciski na razie nieaktywne
  pushLog('🧱 UI zainicjowane. Czekaj na logikę w kolejnych commitach.');
})();
