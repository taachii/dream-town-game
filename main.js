(function(){
  const W=6,H=5; // kolumny, wiersze
  const TYPES={empty:0, house:1, forest:2, pond:3, plaza:4};
  const TYPE_NAME={1:'Dom',2:'Las',3:'Staw',4:'Plac'};
  const TYPE_TO_CLASS={1:'house',2:'forest',3:'pond',4:'plaza'};
  const TYPE_EMOJI={1:'🏠',2:'🌲',3:'💧',4:'⬜'};
  const DIE_TO_TYPE=(v)=>({1:TYPES.house,2:TYPES.forest,3:TYPES.pond,4:TYPES.house,5:TYPES.forest,6:TYPES.pond}[v]);

  // mapa punktów (wiersz, kolumna)
  const VALS={
    '1,1':3,'1,3':2,'1,4':2,'1,6':3,
    '2,2':1,'2,5':1,
    '3,1':3,'3,3':1,'3,4':1,'3,6':2,
    '4,2':1,'4,5':1,
    '5,1':3,'5,3':2,'5,4':2,'5,6':3
  };

  function sumToRow(sum){
    if(sum===2||sum===12) return 0;
    if(sum===3||sum===4) return 1;
    if(sum===5||sum===6) return 2;
    if(sum===7) return 3;
    if(sum===8||sum===9) return 4;
    if(sum===10||sum===11) return 5;
    return 0;
  }

  const state={
    grid:Array.from({length:H},()=>Array.from({length:W},()=>({t:TYPES.empty})) ),
    round:0,
    phase:'idle',
    dice:[0,0],
    needPlacements:[],
    usedBonus:{house:false,forest:false,pond:false},
    roundPoints:[],
    total:0,
    started:false,
  };

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
    bonusPond:document.getElementById('bonusPond'),
    prepChoice:document.getElementById('prepChoice'),
    prepConfirm:document.getElementById('prepConfirm'),
    prepOk:document.getElementById('prepOk'),
  };

  // ====== FUNKCJE POMOCNICZE ======
  function freeCount(col){
    let cnt=0; for(let r=1;r<=H;r++) if(state.grid[r-1][col-1].t===TYPES.empty) cnt++; return cnt;
  }
  function columnHasEmpty(col){
    for(let r=1;r<=H;r++) if(state.grid[r-1][col-1].t===TYPES.empty) return true;
    return false;
  }
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
    return [];
  }

  function scoringRowCandidate(){
    const [a,b]=state.dice;
    if(!(a&&b)) return 0;
    const sum=a+b;
    const row=sumToRow(sum);
    if(row===0) return 0;
    return (state.phase==='build'||state.phase==='scoring')?row:0;
  }

  // ===== RENDER GRY =====
  function renderGrid(){
    if(state.needPlacements.length>0){
      const req=state.needPlacements[0];
      const allowed=allowedPositionsFor(req);
      if(allowed.length===0){
        pushLog('⚠️ Brak wolnego miejsca — projekt przepada.');
        state.needPlacements.shift();
        advanceAfterPlacement();
        return;
      }
    }

    el.grid.innerHTML='';
    const hasReq=state.needPlacements.length>0;
    const req=hasReq?state.needPlacements[0]:null;

    const corner=document.createElement('div');
    corner.className='hdr';
    el.grid.appendChild(corner);

    for(let c=1;c<=W;c++){
      const h=document.createElement('div');
      h.className='hdr colhdr';
      h.textContent=c;
      h.dataset.col=c;
      el.grid.appendChild(h);
    }

    for(let r=1;r<=H;r++){
      const rh=document.createElement('div');
      rh.className='hdr rowhdr';
      rh.textContent=rowLabel(r);
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

    if(req && !req.any && columnHasEmpty(req.column)){
      [...el.grid.children].forEach(node=>{
        const col=+node.dataset?.col;
        if(col===req.column) node.classList.add('highlight-col');
      });
    }

    const rowToHi=scoringRowCandidate();
    if(rowToHi){
      [...el.grid.children].forEach(node=>{
        if(node.classList?.contains('rowhdr') && +node.dataset.row===rowToHi){
          node.classList.add('row-highlight');
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
    return isCellAllowedWith(state.needPlacements[0],r,c);
  }

  function isCellAllowedWith(need,r,c){
    if(state.grid[r-1][c-1].t!==TYPES.empty) return false;
    if(need.any) return true;
    const targetCol=need.column;
    const colHasFree=columnHasEmpty(targetCol);
    if(colHasFree) return c===targetCol;
    const allowedAdj=nearestBestColumns(targetCol);
    return allowedAdj.includes(c);
  }

  function onCellClick(r,c){
    if(state.needPlacements.length===0) return;
    const need=state.needPlacements[0];
    if(!isCellAllowed(r,c)) return;
    placeAt(r,c,need.type);

    if(need.bonusKey){
      state.usedBonus[need.bonusKey]=true;
      updateHeader();
      updateBonusButtons();
      el.bonusHouse.classList.remove('selected');
      el.bonusForest.classList.remove('selected');
      el.bonusPond.classList.remove('selected');
    }

    state.needPlacements.shift();
    updateNextLines();
    renderGrid();
    advanceAfterPlacement();
  }

  function placeAt(r,c,type){ state.grid[r-1][c-1].t=type; }

  function advanceAfterPlacement(){
    if(state.needPlacements.length>0){renderGrid();updateNextLines();return;}
    if(state.phase==='build'){
      if(isBonusRound() && state.round>0){openBonusBar();}else{goScoring();}
    } else if(state.phase==='bonus'){goScoring();}
    else if(state.phase==='prep'){
      pushLog('🔧 Runda przygotowawcza zakończona. Brak punktów.');
      state.round=1;updateHeader();
      state.phase='idle';updatePhaseHint();
      el.rollBtn.disabled=false;updateNextLines();renderGrid();
    }
  }

  function startGame(){
    state.started=true;
    Object.assign(state,{
      grid:Array.from({length:H},()=>Array.from({length:W},()=>({t:TYPES.empty})) ),
      round:0,phase:'prep',dice:[0,0],needPlacements:[],
      usedBonus:{house:false,forest:false,pond:false},roundPoints:[],total:0
    });
    el.afterMsg.textContent='';
    el.table.innerHTML=''; el.log.innerHTML='';
    el.total.textContent='0';
    el.dieA.textContent='–'; el.dieB.textContent='–';
    closeRowChooser(); hideBonusBar();
    updateHeader(); renderGrid(); updateNextLines();
    el.rollBtn.disabled=false;
    rollDice();
  }

  function updateHeader(){
    el.round.textContent=state.round===0?'Przygot.':state.round;
    el.phase.textContent=state.phase;
    el.sum.textContent=state.dice[0]&&state.dice[1]?(state.dice[0]+state.dice[1]):'–';
    el.bHouse.textContent=state.usedBonus.house?'×':'✓';
    el.bForest.textContent=state.usedBonus.forest?'×':'✓';
    el.bPond.textContent=state.usedBonus.pond?'×':'✓';
  }

  function typeLabel(t){return TYPE_NAME[t]||'-';}

  function updatePhaseHint(){
    if(!state.started){el.hint.style.display='block';return;}
    const [a,b]=state.dice;
    const sum=(a&&b)?a+b:0;
    const tA=DIE_TO_TYPE(a),tB=DIE_TO_TYPE(b);
    let html='';

    switch(state.phase){
      case 'idle': html='Gotowe do rzutu. Kliknij „Rzuć kośćmi”.'; break;
      case 'prep':
        if(a&&b)
          html=`<b>Runda przygotowawcza</b>: wybierz <b>dwie różne</b> struktury i umieść je w kolumnach <b>${a}</b> i <b>${b}</b> (przy dublecie – obie w kolumnie ${a}).`;
        else html='<b>Runda przygotowawcza</b>: kliknij „Rzuć kośćmi”.';
        break;
      case 'build':
        if(a===b)
          html=`Dublet ${a}+${b}: ${TYPE_EMOJI[tA]} ${typeLabel(tA)} → kol. ${b}, potem ⬜ Plac w dowolnym pustym polu.`;
        else
          html=`Budowa: ${TYPE_EMOJI[tA]} ${typeLabel(tA)} → kol. ${b}, potem ${TYPE_EMOJI[tB]} ${typeLabel(tB)} → kol. ${a}.`;
        break;
      case 'bonus':
        html='Runda bonusowa: wybierz jeden z bonusów poniżej i umieść w dowolnym pustym polu.'; break;
      case 'scoring':
        if(sum===2||sum===12) html='Punktacja: wybierz ulicę (dowolny wiersz).';
        else html=`Punktacja: liczona będzie ulica <b>${rowLabel(sumToRow(sum))}</b> (suma ${sum}).`;
        break;
      case 'finished':
        html='Koniec gry. Premia za place doliczona — wynik po prawej.'; break;
    }
    el.hint.innerHTML=html; el.hint.style.display=html?'block':'none';
  }

  function updateNextLines(){
    const a=state.needPlacements[0]; const b=state.needPlacements[1];
    if(a){
      el.nextLine1.style.display='flex';
      el.nextLine1.innerHTML=`Teraz: <span class="chip-mini ${TYPE_TO_CLASS[a.type]}">${TYPE_EMOJI[a.type]}</span> ${typeLabel(a.type)} ${a.any?'— dowolne pole':`→ kol. <b>${a.column}</b>`}`;
    }else el.nextLine1.textContent='—';
    if(b){
      el.nextLine2.style.display='flex';
      el.nextLine2.innerHTML=`Potem: <span class="chip-mini ${TYPE_TO_CLASS[b.type]}">${TYPE_EMOJI[b.type]}</span> ${typeLabel(b.type)} ${b.any?'— dowolne pole':`→ kol. <b>${b.column}</b>`}`;
    }else el.nextLine2.style.display='none';
  }

  function rowLabel(row){
    return row===1?'3–4':row===2?'5–6':row===3?'7':row===4?'8–9':row===5?'10–11':'?';
  }

  function isBonusRound(){return [3,6,9].includes(state.round);}

  // ====== RZUT KOŚĆMI ======
  function rollDice(){
    if(state.phase==='build' && state.needPlacements.length>0) return;
    if(state.round>9) return;
    const a=1+Math.floor(Math.random()*6);
    const b=1+Math.floor(Math.random()*6);
    state.dice=[a,b]; el.dieA.textContent=a; el.dieB.textContent=b;

    if(state.round===0){
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

  // ====== FAZA PRZYGOTOWAWCZA ======
  let prepSelected=[];
  function openPrepChoice(a,b){
    prepSelected=[]; el.prepChoice.style.display='flex'; el.prepConfirm.style.display='none';
    el.prepChoice.querySelectorAll('.pickType').forEach(btn=>{
      btn.classList.remove('selected');
      btn.onclick=()=>{
        const typeKey=btn.dataset.type;
        if(prepSelected.includes(typeKey)){
          prepSelected=prepSelected.filter(x=>x!==typeKey); btn.classList.remove('selected');
        } else {
          if(prepSelected.length<2){ prepSelected.push(typeKey); btn.classList.add('selected'); }
        }
        el.prepConfirm.style.display=prepSelected.length===2?'block':'none';
      };
    });
    el.prepOk.onclick=()=>{
      el.prepChoice.style.display='none';
      const t1=TYPES[prepSelected[0]], t2=TYPES[prepSelected[1]];
      if(a===b){
        state.needPlacements.push({type:t1,column:a});
        state.needPlacements.push({type:t2,column:a});
      } else {
        state.needPlacements.push({type:t1,column:a});
        state.needPlacements.push({type:t2,column:b});
      }
      updateNextLines(); renderGrid();
    };
  }

  function preparePlacementsForRoll(prep){
    const [a,b]=state.dice;
    const tA=DIE_TO_TYPE(a), tB=DIE_TO_TYPE(b);
    state.needPlacements=[];
    if(prep){openPrepChoice(a,b);return;}
    if(a===b){
      state.needPlacements.push({type:tA,column:b});
      state.needPlacements.push({type:TYPES.plaza,any:true});
    } else {
      state.needPlacements.push({type:tA,column:b});
      state.needPlacements.push({type:tB,column:a});
    }
  }

  // ====== DZIENNIK, PUNKTACJA, BONUSY ======
  function pushLog(msg){el.log.innerHTML=`<div>${msg}</div>`+el.log.innerHTML;}

  function goScoring(){
    state.phase='scoring'; updateHeader(); updatePhaseHint(); hideBonusBar(); updateNextLines();
    const sum=state.dice[0]+state.dice[1];
    if(sum===2||sum===12){openRowChooser();} else {finishScoring(sumToRow(sum));}
  }

  function openRowChooser(){
    el.chooseRow.innerHTML='';
    for(let r=1;r<=H;r++){
      const b=document.createElement('button');
      b.textContent=`Ulica ${rowLabel(r)} (wiersz ${r})`;
      b.addEventListener('click',()=>{closeRowChooser();finishScoring(r);});
      el.chooseRow.appendChild(b);
    }
    el.rowModal.style.display='flex';
  }
  function closeRowChooser(){el.rowModal.style.display='none';}

  function finishScoring(row){
    const pts=scoreRow(row);
    if(state.round>0){
      state.roundPoints[state.round-1]=pts;
      appendRoundRow(state.round,pts);
      state.total=state.roundPoints.reduce((a,b)=>a+(b||0),0);
      el.total.textContent=state.total;
    }
    pushLog(`🧮 Punktacja: ulica ${rowLabel(row)} → +<b>${pts}</b> pkt.`);

    if(state.round===9){
      const bonus=scorePlazas();
      state.total+=bonus; el.total.textContent=state.total;
      el.afterMsg.textContent=`Premia za place: +${bonus} pkt. WYNIK KOŃCOWY: ${state.total} pkt.`;
      pushLog(`🏁 Koniec gry. Place: +${bonus} pkt.`);
      state.phase='finished'; updatePhaseHint(); el.rollBtn.disabled=true; return;
    }

    state.round=state.round===0?1:state.round+1;
    state.phase='idle'; state.dice=[0,0];
    el.dieA.textContent='–'; el.dieB.textContent='–';
    updateHeader(); updatePhaseHint(); updateNextLines(); renderGrid();
    el.rollBtn.disabled=false;
  }

  function appendRoundRow(r,pts){
    const tr=document.createElement('tr'); tr.innerHTML=`<td>${r}</td><td>${pts}</td>`; el.table.appendChild(tr);
  }

  function neighbors4(r,c){return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc])=>rr>=1&&rr<=H&&cc>=1&&cc<=W);}

  function scoreRow(row){
    const visited=Array.from({length:H},()=>Array.from({length:W},()=>false));
    let total=0;
    function bfs(sr,sc,type){
      let q=[[sr,sc]],idx=0,sum=0,touchesRow=false;
      visited[sr-1][sc-1]=true;
      while(idx<q.length){
        const [r,c]=q[idx++];
        if(row===r) touchesRow=true;
        sum+=(VALS[`${r},${c}`]||0);
        for(const [nr,nc] of neighbors4(r,c)){
          if(!visited[nr-1][nc-1]&&state.grid[nr-1][nc-1].t===type){
            visited[nr-1][nc-1]=true;q.push([nr,nc]);
          }
        }
      }
      return touchesRow?sum:0;
    }
    for(let r=1;r<=H;r++){
      for(let c=1;c<=W;c++){
        const t=state.grid[r-1][c-1].t;
        if(t===TYPES.house||t===TYPES.forest||t===TYPES.pond){
          if(!visited[r-1][c-1]) total+=bfs(r,c,t);
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
            if(t===TYPES.house)set.add('H');
            else if(t===TYPES.forest)set.add('F');
            else if(t===TYPES.pond)set.add('P');
          }
          if(set.has('H')&&set.has('F')&&set.has('P')) pts+=10;
        }
      }
    }
    return pts;
  }

  function openBonusBar(){
    if(!(state.round>0&&isBonusRound())){goScoring();return;}
    state.phase='bonus';updateHeader();updatePhaseHint();updateNextLines();renderGrid();
    el.bonusBar.style.display='block';updateBonusButtons();
  }
  function hideBonusBar(){el.bonusBar.style.display='none';}
  function updateBonusButtons(){
    el.bonusHouse.classList.toggle('used',state.usedBonus.house);
    el.bonusForest.classList.toggle('used',state.usedBonus.forest);
    el.bonusPond.classList.toggle('used',state.usedBonus.pond);
  }
  function pickBonus(type){
    const key=type===TYPES.house?'house':(type===TYPES.forest?'forest':'pond');
    if(state.usedBonus[key]) return;
    state.needPlacements=[{type,any:true,bonusKey:key}];
    el.bonusHouse.classList.toggle('selected',key==='house');
    el.bonusForest.classList.toggle('selected',key==='forest');
    el.bonusPond.classList.toggle('selected',key==='pond');
    renderGrid(); updateNextLines();
  }

  // ====== EVENTY ======
  el.startBtn.addEventListener('click',startGame);
  el.rollBtn.addEventListener('click',rollDice);
  el.bonusHouse.addEventListener('click',()=>pickBonus(TYPES.house));
  el.bonusForest.addEventListener('click',()=>pickBonus(TYPES.forest));
  el.bonusPond.addEventListener('click',()=>pickBonus(TYPES.pond));
  window.closeRowChooser=closeRowChooser;

  renderGrid(); updateHeader(); updatePhaseHint(); updateNextLines();
})();
