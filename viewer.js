(() => {
  const host = document.getElementById('cube-viewer');
  if (!host || !window.THREE) return;

  const T = THREE;
  const colors = { U:0xf8f8f8, R:0xe53935, F:0x39b54a, D:0xffd92f, L:0xff8c2f, B:0x3385ff };
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(5.3, 4.4, 7.2);
  camera.lookAt(0, 0, 0);

  const renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  scene.add(new T.HemisphereLight(0xffffff, 0x26304a, 2.1));
  const key = new T.DirectionalLight(0xffffff, 2.5); key.position.set(5,8,9); scene.add(key);
  const fill = new T.DirectionalLight(0x8fb8ff, 1.1); fill.position.set(-6,2,-4); scene.add(fill);

  const cubeRoot = new T.Group();
  cubeRoot.rotation.set(T.MathUtils.degToRad(-18), T.MathUtils.degToRad(-30), 0);
  scene.add(cubeRoot);

  const cubies = [];
  const cubeSize = 0.96, gap = 0.055, pitch = cubeSize + gap;
  const black = new T.MeshStandardMaterial({color:0x080b12, roughness:.6, metalness:.08});
  const inner = new T.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const stickerGeo = new T.PlaneGeometry(0.78, 0.78);

  function sticker(material, pos, rot){
    const m = new T.Mesh(stickerGeo, material);
    m.position.copy(pos); m.rotation.set(rot.x,rot.y,rot.z); return m;
  }

  function makeCubie(x,y,z){
    const g = new T.Group();
    g.position.set(x*pitch,y*pitch,z*pitch);
    g.add(new T.Mesh(inner, black));
    const makeMat = c => new T.MeshStandardMaterial({color:colors[c],roughness:.38,metalness:.03,side:T.DoubleSide});
    const off = cubeSize/2 + .006;
    if(x===1) g.add(sticker(makeMat('R'),new T.Vector3(off,0,0),new T.Vector3(0,Math.PI/2,0)));
    if(x===-1) g.add(sticker(makeMat('L'),new T.Vector3(-off,0,0),new T.Vector3(0,-Math.PI/2,0)));
    if(y===1) g.add(sticker(makeMat('U'),new T.Vector3(0,off,0),new T.Vector3(-Math.PI/2,0,0)));
    if(y===-1) g.add(sticker(makeMat('D'),new T.Vector3(0,-off,0),new T.Vector3(Math.PI/2,0,0)));
    if(z===1) g.add(sticker(makeMat('F'),new T.Vector3(0,0,off),new T.Vector3(0,0,0)));
    if(z===-1) g.add(sticker(makeMat('B'),new T.Vector3(0,0,-off),new T.Vector3(0,Math.PI,0)));
    const item={mesh:g,pos:{x,y,z}}; cubies.push(item); cubeRoot.add(g); return item;
  }

  function buildSolved(){
    while(cubeRoot.children.length) cubeRoot.remove(cubeRoot.children[0]);
    cubies.length=0;
    for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++) makeCubie(x,y,z);
  }

  function parseMove(move){
    const face=move[0]; const prime=move.includes("'"); const twice=move.includes('2');
    let axis='x', layer=1, dir=1;
    if(face==='R'){axis='x';layer=1;dir=1}
    if(face==='L'){axis='x';layer=-1;dir=-1}
    if(face==='U'){axis='y';layer=1;dir=1}
    if(face==='D'){axis='y';layer=-1;dir=-1}
    if(face==='F'){axis='z';layer=1;dir=-1}
    if(face==='B'){axis='z';layer=-1;dir=1}
    if(prime) dir*=-1;
    return {axis,layer,angle:dir*(twice?Math.PI:Math.PI/2)};
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

  function animateMove(move, ms){
    return new Promise(resolve=>{
      const m=parseMove(move), selected=selectedFor(m), layer=new T.Group();
      cubeRoot.add(layer); selected.forEach(c=>layer.attach(c.mesh));
      const start=performance.now();
      function frame(now){
        const t=Math.min(1,(now-start)/ms), e=1-Math.pow(1-t,3), a=m.angle*e;
        layer.rotation.set(0,0,0);
        if(m.axis==='x') layer.rotation.x=a;
        if(m.axis==='y') layer.rotation.y=a;
        if(m.axis==='z') layer.rotation.z=a;
        if(t<1){requestAnimationFrame(frame)}else{finishLayer(layer,selected);resolve()}
      }
      requestAnimationFrame(frame);
    });
  }

  function inverse(m){ return m.endsWith('2') ? m : (m.endsWith("'") ? m.slice(0,-1) : m+"'"); }
  function solutionMoves(){ return [...document.querySelectorAll('#moves .move')].map(b=>b.textContent.trim()).filter(Boolean); }

  let moves=[], viewerStep=0, playing=false, generation=0;
  const playBtn=document.getElementById('viewer-play'), prevBtn=document.getElementById('viewer-prev'), nextBtn=document.getElementById('viewer-next'), speed=document.getElementById('viewer-speed');
  const stepLabel=document.getElementById('step-label'), current=document.getElementById('current-move');

  function syncLabel(){
    stepLabel.textContent=viewerStep===0?'Ready':`Step ${viewerStep} of ${moves.length}`;
    current.textContent=viewerStep?moves[viewerStep-1]:'—';
    document.querySelectorAll('#moves .move').forEach((b,i)=>b.classList.toggle('active',i===viewerStep-1));
  }

  function resetToStart(){
    generation++; playing=false; playBtn.textContent='▶ Play'; buildSolved();
    const scramble=[...moves].reverse().map(inverse);
    scramble.forEach(moveInstant); viewerStep=0; syncLabel();
  }

  async function setStep(n){
    const target=Math.max(0,Math.min(moves.length,n));
    generation++; playing=false; playBtn.textContent='▶ Play';
    buildSolved();
    const scramble=[...moves].reverse().map(inverse);
    scramble.forEach(moveInstant);
    for(let i=0;i<target;i++) moveInstant(moves[i]);
    viewerStep=target; syncLabel();
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
  prevBtn.addEventListener('click',()=>setStep(viewerStep-1));
  nextBtn.addEventListener('click',()=>setStep(viewerStep+1));
  document.getElementById('prev').addEventListener('click',()=>setStep(viewerStep-1));
  document.getElementById('next').addEventListener('click',()=>setStep(viewerStep+1));
  document.getElementById('reset').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;generation++;playBtn.textContent='▶ Play';buildSolved();syncLabel()});
  document.getElementById('scramble').addEventListener('click',()=>{moves=[];viewerStep=0;playing=false;generation++;playBtn.textContent='▶ Play';buildSolved();syncLabel()});

  let drag=false,lastX=0,lastY=0;
  host.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);host.classList.add('dragging')});
  host.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;cubeRoot.rotation.y+=dx*.012;cubeRoot.rotation.x+=dy*.012});
  const end=()=>{drag=false;host.classList.remove('dragging')}; host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);

  function refresh(){
    const next=solutionMoves(); if(!next.length)return;
    const changed=next.join(' ')!==moves.join(' ');
    if(changed){moves=next;resetToStart()}
    document.querySelectorAll('#moves .move').forEach((b,i)=>{b.onclick=()=>setStep(i+1)});
  }
  const observer=new MutationObserver(refresh);
  observer.observe(document.getElementById('solution-card'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(Math.max(1,w),Math.max(1,h),false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  window.addEventListener('resize',resize); resize(); buildSolved();
  renderer.setAnimationLoop(()=>renderer.render(scene,camera));
})();