(() => {
  const host = document.getElementById('cube-viewer');
  if (!host || !window.THREE) return;

  const T = THREE;
  const defaultColors = { U:0xf8f8f8, R:0xe53935, F:0x39b54a, D:0xffd92f, L:0xff8c2f, B:0x3385ff };
  let displayColors = {...defaultColors};
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(6.5, 6.5, 6.5);
  camera.lookAt(0, 0, 0);

  const renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.style.position = 'relative';
  host.appendChild(renderer.domElement);

  const turnIndicator = document.createElement('div');
  turnIndicator.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:7px 12px;border-radius:999px;background:rgba(11,16,32,.9);color:#fff;font:700 13px/1.1 system-ui,sans-serif;letter-spacing:.3px;opacity:0;transition:opacity .12s ease;pointer-events:none;z-index:5;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.22);';
  host.appendChild(turnIndicator);

  function showTurnIndicator(move, reverse=false){
    if(move && move.includes('2')){
      turnIndicator.textContent = `${reverse ? '↺' : '↻'} 2× TURN • 2 × 90°`;
      turnIndicator.style.opacity = '1';
    } else {
      turnIndicator.style.opacity = '0';
    }
  }
  function hideTurnIndicator(){ turnIndicator.style.opacity = '0'; }

  scene.add(new T.HemisphereLight(0xffffff, 0x26304a, 2.1));
  const key = new T.DirectionalLight(0xffffff, 2.5); key.position.set(5,8,9); scene.add(key);
  const fill = new T.DirectionalLight(0x8fb8ff, 1.1); fill.position.set(-6,2,-4); scene.add(fill);

  const cubeRoot = new T.Group();
  cubeRoot.rotation.set(0, 0, 0);
  scene.add(cubeRoot);

  const cubies = [];
  const cubeSize = 0.96, gap = 0.055, pitch = cubeSize + gap;
  const black = new T.MeshStandardMaterial({color:0x080b12, roughness:.6, metalness:.08});
  const inner = new T.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const stickerGeo = new T.PlaneGeometry(0.78, 0.78);

  function readDisplayColors(){
    const result={...defaultColors};
    const titleToFace={UP:'U',RIGHT:'R',FRONT:'F',DOWN:'D',LEFT:'L',BACK:'B'};
    document.querySelectorAll('#cube-net .face').forEach(faceEl=>{
      const title=(faceEl.querySelector('.face-title')?.textContent||'').trim();
      const f=titleToFace[title];
      if(!f)return;
      const center=faceEl.querySelectorAll('.sticker')[4];
      if(center){
        const css=getComputedStyle(center).backgroundColor;
        try{result[f]=new T.Color(css).getHex()}catch{}
      }
    });
    return result;
  }

  function inputState(){
    const s=window.rubiksViewerState;
    if(!s)return null;
    const out={};
    for(const f of ['U','R','F','D','L','B']) out[f]=Array.isArray(s[f])?[...s[f]]:null;
    return out;
  }

  function faceletIndex(face,x,y,z){
    let row,col;
    if(face==='F'){ row=1-y; col=x+1; }
    else if(face==='B'){ row=1-y; col=1-x; }
    else if(face==='R'){ row=1-y; col=1-z; }
    else if(face==='L'){ row=1-y; col=z+1; }
    else if(face==='U'){ row=z+1; col=x+1; }
    else if(face==='D'){ row=1-z; col=x+1; }
    return row*3+col;
  }

  function inputStickerColor(face,x,y,z,s){
    const value=s?.[face]?.[faceletIndex(face,x,y,z)];
    return defaultColors[value] ?? displayColors[face];
  }

  function sticker(material, pos, rot){
    const m = new T.Mesh(stickerGeo, material);
    m.position.copy(pos); m.rotation.set(rot.x,rot.y,rot.z); return m;
  }

  function makeCubie(x,y,z,s){
    const g = new T.Group();
    g.position.set(x*pitch,y*pitch,z*pitch);
    g.add(new T.Mesh(inner, black));
    const makeMat = c => new T.MeshStandardMaterial({color:inputStickerColor(c,x,y,z,s),roughness:.38,metalness:.03,side:T.DoubleSide});
    const off = cubeSize/2 + .006;
    if(x===1) g.add(sticker(makeMat('R'),new T.Vector3(off,0,0),new T.Vector3(0,Math.PI/2,0)));
    if(x===-1) g.add(sticker(makeMat('L'),new T.Vector3(-off,0,0),new T.Vector3(0,-Math.PI/2,0)));
    if(y===1) g.add(sticker(makeMat('U'),new T.Vector3(0,off,0),new T.Vector3(-Math.PI/2,0,0)));
    if(y===-1) g.add(sticker(makeMat('D'),new T.Vector3(0,-off,0),new T.Vector3(Math.PI/2,0,0)));
    if(z===1) g.add(sticker(makeMat('F'),new T.Vector3(0,0,off),new T.Vector3(0,0,0)));
    if(z===-1) g.add(sticker(makeMat('B'),new T.Vector3(0,0,-off),new T.Vector3(0,Math.PI,0)));
    const item={mesh:g,pos:{x,y,z}}; cubies.push(item); cubeRoot.add(g); return item;
  }

  function buildFromInput(){
    while(cubeRoot.children.length) cubeRoot.remove(cubeRoot.children[0]);
    cubies.length=0;
    const s=inputState();
    for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++) makeCubie(x,y,z,s);
  }

  function parseMove(move){
    const face=move[0]; const prime=move.includes("'"); const twice=move.includes('2');
    let axis='x', layer=1, dir=1;
    // Signs follow standard Singmaster notation when the cube is viewed
    // from outside the named face: bare moves are clockwise, primes reverse.
    if(face==='R'){axis='x';layer=1;dir=-1}
    if(face==='L'){axis='x';layer=-1;dir=1}
    if(face==='U'){axis='y';layer=1;dir=-1}
    if(face==='D'){axis='y';layer=-1;dir=1}
    if(face==='F'){axis='z';layer=1;dir=-1}
    if(face==='B'){axis='z';layer=-1;dir=1}
    if(prime) dir*=-1;
    return {axis,layer,angle:dir*(twice?Math.PI:Math.PI/2),twice};
  }

  function selectedFor(m){ return cubies.filter(c => Math.round(c.pos[m.axis])===m.layer); }

  function finishLayer(group, selected){
    selected.forEach(c=>cubeRoot.attach(c.mesh));
    selected.forEach(c=>{
      c.mesh.position.x=Math.round(c.mesh.position.x/pitch)*pitch;
      c.mesh.position.y=Math.round(c.mesh.position.y/pitch)*pitch;
      c.mesh.position.z=Math.round(c.mesh.position.z/pitch)*pitch;
      c.pos.x=Math.round(c.mesh.position.x/pitch);
      c.pos.y=Math.round(c.mesh.position.y/pitch);
      c.pos.z=Math.round(c.mesh.position.z/pitch);
    });
    cubeRoot.remove(group);
  }

  function moveInstant(move){
    const m=parseMove(move), selected=selectedFor(m), layer=new T.Group();
    cubeRoot.add(layer); selected.forEach(c=>layer.attach(c.mesh));
    if(m.axis==='x') layer.rotation.x=m.angle;
    if(m.axis==='y') layer.rotation.y=m.angle;
    if(m.axis==='z') layer.rotation.z=m.angle;
    layer.updateMatrixWorld(true); finishLayer(layer,selected);
  }

  function animateQuarter(m, ms, selected){
    return new Promise(resolve=>{
      const layer=new T.Group();
      cubeRoot.add(layer); selected.forEach(c=>layer.attach(c.mesh));
      const start=performance.now();
      function frame(now){
        const t=Math.min(1,(now-start)/ms), e=1-Math.pow(1-t,3), a=(m.angle>0?1:-1)*(Math.PI/2)*e;
        layer.rotation.set(0,0,0);
        if(m.axis==='x') layer.rotation.x=a;
        if(m.axis==='y') layer.rotation.y=a;
        if(m.axis==='z') layer.rotation.z=a;
        if(t<1){requestAnimationFrame(frame)}
        else{finishLayer(layer,selected);resolve()}
      }
      requestAnimationFrame(frame);
    });
  }

  async function animateMove(move, ms, reverseIndicator=false){
    const m=parseMove(move);
    showTurnIndicator(move, reverseIndicator);
    const selected=selectedFor(m);
    if(m.twice){
      await animateQuarter(m,ms,selected);
      await animateQuarter(m,ms,selected);
      hideTurnIndicator();
      return;
    }
    await animateQuarter(m,ms,selected);
    hideTurnIndicator();
  }

  function inverse(m){ return m.endsWith('2') ? m : (m.endsWith("'") ? m.slice(0,-1) : m+"'"); }
  function solutionMoves(){ return [...document.querySelectorAll('#moves .move')].map(b=>b.textContent.trim()).filter(Boolean); }

  let moves=[], viewerStep=0, playing=false, busy=false, generation=0;
  const playBtn=document.getElementById('viewer-play'), prevBtn=document.getElementById('viewer-prev'), nextBtn=document.getElementById('viewer-next'), speed=document.getElementById('viewer-speed');
  const stepLabel=document.getElementById('step-label'), current=document.getElementById('current-move');

  function syncLabel(){
    stepLabel.textContent=viewerStep===0?'Ready':`Step ${viewerStep} of ${moves.length}`;
    current.textContent=viewerStep?moves[viewerStep-1]:'—';
    document.querySelectorAll('#moves .move').forEach((b,i)=>b.classList.toggle('active',i===viewerStep-1));
  }

  function resetToStart(){
    generation++; playing=false; busy=false; playBtn.textContent='▶ Play'; hideTurnIndicator();
    displayColors=readDisplayColors();
    buildFromInput();
    viewerStep=0; syncLabel();
  }

  async function setStep(n){
    const target=Math.max(0,Math.min(moves.length,n));
    generation++; playing=false; busy=false; playBtn.textContent='▶ Play'; hideTurnIndicator();
    displayColors=readDisplayColors();
    buildFromInput();
    for(let i=0;i<target;i++) moveInstant(moves[i]);
    viewerStep=target; syncLabel();
  }

  async function stepBy(delta){
    if(busy || playing) return;
    const target=Math.max(0,Math.min(moves.length,viewerStep+delta));
    if(target===viewerStep) return;
    busy=true;
    const move=delta>0 ? moves[viewerStep] : inverse(moves[viewerStep-1]);
    const indicatorMove=delta>0 ? moves[viewerStep] : moves[viewerStep-1];
    await animateMove(move,Number(speed.value)||700,delta<0 && indicatorMove.includes('2'));
    viewerStep=target;
    syncLabel();
    busy=false;
  }

  async function play(){
    if(playing){generation++;playing=false;playBtn.textContent='▶ Play';return}
    if(viewerStep>=moves.length) await setStep(0);
    playing=true; playBtn.textContent='⏸ Pause'; const token=generation;
    while(playing && token===generation && viewerStep<moves.length){
      const move=moves[viewerStep]; await animateMove(move,Number(speed.value)||700);
      if(token!==generation) return;
      viewerStep++; syncLabel();
    }
    if(token===generation){playing=false;playBtn.textContent='▶ Play'}
  }

  playBtn.addEventListener('click',play);
  prevBtn.addEventListener('click',()=>stepBy(-1));
  nextBtn.addEventListener('click',()=>stepBy(1));
  document.getElementById('prev').addEventListener('click',()=>stepBy(-1));
  document.getElementById('next').addEventListener('click',()=>stepBy(1));
  document.getElementById('reset').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';hideTurnIndicator();displayColors={...defaultColors};buildFromInput();syncLabel()});
  document.getElementById('scramble').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';hideTurnIndicator();displayColors={...defaultColors};buildFromInput();syncLabel()});

  function refresh(){
    const next=solutionMoves(); if(!next.length)return;
    const changed=next.join(' ')!==moves.join(' ');
    if(changed){moves=next;resetToStart()}
    document.querySelectorAll('#moves .move').forEach((b,i)=>{b.onclick=()=>setStep(i+1)});
  }
  const observer=new MutationObserver(refresh);
  observer.observe(document.getElementById('solution-card'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(Math.max(1,w),Math.max(1,h),false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  window.addEventListener('resize',resize); resize(); displayColors=readDisplayColors(); buildFromInput();
  renderer.setAnimationLoop(()=>renderer.render(scene,camera));
})();