(function(){
  const W=6,H=5; // kolumny, wiersze
  const TYPES={empty:0, house:1, forest:2, pond:3, plaza:4};
  const TYPE_NAME={1:'Dom',2:'Las',3:'Staw',4:'Plac'};
  const TYPE_TO_CLASS={1:'house',2:'forest',3:'pond',4:'plaza'};
  const TYPE_EMOJI={1:'🏠',2:'🌲',3:'💧',4:'⬜'};
  const DIE_TO_TYPE=(v)=>({1:TYPES.house,2:TYPES.forest,3:TYPES.pond,4:TYPES.house,5:TYPES.forest,6:TYPES.pond}[v]);

  // mapa punktów (wiersz, kolumna) 1-indexed -> value
  const VALS={
    '1,1':3,'1,3':2,'1,4':2,'1,6':3,
    '2,2':1,'2,5':1,
    '3,1':3,'3,3':1,'3,4':1,'3,6':2,
    '4,2':1,'4,5':1,
    '5,1':3,'5,3':2,'5,4':2,'5,6':3
  };

  // ulice (suma -> wiersz)
  function sumToRow(sum){
    if(sum===2||sum===12) return 0; // wybór
    if(sum===3||sum===4) return 1;
    if(sum===5||sum===6) return 2;
    if(sum===7) return 3;
    if(sum===8||sum===9) return 4;
    if(sum===10||sum===11) return 5;
    return 0;
  }

  const state={
    grid:Array.from({length:H},()=>Array.from({length:W},()=>({t:TYPES.empty})) ),
    round:0, // 0 = przygotowawcza
    phase:'idle',
    dice:[0,0],
    needPlacements:[], // kolejka wymaganych akcji {type, column? , any?, bonusKey?}
    usedBonus:{house:false,forest:false,pond:false},
    roundPoints:[],
    total:0,
    started: false,
  };

  // DOM
  const el={
    grid:document.getElementById('grid'),
    log:document.getElementById('log'),
    round:document.getElementById('round'),
    phase:document.getElementById('phase'),
    sum:document.getElementById('sum'),
    total:document.getElementById('total'),
    table:document.getElementById('roundTable').querySelector('tbody'),
    startBtn:document.getElementById('startBtn'),
    rollBtn:document.getElementById('rollBtn'),
    dieA:document.getElementById('dieA'),
    dieB:document.getElementById('dieB'),
    hint:document.getElementById('phaseHint'),
    bHouse:document.getElementById('bHouse'),
    bForest:document.getElementById('bForest'),
    bPond:document.getElementById('bPond'),
    rowModal:document.getElementById('rowModal'),
    chooseRow:document.getElementById('chooseRow'),
    afterMsg:document.getElementById('afterMsg'),
    nextLine1:document.getElementById('nextLine1'),
    nextLine2:document.getElementById('nextLine2'),
    bonusBar:document.getElementById('bonusBar'),
    bonusHouse:document.getElementById('bonusHouse'),
    bonusForest:document.getElementById('bonusForest'),
    bonusPond:document.getElementById('bonusPond')
  };

  // ====== LOGIKA WYBORU KOLUMN: NAJBLIŻSZA WOLNA Z NAJWIĘKSZĄ LICZBĄ PÓL ======
  function freeCount(col){
    let cnt=0; for(let r=1;r<=H;r++) if(state.grid[r-1][col-1].t===TYPES.empty) cnt++; return cnt;
  }
  function columnHasEmpty(col){
    for(let r=1;r<=H;r++) if(state.grid[r-1][col-1].t===TYPES.empty) return true;
    return false;
  }
  // Szukamy rosnącej odległości od kolumny docelowej (1, 2, ...).
  // Na danej odległości bierzemy tylko kolumny z wolnym miejscem i wybieramy te z maksymalną liczbą wolnych pól.
  function nearestBestColumns(col){
    for(let d=1; d<=W; d++){
      const candidates=[];
      const left = col - d;
      const right = col + d;

      if(left>=1){
        const freeL = freeCount(left);
        if(freeL>0) candidates.push([left, freeL]);
      }
      if(right<=W && right!==left){
        const freeR = freeCount(right);
        if(freeR>0) candidates.push([right, freeR]);
      }

      if(candidates.length>0){
        const maxFree = Math.max(...candidates.map(c=>c[1]));
        return candidates.filter(c=>c[1]===maxFree).map(c=>c[0]);
      }
    }
    // żadna kolumna w całej planszy nie ma wolnego miejsca
    return [];
  }

  // ——— ULICA, KTÓRA BĘDZIE PUNKTOWANA (do highlightu)
  function scoringRowCandidate(){
    const [a,b] = state.dice;
    if(!(a && b)) return 0;
    const sum = a + b;
    const row = sumToRow(sum);
    if(row===0) return 0; // 2 lub 12 → wybór, nie podświetlamy
    return (state.phase==='build' || state.phase==='scoring') ? row : 0;
  }

  // Render planszy (z nagłówkami, podświetleniami)
  function renderGrid(){
    // Gdy brak legalnych pozycji dla aktualnego wymagania → projekt przepada.
    if(state.needPlacements.length>0){
      const req=state.needPlacements[0];
      const allowed = allowedPositionsFor(req);
      if(allowed.length===0){
        pushLog('⚠️ Brak wolnego miejsca — projekt przepada.');
        state.needPlacements.shift();
        advanceAfterPlacement();
        return;
      }
    }

    el.grid.innerHTML='';
    const hasReq = state.needPlacements.length>0;
    const req = hasReq ? state.needPlacements[0] : null;

    // 0) pusty narożnik
    const corner=document.createElement('div');
    corner.className='hdr';
    el.grid.appendChild(corner);

    // 1) nagłówki kolumn
    for(let c=1;c<=W;c++){
      const h=document.createElement('div');
      h.className='hdr colhdr';
      h.textContent=c;
      h.dataset.col=c;
      el.grid.appendChild(h);
    }

    // 2) wiersze: nagłówek + pola
    for(let r=1;r<=H;r++){
      const rh=document.createElement('div');
      rh.className='hdr rowhdr';
      rh.textContent = rowLabel(r);
      rh.dataset.row=r;
      el.grid.appendChild(rh);

      for(let c=1;c<=W;c++){
        const cell=state.grid[r-1][c-1];
        const div=document.createElement('div');
        div.className='cell';
        div.dataset.row=r; div.dataset.col=c;

        const val=VALS[`${r},${c}`]||'';
        if(val){
          const v=document.createElement('div');
          v.className='value'; v.textContent=val; div.appendChild(v);
        }

        if(cell.t!==TYPES.empty){
          const chip=document.createElement('div');
          chip.className='chip '+TYPE_TO_CLASS[cell.t];
          chip.textContent=TYPE_EMOJI[cell.t];
          div.appendChild(chip);
        }

        if(hasReq && isCellAllowed(r,c)){
          div.classList.add('allowed');
          div.addEventListener('click',()=>onCellClick(r,c));
        } else if(hasReq){
          div.classList.add('forbidden');
        }

        el.grid.appendChild(div);
      }
    }

    // 3) highlight kolumny (również na nagłówku) jeżeli wskazana i ma wolne pola
    if(req && !req.any && columnHasEmpty(req.column)){
      [...el.grid.children].forEach(node=>{
        const col=+node.dataset?.col;
        if(col===req.column) node.classList.add('highlight-col');
      });
    }

    // 4) podświetlenie TYLKO nagłówka ulicy (wiersza), która będzie punktowana
    const rowToHi = scoringRowCandidate();
    if (rowToHi) {
      [...el.grid.children].forEach(node => {
        if (node.classList?.contains('rowhdr') && +node.dataset.row === rowToHi) {
          node.classList.add('row-highlight'); // klasa działa na .hdr (mamy styl .hdr.row-highlight)
        }
      });
    }
  }

  function allowedPositionsFor(need){
    const out=[];
    for(let r=1;r<=H;r++){
      for(let c=1;c<=W;c++){
        if(isCellAllowedWith(need,r,c)) out.push([r,c]);
      }
    }
    return out;
  }

  function isCellAllowed(r,c){
    if(state.needPlacements.length===0) return false;
    return isCellAllowedWith(state.needPlacements[0], r, c);
  }
  function isCellAllowedWith(need,r,c){
    if(state.grid[r-1][c-1].t!==TYPES.empty) return false;
    if(need.any) return true; // dowolne
    const targetCol = need.column;
    const colHasFree = columnHasEmpty(targetCol);
    if(colHasFree) return c===targetCol;
    const allowedAdj = nearestBestColumns(targetCol);
    return allowedAdj.includes(c);
  }

  // --- klik na pole: zużywamy bonus DOPIERO po postawieniu
  function onCellClick(r,c){
    if(state.needPlacements.length===0) return;
    const need=state.needPlacements[0];
    if(!isCellAllowed(r,c)) return;

    // 1) postaw
    placeAt(r,c,need.type);

    // 2) zużyj bonus, jeśli to bonusowe zagranie
    if (need.bonusKey) {
      state.usedBonus[need.bonusKey] = true;
      updateHeader();
      updateBonusButtons();
      // zdejmij wizualny „selected”
      el.bonusHouse.classList.remove('selected');
      el.bonusForest.classList.remove('selected');
      el.bonusPond.classList.remove('selected');
    }

    // 3) kontynuacja
    state.needPlacements.shift();
    updateNextLines();
    renderGrid();
    advanceAfterPlacement();
  }

  function placeAt(r,c,type){
    state.grid[r-1][c-1].t=type;
  }

  function advanceAfterPlacement(){
    if(state.needPlacements.length>0){ renderGrid(); updateNextLines(); return; }
    if(state.phase==='build'){
      if(isBonusRound() && state.round>0){ openBonusBar(); } else { goScoring(); }
    } else if(state.phase==='bonus'){
      goScoring();
    } else if(state.phase==='prep'){
      pushLog('🔧 Runda przygotowawcza zakończona. Brak punktów.');
      state.round=1; updateHeader();
      state.phase='idle'; updatePhaseHint();
      el.rollBtn.disabled=false; updateNextLines();
      renderGrid();
    }
  }

  function startGame(){
    state.started = true;
    Object.assign(state,{
      grid:Array.from({length:H},()=>Array.from({length:W},()=>({t:TYPES.empty})) ),
      round:0, phase:'prep', dice:[0,0], needPlacements:[],
      usedBonus:{house:false,forest:false,pond:false}, roundPoints:[], total:0
    });
    el.afterMsg.textContent='';
    el.table.innerHTML='';
    el.log.innerHTML='';
    el.total.textContent='0';
    el.dieA.textContent='–'; el.dieB.textContent='–';
    closeRowChooser(); hideBonusBar();
    updateHeader(); renderGrid(); updateNextLines();
    el.rollBtn.disabled=false;
    rollDice(); // od razu rzut dla przygotowawczej
  }

  function updateHeader(){
    el.round.textContent = state.round===0? 'Przygot.' : state.round;
    el.phase.textContent = state.phase;
    el.sum.textContent = state.dice[0]&&state.dice[1]? (state.dice[0]+state.dice[1]) : '–';
    el.bHouse.textContent = state.usedBonus.house?'×':'✓';
    el.bForest.textContent = state.usedBonus.forest?'×':'✓';
    el.bPond.textContent = state.usedBonus.pond?'×':'✓';
  }

  function typeLabel(t){ return TYPE_NAME[t]||'-'; }

  function updatePhaseHint(){
    if (!state.started) {
      el.hint.style.display = 'block';
      return;
    }

    const [a,b] = state.dice;
    const sum = (a && b) ? a + b : 0;

    const tA = DIE_TO_TYPE(a);
    const tB = DIE_TO_TYPE(b);

    let html = '';

    switch (state.phase) {
      case 'idle':
        html = 'Gotowe do rzutu. Kliknij „Rzuć kośćmi”.';
        break;

      case 'prep':
        if (a && b) {
          const tb = DIE_TO_TYPE(b);
          html = `<b>Runda przygotowawcza</b>: najpierw ${TYPE_EMOJI[tA]} <b>${typeLabel(tA)}</b> → kol. <b>${b}</b>, 
                  potem ${TYPE_EMOJI[tb]} <b>${typeLabel(tb)}</b> → kol. <b>${a}</b>. Place wyłączone.`;
        } else {
          html = '<b>Runda przygotowawcza</b>: kliknij „Rzuć kośćmi”.';
        }
        break;

      case 'build':
        if (a === b) {
          html = `Dublet <b>${a}+${b}</b>: ${TYPE_EMOJI[tA]} <b>${typeLabel(tA)}</b> → kol. <b>${b}</b>, 
                  potem ⬜ <b>Plac</b> w <b>dowolnym</b> pustym polu.`;
        } else {
          html = `Budowa: ${TYPE_EMOJI[tA]} <b>${typeLabel(tA)}</b> → kol. <b>${b}</b>, 
                  potem ${TYPE_EMOJI[tB]} <b>${typeLabel(tB)}</b> → kol. <b>${a}</b>.`;
        }
        break;

      case 'bonus':
        html = 'Runda bonusowa: wybierz jeden z bonusów poniżej i umieść w dowolnym pustym polu.';
        break;

      case 'scoring':
        if (sum === 2 || sum === 12) {
          html = 'Punktacja: wybierz ulicę (dowolny wiersz).';
        } else {
          html = `Punktacja: liczona będzie ulica <b>${rowLabel(sumToRow(sum))}</b> (suma <b>${sum}</b>).`;
        }
        break;

      case 'finished':
        html = 'Koniec gry. Premia za place doliczona — wynik po prawej.';
        break;

      default:
        html = '';
    }

    el.hint.innerHTML = html;
    el.hint.style.display = html ? 'block' : 'none';
  }

  function updateNextLines() {
    const a = state.needPlacements[0];
    const b = state.needPlacements[1];

    if (a) {
      el.nextLine1.style.display = 'flex';
      el.nextLine1.innerHTML = `Teraz: <span class="chip-mini ${TYPE_TO_CLASS[a.type]}">${TYPE_EMOJI[a.type]}</span> ${typeLabel(a.type)} ${
        a.any ? '— dowolne pole' : `→ kol. <b>${a.column}</b>`
      }`;
    } else {
      el.nextLine1.textContent = '—';
    }

    if (b) {
      el.nextLine2.style.display = 'flex';
      el.nextLine2.innerHTML = `Potem: <span class="chip-mini ${TYPE_TO_CLASS[b.type]}">${TYPE_EMOJI[b.type]}</span> ${typeLabel(b.type)} ${
        b.any ? '— dowolne pole' : `→ kol. <b>${b.column}</b>`
      }`;
    } else {
      el.nextLine2.style.display = 'none';
    }
  }

  function rowLabel(row){
    return row===1?'3–4': row===2?'5–6': row===3?'7': row===4?'8–9': row===5?'10–11':'?'
  }

  function isBonusRound(){ return [3,6,9].includes(state.round); }

  function rollDice(){
    if(state.phase==='build' && state.needPlacements.length>0) return;
    if(state.round>9) return;

    const a=1+Math.floor(Math.random()*6);
    const b=1+Math.floor(Math.random()*6);
    state.dice=[a,b]; el.dieA.textContent=a; el.dieB.textContent=b;

    if(state.round===0){ // przygotowawcza
      state.phase='prep';
      preparePlacementsForRoll(true);
      pushLog(`🧰 Przygotowanie: rzut ${a} & ${b}.`);
      el.rollBtn.disabled=true;
    } else {
      state.phase='build';
      preparePlacementsForRoll(false);
      pushLog(`🔨 Runda ${state.round}: rzut ${a} & ${b}.`);
      el.rollBtn.disabled=true;
    }
    updateHeader(); updatePhaseHint(); updateNextLines(); renderGrid();
  }

  function preparePlacementsForRoll(prep){
    const [a,b]=state.dice; const tA=DIE_TO_TYPE(a), tB=DIE_TO_TYPE(b);
    state.needPlacements=[];
    if(a===b){
      state.needPlacements.push({type:tA, column:b});
      if(!prep){ state.needPlacements.push({type:TYPES.plaza, any:true}); }
    } else {
      state.needPlacements.push({type:tA, column:b});
      state.needPlacements.push({type:tB, column:a});
    }
  }

  // --- DZIENNICZEK ---
  function pushLog(msg){
    el.log.innerHTML = `<div>${msg}</div>` + el.log.innerHTML;
  }

  // SCORING
  function goScoring(){
    state.phase='scoring'; updateHeader(); updatePhaseHint(); hideBonusBar(); updateNextLines();
    const sum = state.dice[0]+state.dice[1];
    if(sum===2||sum===12){ openRowChooser(); } else { finishScoring(sumToRow(sum)); }
  }

  function openRowChooser(){
    el.chooseRow.innerHTML='';
    for(let r=1;r<=H;r++){
      const b=document.createElement('button');
      b.textContent = `Ulica ${rowLabel(r)} (wiersz ${r})`;
      b.addEventListener('click',()=>{ closeRowChooser(); finishScoring(r); });
      el.chooseRow.appendChild(b);
    }
    el.rowModal.style.display='flex';
  }
  function closeRowChooser(){ el.rowModal.style.display='none'; }

  function finishScoring(row){
    const pts = scoreRow(row);
    if(state.round>0){
      state.roundPoints[state.round-1]=pts;
      appendRoundRow(state.round, pts);
      state.total = state.roundPoints.reduce((a,b)=>a+(b||0),0);
      el.total.textContent = state.total;
    }
    pushLog(`🧮 Punktacja: ulica ${rowLabel(row)} → +<b>${pts}</b> pkt.`);

    if(state.round===9){
      const bonus = scorePlazas();
      state.total += bonus; el.total.textContent = state.total;
      el.afterMsg.textContent = `Premia za place: +${bonus} pkt. WYNIK KOŃCOWY: ${state.total} pkt.`;
      pushLog(`🏁 Koniec gry. Place: +${bonus} pkt.`);
      state.phase='finished'; updatePhaseHint(); el.rollBtn.disabled=true; return;
    }

    state.round = state.round===0?1:state.round+1;
    state.phase='idle'; state.dice=[0,0]; el.dieA.textContent='–'; el.dieB.textContent='–';
    updateHeader(); updatePhaseHint(); updateNextLines(); renderGrid();
    el.rollBtn.disabled=false;
  }

  function appendRoundRow(r,pts){
    const tr=document.createElement('tr'); tr.innerHTML=`<td>${r}</td><td>${pts}</td>`; el.table.appendChild(tr);
  }

  function neighbors4(r,c){ return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc])=>rr>=1&&rr<=H&&cc>=1&&cc<=W); }

  function scoreRow(row){
    const visited = Array.from({length:H},()=>Array.from({length:W},()=>false));
    let total=0;

    function bfs(sr,sc,type){
      let q=[[sr,sc]], idx=0, sum=0, touchesRow=false;
      visited[sr-1][sc-1]=true;
      while(idx<q.length){
        const [r,c]=q[idx++];
        if(row===r) touchesRow=true;
        sum += (VALS[`${r},${c}`]||0);
        for(const [nr,nc] of neighbors4(r,c)){
          if(!visited[nr-1][nc-1] && state.grid[nr-1][nc-1].t===type){
            visited[nr-1][nc-1]=true; q.push([nr,nc]);
          }
        }
      }
      return touchesRow?sum:0;
    }

    for(let r=1;r<=H;r++){
      for(let c=1;c<=W;c++){
        const t = state.grid[r-1][c-1].t;
        if(t===TYPES.house || t===TYPES.forest || t===TYPES.pond){
          if(!visited[r-1][c-1]) total += bfs(r,c,t);
        }
      }
    }
    return total;
  }

  function scorePlazas(){
    let pts=0;
    for(let r=1;r<=H;r++){
      for(let c=1;c<=W;c++){
        if(state.grid[r-1][c-1].t===TYPES.plaza){
          const set=new Set();
          for(const [nr,nc] of neighbors4(r,c)){
            const t=state.grid[nr-1][nc-1].t;
            if(t===TYPES.house) set.add('H');
            else if(t===TYPES.forest) set.add('F');
            else if(t===TYPES.pond) set.add('P');
          }
          if(set.has('H')&&set.has('F')&&set.has('P')) pts+=10;
        }
      }
    }
    return pts;
  }

  // BONUS: panel inline
  function openBonusBar(){
    if(!(state.round>0 && isBonusRound())){ goScoring(); return; }
    state.phase='bonus';
    updateHeader();
    updatePhaseHint();

    updateNextLines();
    renderGrid();

    el.bonusBar.style.display='block';
    updateBonusButtons();
  }
  function hideBonusBar(){ el.bonusBar.style.display='none'; }
  function updateBonusButtons(){
    el.bonusHouse.classList.toggle('used', state.usedBonus.house);
    el.bonusForest.classList.toggle('used', state.usedBonus.forest);
    el.bonusPond.classList.toggle('used', state.usedBonus.pond);
  }
  // wybór bonusu NIE zużywa go – zużycie następuje w onCellClick
  function pickBonus(type){
    const key = type===TYPES.house ? 'house' : (type===TYPES.forest ? 'forest' : 'pond');
    if(state.usedBonus[key]) return;

    state.needPlacements = [{ type, any:true, bonusKey:key }];

    // wizualne zaznaczenie, co wybrano
    el.bonusHouse.classList.toggle('selected', key==='house');
    el.bonusForest.classList.toggle('selected', key==='forest');
    el.bonusPond.classList.toggle('selected', key==='pond');

    renderGrid(); updateNextLines();
  }

  // Przyciski
  el.startBtn.addEventListener('click', startGame);
  el.rollBtn.addEventListener('click', rollDice);
  el.bonusHouse.addEventListener('click', ()=>pickBonus(TYPES.house));
  el.bonusForest.addEventListener('click', ()=>pickBonus(TYPES.forest));
  el.bonusPond.addEventListener('click', ()=>pickBonus(TYPES.pond));

  // Row chooser modal (eksport zamknięcia)
  window.closeRowChooser=closeRowChooser;

  // Init
  renderGrid(); updateHeader(); updatePhaseHint(); updateNextLines();
})();