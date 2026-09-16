(() => {
  const host = document.getElementById('cube-viewer');
  if (!host) return;

  const COLORS = { U:'#f8f8f8', R:'#e53935', F:'#39b54a', D:'#ffd92f', L:'#ff8c2f', B:'#3385ff' };
  const SIZE = 54, GAP = 3, PITCH = SIZE + GAP;
  const ROOT_SIZE = PITCH * 3;

  const style = document.createElement('style');
  style.textContent = `
    .css-cube-host{position:relative!important;isolation:isolate!important;overflow:hidden!important}
    .css-cube-scene{position:absolute!important;inset:0!important;perspective:850px!important;perspective-origin:50% 48%!important;transform-style:preserve-3d!important;overflow:hidden!important}
    .css-cube-root{position:absolute!important;left:50%!important;top:52%!important;width:${ROOT_SIZE}px!important;height:${ROOT_SIZE}px!important;transform-style:preserve-3d!important;transform:translate3d(-50%,-50%,0) rotateX(-27deg) rotateY(-38deg)!important}
    .css-cube-layer{position:absolute!important;inset:0!important;transform-style:preserve-3d!important;transform-origin:50% 50%!important}
    .css-cubie{position:absolute!important;width:${SIZE}px!important;height:${SIZE}px!important;left:0!important;top:0!important;transform-origin:50% 50%!important;transform-style:preserve-3d!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .css-cubie-face{position:absolute!important;left:0!important;top:0!important;width:${SIZE}px!important;height:${SIZE}px!important;background:#080b12!important;border:1px solid #000!important;border-radius:5px!important;backface-visibility:hidden!important;transform-style:preserve-3d!important;box-shadow:0 1px 2px #0008!important}
    .css-sticker{position:absolute!important;left:4px!important;top:4px!important;width:${SIZE-8}px!important;height:${SIZE-8}px!important;border-radius:5px!important;border:1px solid #080b12!important;backface-visibility:hidden!important;box-shadow:inset 0 0 0 1px #0003,0 0 2px #0008!important}
    .css-turn-indicator{position:absolute!important;top:10px!important;left:50%!important;transform:translateX(-50%)!important;padding:7px 12px!important;border-radius:999px!important;background:#0b1020E8!important;color:#fff!important;font:800 13px/1.1 system-ui,sans-serif!important;letter-spacing:.3px!important;opacity:0!important;transition:opacity .12s ease!important;pointer-events:none!important;z-index:5!important;white-space:nowrap!important;box-shadow:0 4px 14px #0006!important}
    .css-turn-indicator.visible{opacity:1!important}
  `;
  document.head.appendChild(style);

  host.classList.add('css-cube-host');
  host.innerHTML = '';

  const scene = document.createElement('div');
  scene.className = 'css-cube-scene';
  const root = document.createElement('div');
  root.className = 'css-cube-root';
  const layer = document.createElement('div');
  layer.className = 'css-cube-layer';
  root.appendChild(layer);
  scene.appendChild(root);
  host.appendChild(scene);

  const turnIndicator = document.createElement('div');
  turnIndicator.className = 'css-turn-indicator';
  scene.appendChild(turnIndicator);

  const cubies = [];

  function identity(){ return [1,0,0,0,1,0,0,0,1]; }
  function multiply3(a,b){
    const r=new Array(9).fill(0);
    for(let row=0;row<3;row++) for(let col=0;col<3;col++)
      r[row*3+col]=a[row*3]*b[col]+a[row*3+1]*b[3+col]+a[row*3+2]*b[6+col];
    return r;
  }
  function rotateMatrix(axis,angle){
    const c=Math.cos(angle),s=Math.sin(angle);
    if(axis==='x')return [1,0,0,0,c,-s,0,s,c];
    if(axis==='y')return [c,0,s,0,1,0,-s,0,c];
    return [c,-s,0,s,c,0,0,0,1];
  }
  function transformVector(m,v){return{x:m[0]*v.x+m[1]*v.y+m[2]*v.z,y:m[3]*v.x+m[4]*v.y+m[5]*v.z,z:m[6]*v.x+m[7]*v.y+m[8]*v.z};}
  function matrixCss(m){return `matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`;}

  function faceletIndex(face,x,y,z){
    let row,col;
    if(face==='F'){row=1-y;col=x+1;}
    else if(face==='B'){row=1-y;col=1-x;}
    else if(face==='R'){row=1-y;col=1-z;}
    else if(face==='L'){row=1-y;col=z+1;}
    else if(face==='U'){row=z+1;col=x+1;}
    else {row=1-z;col=x+1;}
    return row*3+col;
  }
  function inputState(){
    const s=window.rubiksViewerState;
    if(!s)return null;
    const out={};
    for(const f of ['U','R','F','D','L','B'])out[f]=Array.isArray(s[f])?[...s[f]]:null;
    return out;
  }
  function colorFor(face,x,y,z,state){
    const v=state?.[face]?.[faceletIndex(face,x,y,z)];
    return COLORS[v]||COLORS[face];
  }

  const faceTransforms={
    F:`translateZ(${SIZE/2}px)`,
    B:`rotateY(180deg) translateZ(${SIZE/2}px)`,
    R:`rotateY(90deg) translateZ(${SIZE/2}px)`,
    L:`rotateY(-90deg) translateZ(${SIZE/2}px)`,
    U:`rotateX(90deg) translateZ(${SIZE/2}px)`,
    D:`rotateX(-90deg) translateZ(${SIZE/2}px)`
  };

  function addFace(cubie,face,color){
    const faceEl=document.createElement('div');
    faceEl.className='css-cubie-face';
    faceEl.style.transform=faceTransforms[face];
    if(color){
      const sticker=document.createElement('div');
      sticker.className='css-sticker';
      sticker.style.background=color;
      faceEl.appendChild(sticker);
    }
    cubie.el.appendChild(faceEl);
  }

  function renderCubie(c){
    c.el.style.transform=`translate3d(${(c.pos.x+1)*PITCH}px,${(1-c.pos.y)*PITCH}px,${c.pos.z*PITCH}px) ${matrixCss(c.orientation)}`;
  }

  function makeCubie(x,y,z,state){
    const el=document.createElement('div');
    el.className='css-cubie';
    const c={pos:{x,y,z},orientation:identity(),el};
    addFace(c,'F',z===1?colorFor('F',x,y,z,state):null);
    addFace(c,'B',z===-1?colorFor('B',x,y,z,state):null);
    addFace(c,'R',x===1?colorFor('R',x,y,z,state):null);
    addFace(c,'L',x===-1?colorFor('L',x,y,z,state):null);
    addFace(c,'U',y===1?colorFor('U',x,y,z,state):null);
    addFace(c,'D',y===-1?colorFor('D',x,y,z,state):null);
    root.appendChild(el);
    cubies.push(c);
    renderCubie(c);
  }

  function buildFromInput(){
    root.innerHTML='';
    root.appendChild(layer);
    layer.innerHTML='';
    cubies.length=0;
    const s=inputState();
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)makeCubie(x,y,z,s);
  }

  function parseMove(move){
    const face=move[0],prime=move.includes("'"),twice=move.includes('2');
    let axis='x',layerPos=1,dir=1;
    if(face==='R'){axis='x';layerPos=1;dir=-1;}
    if(face==='L'){axis='x';layerPos=-1;dir=1;}
    if(face==='U'){axis='y';layerPos=1;dir=-1;}
    if(face==='D'){axis='y';layerPos=-1;dir=1;}
    if(face==='F'){axis='z';layerPos=1;dir=-1;}
    if(face==='B'){axis='z';layerPos=-1;dir=1;}
    if(prime)dir*=-1;
    return{axis,layer:layerPos,angle:dir*(twice?Math.PI:Math.PI/2),dir};
  }

  function updateLayerState(selected,move){
    const m=parseMove(move),rot=rotateMatrix(m.axis,m.angle);
    selected.forEach(c=>{
      c.pos=transformVector(rot,c.pos);
      c.pos.x=Math.round(c.pos.x);c.pos.y=Math.round(c.pos.y);c.pos.z=Math.round(c.pos.z);
      c.orientation=multiply3(rot,c.orientation);
      renderCubie(c);
    });
  }

  function solutionMoves(){return [...document.querySelectorAll('#moves .move')].map(b=>b.textContent.trim()).filter(Boolean);}
  let moves=[],viewerStep=0,playing=false,busy=false,generation=0;
  const playBtn=document.getElementById('viewer-play'),prevBtn=document.getElementById('viewer-prev'),nextBtn=document.getElementById('viewer-next'),speed=document.getElementById('viewer-speed'),stepLabel=document.getElementById('step-label'),current=document.getElementById('current-move');

  function syncLabel(){
    stepLabel.textContent=viewerStep===0?'Ready':`Step ${viewerStep} of ${moves.length}`;
    current.textContent=viewerStep?moves[viewerStep-1]:'—';
    document.querySelectorAll('#moves .move').forEach((b,i)=>b.classList.toggle('active',i===viewerStep-1));
  }
  function showTurnIndicator(move,reverse=false){
    if(!move)return;
    turnIndicator.textContent=move.includes('2')?`${reverse?'↺':'↻'} 2× TURN`:`${reverse?'↺':'↻'} ${move}`;
    turnIndicator.classList.add('visible');
    clearTimeout(showTurnIndicator.timer);
    showTurnIndicator.timer=setTimeout(()=>turnIndicator.classList.remove('visible'),520);
  }
  function resetToStart(){generation++;playing=false;busy=false;playBtn.textContent='▶ Play';buildFromInput();viewerStep=0;syncLabel();}

  async function animateMove(move,reverse=false){
    const m=parseMove(move);
    const selected=cubies.filter(c=>Math.round(c.pos[m.axis])===m.layer);
    if(!selected.length)return;
    busy=true;
    const duration=(Number(speed.value)||700)>900?520:(Number(speed.value)||700)>500?420:300;
    selected.forEach(c=>c.el.style.transition=`transform ${duration}ms cubic-bezier(.2,.8,.2,1)`);
    selected.forEach(c=>layer.appendChild(c.el));
    layer.style.transition=`transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
    layer.style.transform=`rotate${m.axis.toUpperCase()}(${m.angle}rad)`;
    showTurnIndicator(move,reverse);
    await new Promise(resolve=>setTimeout(resolve,duration+25));
    generation += 0;
    updateLayerState(selected,move);
    layer.style.transition='none';
    layer.style.transform='none';
    selected.forEach(c=>{c.el.style.transition='none';root.appendChild(c.el);renderCubie(c);});
    busy=false;
  }

  async function setStep(n){
    const target=Math.max(0,Math.min(moves.length,n));
    generation++;playing=false;busy=false;playBtn.textContent='▶ Play';
    buildFromInput();
    for(let i=0;i<target;i++){
      const m=parseMove(moves[i]),selected=cubies.filter(c=>Math.round(c.pos[m.axis])===m.layer);
      updateLayerState(selected,moves[i]);
    }
    viewerStep=target;syncLabel();
  }
  async function stepBy(delta){
    if(busy||playing)return;
    const target=Math.max(0,Math.min(moves.length,viewerStep+delta));
    if(target===viewerStep)return;
    const move=delta>0?moves[viewerStep]:inverse(moves[viewerStep-1]);
    const indicator=delta>0?moves[viewerStep]:moves[viewerStep-1];
    await animateMove(move,delta<0);
    viewerStep=target;syncLabel();
  }
  async function play(){
    if(playing){generation++;playing=false;playBtn.textContent='▶ Play';return;}
    if(viewerStep>=moves.length)await setStep(0);
    playing=true;playBtn.textContent='⏸ Pause';const token=generation;
    while(playing&&token===generation&&viewerStep<moves.length){
      await animateMove(moves[viewerStep]);
      if(token!==generation)return;
      viewerStep++;syncLabel();
    }
    if(token===generation){playing=false;playBtn.textContent='▶ Play';}
  }
  function inverse(m){return m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");}

  playBtn.addEventListener('click',play);
  prevBtn.addEventListener('click',()=>stepBy(-1));
  nextBtn.addEventListener('click',()=>stepBy(1));
  document.getElementById('prev').addEventListener('click',()=>stepBy(-1));
  document.getElementById('next').addEventListener('click',()=>stepBy(1));
  document.getElementById('reset').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';buildFromInput();syncLabel();});
  document.getElementById('scramble').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';buildFromInput();syncLabel();});

  function refresh(){
    const next=solutionMoves();
    if(!next.length)return;
    if(next.join(' ')!==moves.join(' ')){moves=next;resetToStart();}
    document.querySelectorAll('#moves .move').forEach((b,i)=>{b.onclick=()=>setStep(i+1);});
  }
  const solutionCard=document.getElementById('solution-card');
  const observer=new MutationObserver(refresh);
  if(solutionCard)observer.observe(solutionCard,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  buildFromInput();
  syncLabel();
})();