(() => {
  const host = document.getElementById('cube-viewer');
  if (!host) return;

  const COLORS = {
    U: '#f8f8f8',
    R: '#e53935',
    F: '#39b54a',
    D: '#ffd92f',
    L: '#ff8c2f',
    B: '#3385ff'
  };

  const cubePx = 56;
  const gapPx = 4;
  const pitchPx = cubePx + gapPx;
  const half = cubePx / 2;

  host.classList.add('css-cube-host');
  host.innerHTML = '';

  const scene = document.createElement('div');
  scene.className = 'css-cube-scene';
  const root = document.createElement('div');
  root.className = 'css-cube-root';
  scene.appendChild(root);
  host.appendChild(scene);

  const turnIndicator = document.createElement('div');
  turnIndicator.className = 'css-turn-indicator';
  scene.appendChild(turnIndicator);

  const cubies = [];

  function identity() {
    return [1,0,0, 0,1,0, 0,0,1];
  }

  function multiply3(a, b) {
    const r = new Array(9).fill(0);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        r[row * 3 + col] =
          a[row * 3 + 0] * b[0 * 3 + col] +
          a[row * 3 + 1] * b[1 * 3 + col] +
          a[row * 3 + 2] * b[2 * 3 + col];
      }
    }
    return r;
  }

  function rotateMatrix(axis, angle) {
    const c = Math.round(Math.cos(angle) * 1000000) / 1000000;
    const s = Math.round(Math.sin(angle) * 1000000) / 1000000;
    if (axis === 'x') return [1,0,0, 0,c,-s, 0,s,c];
    if (axis === 'y') return [c,0,s, 0,1,0, -s,0,c];
    return [c,-s,0, s,c,0, 0,0,1];
  }

  function transformVector(m, v) {
    return {
      x: m[0]*v.x + m[1]*v.y + m[2]*v.z,
      y: m[3]*v.x + m[4]*v.y + m[5]*v.z,
      z: m[6]*v.x + m[7]*v.y + m[8]*v.z
    };
  }

  function matrixCss(m) {
    return `matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`;
  }

  function faceletIndex(face, x, y, z) {
    let row, col;
    if (face === 'F') { row = 1-y; col = x+1; }
    else if (face === 'B') { row = 1-y; col = 1-x; }
    else if (face === 'R') { row = 1-y; col = 1-z; }
    else if (face === 'L') { row = 1-y; col = z+1; }
    else if (face === 'U') { row = z+1; col = x+1; }
    else { row = 1-z; col = x+1; }
    return row*3+col;
  }

  function inputState() {
    const s = window.rubiksViewerState;
    if (!s) return null;
    const out = {};
    for (const f of ['U','R','F','D','L','B']) {
      out[f] = Array.isArray(s[f]) ? [...s[f]] : null;
    }
    return out;
  }

  function colorFor(face, x, y, z, state) {
    const value = state?.[face]?.[faceletIndex(face, x, y, z)];
    return COLORS[value] || COLORS[face];
  }

  const faceTransforms = {
    R: `translateZ(${half}px) rotateY(90deg)`,
    L: `translateZ(${half}px) rotateY(-90deg)`,
    U: `translateZ(${half}px) rotateX(90deg)`,
    D: `translateZ(${half}px) rotateX(-90deg)`,
    F: `translateZ(${half}px)`,
    B: `translateZ(${half}px) rotateY(180deg)`
  };

  function addSticker(cubie, face, color) {
    const el = document.createElement('div');
    el.className = `css-sticker css-sticker-${face}`;
    el.style.background = color;
    el.style.transform = faceTransforms[face];
    cubie.el.appendChild(el);
  }

  function renderCubie(c) {
    c.el.style.transform =
      `translate3d(${c.pos.x * pitchPx - half}px,${-c.pos.y * pitchPx - half}px,${c.pos.z * pitchPx}px) ${matrixCss(c.orientation)}`;
  }

  function makeCubie(x, y, z, state) {
    const el = document.createElement('div');
    el.className = 'css-cubie';
    const c = { pos:{x,y,z}, orientation:identity(), el };

    if (x === 1) addSticker(c, 'R', colorFor('R',x,y,z,state));
    if (x === -1) addSticker(c, 'L', colorFor('L',x,y,z,state));
    if (y === 1) addSticker(c, 'U', colorFor('U',x,y,z,state));
    if (y === -1) addSticker(c, 'D', colorFor('D',x,y,z,state));
    if (z === 1) addSticker(c, 'F', colorFor('F',x,y,z,state));
    if (z === -1) addSticker(c, 'B', colorFor('B',x,y,z,state));

    root.appendChild(el);
    cubies.push(c);
    renderCubie(c);
  }

  function buildFromInput() {
    root.innerHTML = '';
    cubies.length = 0;
    const s = inputState();
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) makeCubie(x, y, z, s);
      }
    }
  }

  function parseMove(move) {
    const face = move[0];
    const prime = move.includes("'");
    const twice = move.includes('2');
    let axis = 'x', layer = 1, dir = 1;
    if (face === 'R') {axis='x'; layer=1; dir=-1;}
    if (face === 'L') {axis='x'; layer=-1; dir=1;}
    if (face === 'U') {axis='y'; layer=1; dir=-1;}
    if (face === 'D') {axis='y'; layer=-1; dir=1;}
    if (face === 'F') {axis='z'; layer=1; dir=-1;}
    if (face === 'B') {axis='z'; layer=-1; dir=1;}
    if (prime) dir *= -1;
    return {axis, layer, angle:dir*(twice?Math.PI:Math.PI/2)};
  }

  function applyMove(move) {
    const m = parseMove(move);
    const rot = rotateMatrix(m.axis, m.angle);
    cubies.filter(c => Math.round(c.pos[m.axis]) === m.layer).forEach(c => {
      c.pos = transformVector(rot, c.pos);
      c.pos.x = Math.round(c.pos.x); c.pos.y = Math.round(c.pos.y); c.pos.z = Math.round(c.pos.z);
      c.orientation = multiply3(rot, c.orientation);
      renderCubie(c);
    });
  }

  function solutionMoves() {
    return [...document.querySelectorAll('#moves .move')].map(b => b.textContent.trim()).filter(Boolean);
  }

  let moves = [], viewerStep = 0, playing = false, busy = false, generation = 0;
  const playBtn=document.getElementById('viewer-play');
  const prevBtn=document.getElementById('viewer-prev');
  const nextBtn=document.getElementById('viewer-next');
  const speed=document.getElementById('viewer-speed');
  const stepLabel=document.getElementById('step-label');
  const current=document.getElementById('current-move');

  function syncLabel() {
    stepLabel.textContent = viewerStep===0 ? 'Ready' : `Step ${viewerStep} of ${moves.length}`;
    current.textContent = viewerStep ? moves[viewerStep-1] : '—';
    document.querySelectorAll('#moves .move').forEach((b,i)=>b.classList.toggle('active',i===viewerStep-1));
  }

  function showTurnIndicator(move, reverse=false) {
    if (!move) return;
    turnIndicator.textContent = move.includes('2') ? `${reverse?'↺':'↻'} 2× TURN` : `${reverse?'↺':'↻'} ${move}`;
    turnIndicator.classList.add('visible');
    clearTimeout(showTurnIndicator.timer);
    showTurnIndicator.timer = setTimeout(() => turnIndicator.classList.remove('visible'), 500);
  }

  function resetToStart() {
    generation++; playing=false; busy=false; playBtn.textContent='▶ Play';
    buildFromInput(); viewerStep=0; syncLabel();
  }

  async function setStep(n) {
    const target=Math.max(0,Math.min(moves.length,n));
    generation++; playing=false; busy=false; playBtn.textContent='▶ Play';
    buildFromInput();
    for(let i=0;i<target;i++) applyMove(moves[i]);
    viewerStep=target; syncLabel();
  }

  function wait(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

  async function stepBy(delta) {
    if(busy || playing) return;
    const target=Math.max(0,Math.min(moves.length,viewerStep+delta));
    if(target===viewerStep) return;
    busy=true;
    const move=delta>0?moves[viewerStep]:inverse(moves[viewerStep-1]);
    const indicatorMove=delta>0?moves[viewerStep]:moves[viewerStep-1];
    applyMove(move); showTurnIndicator(indicatorMove,delta<0);
    await wait(Math.min(420,Number(speed.value)||700));
    viewerStep=target; syncLabel(); busy=false;
  }

  async function play() {
    if(playing){generation++;playing=false;playBtn.textContent='▶ Play';return;}
    if(viewerStep>=moves.length) await setStep(0);
    playing=true; playBtn.textContent='⏸ Pause'; const token=generation;
    while(playing && token===generation && viewerStep<moves.length){
      const move=moves[viewerStep]; applyMove(move); showTurnIndicator(move);
      await wait(Math.min(420,Number(speed.value)||700));
      if(token!==generation)return;
      viewerStep++; syncLabel();
    }
    if(token===generation){playing=false;playBtn.textContent='▶ Play';}
  }

  function inverse(m){ return m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'"); }

  playBtn.addEventListener('click',play);
  prevBtn.addEventListener('click',()=>stepBy(-1));
  nextBtn.addEventListener('click',()=>stepBy(1));
  document.getElementById('prev').addEventListener('click',()=>stepBy(-1));
  document.getElementById('next').addEventListener('click',()=>stepBy(1));

  document.getElementById('reset').addEventListener('click',()=>{
    moves=[]; viewerStep=0; playing=false; busy=false; generation++;
    playBtn.textContent='▶ Play'; buildFromInput(); syncLabel();
  });
  document.getElementById('scramble').addEventListener('click',()=>{
    moves=[]; viewerStep=0; playing=false; busy=false; generation++;
    playBtn.textContent='▶ Play'; buildFromInput(); syncLabel();
  });

  function refresh() {
    const next=solutionMoves();
    if(!next.length)return;
    const changed=next.join(' ')!==moves.join(' ');
    if(changed){moves=next;resetToStart();}
    document.querySelectorAll('#moves .move').forEach((b,i)=>{b.onclick=()=>setStep(i+1);});
  }

  const solutionCard=document.getElementById('solution-card');
  const observer=new MutationObserver(refresh);
  if(solutionCard) observer.observe(solutionCard,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  buildFromInput();
  syncLabel();
})();