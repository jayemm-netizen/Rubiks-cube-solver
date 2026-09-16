(() => {
  const host=document.getElementById('cube-viewer'); if(!host)return;
  const COLORS={U:'#f8f8f8',R:'#e53935',F:'#39b54a',D:'#ffd92f',L:'#ff8c2f',B:'#3385ff'};
  const SIZE=54,GAP=3,PITCH=SIZE+GAP,ROOT_SIZE=PITCH*3;
  const css=document.createElement('style');css.textContent=`
    .css-cube-host{position:relative!important;isolation:isolate!important;overflow:hidden!important}
    .css-cube-scene{position:absolute!important;inset:0!important;perspective:850px!important;perspective-origin:50% 48%!important;transform-style:preserve-3d!important;overflow:hidden!important}
    .css-cube-root{position:absolute!important;left:50%!important;top:52%!important;width:${ROOT_SIZE}px!important;height:${ROOT_SIZE}px!important;transform-style:preserve-3d!important;transform:translate3d(-50%,-50%,0) rotateX(-27deg) rotateY(-38deg)!important}
    .css-cube-layer{position:absolute!important;inset:0!important;transform-style:preserve-3d!important;transform-origin:50% 50%!important}
    .css-cubie{position:absolute!important;width:${SIZE}px!important;height:${SIZE}px!important;left:0!important;top:0!important;transform-origin:50% 50%!important;transform-style:preserve-3d!important;background:transparent!important;border:0!important}
    .css-cubie-face{position:absolute!important;left:0!important;top:0!important;width:${SIZE}px!important;height:${SIZE}px!important;background:transparent!important;border:0!important;box-shadow:none!important;backface-visibility:hidden!important}
    .css-sticker{position:absolute!important;left:3px!important;top:3px!important;width:${SIZE-6}px!important;height:${SIZE-6}px!important;border-radius:5px!important;border:2px solid #070a10!important;box-shadow:inset 0 0 0 1px #ffffff22,0 1px 3px #0009!important;backface-visibility:hidden!important}
    .css-turn-indicator{position:absolute!important;top:10px!important;left:50%!important;transform:translateX(-50%)!important;padding:7px 12px!important;border-radius:999px!important;background:#0b1020ee!important;color:#fff!important;font:800 13px/1.1 system-ui,sans-serif!important;opacity:0!important;transition:opacity .12s ease!important;pointer-events:none!important;z-index:5!important;white-space:nowrap!important}.css-turn-indicator.visible{opacity:1!important}
  `;document.head.appendChild(css);host.classList.add('css-cube-host');host.innerHTML='';
  const scene=document.createElement('div');scene.className='css-cube-scene';const root=document.createElement('div');root.className='css-cube-root';const layer=document.createElement('div');layer.className='css-cube-layer';root.appendChild(layer);scene.appendChild(root);host.appendChild(scene);const indicator=document.createElement('div');indicator.className='css-turn-indicator';scene.appendChild(indicator);const cubies=[];
  const I=()=>[1,0,0,0,1,0,0,0,1];
  function mul(a,b){const r=new Array(9).fill(0);for(let y=0;y<3;y++)for(let x=0;x<3;x++)r[y*3+x]=a[y*3]*b[x]+a[y*3+1]*b[3+x]+a[y*3+2]*b[6+x];return r}
  function rot(axis,a){const c=Math.cos(a),s=Math.sin(a);if(axis==='x')return[1,0,0,0,c,-s,0,s,c];if(axis==='y')return[c,0,s,0,1,0,-s,0,c];return[c,-s,0,s,c,0,0,0,1]}
  function vec(m,v){return{x:m[0]*v.x+m[1]*v.y+m[2]*v.z,y:m[3]*v.x+m[4]*v.y+m[5]*v.z,z:m[6]*v.x+m[7]*v.y+m[8]*v.z}}
  function cm(m){return`matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`}
  function idx(f,x,y,z){let r,c;if(f==='F'){r=1-y;c=x+1}else if(f==='B'){r=1-y;c=1-x}else if(f==='R'){r=1-y;c=1-z}else if(f==='L'){r=1-y;c=z+1}else if(f==='U'){r=z+1;c=x+1}else{r=1-z;c=x+1}return r*3+c}
  function getState(){const s=window.rubiksViewerState;if(!s)return null;const o={};for(const f of ['U','R','F','D','L','B'])o[f]=Array.isArray(s[f])?[...s[f]]:null;return o}
  function col(f,x,y,z,s){return COLORS[s?.[f]?.[idx(f,x,y,z)]]||COLORS[f]}
  const FT={F:`translateZ(${SIZE/2}px)`,B:`rotateY(180deg) translateZ(${SIZE/2}px)`,R:`rotateY(90deg) translateZ(${SIZE/2}px)`,L:`rotateY(-90deg) translateZ(${SIZE/2}px)`,U:`rotateX(90deg) translateZ(${SIZE/2}px)`,D:`rotateX(-90deg) translateZ(${SIZE/2}px)`};
  function face(c,f,color){const e=document.createElement('div');e.className='css-cubie-face';e.style.transform=FT[f];if(color){const s=document.createElement('div');s.className='css-sticker';s.style.background=color;e.appendChild(s)}c.el.appendChild(e)}
  function draw(c){c.el.style.transform=`translate3d(${(c.pos.x+1)*PITCH}px,${(1-c.pos.y)*PITCH}px,${c.pos.z*PITCH}px) ${cm(c.orientation)}`}
  function make(x,y,z,s){const e=document.createElement('div');e.className='css-cubie';const c={pos:{x,y,z},orientation:I(),el:e};face(c,'F',z===1?col('F',x,y,z,s):null);face(c,'B',z===-1?col('B',x,y,z,s):null);face(c,'R',x===1?col('R',x,y,z,s):null);face(c,'L',x===-1?col('L',x,y,z,s):null);face(c,'U',y===1?col('U',x,y,z,s):null);face(c,'D',y===-1?col('D',x,y,z,s):null);root.appendChild(e);cubies.push(c);draw(c)}
  function build(){root.innerHTML='';root.appendChild(layer);layer.innerHTML='';cubies.length=0;const s=getState();for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)make(x,y,z,s)}
  function parse(move){const f=move[0],prime=move.includes("'"),two=move.includes('2');let axis='x',p=1,d=-1;if(f==='L'){p=-1;d=1}if(f==='U'){axis='y';d=-1}if(f==='D'){axis='y';p=-1;d=1}if(f==='F'){axis='z';d=-1}if(f==='B'){axis='z';p=-1;d=1}if(prime)d=-d;return{axis,layer:p,dir:d,two}}
  function apply(sel,m){const r=rot(m.axis,m.dir*Math.PI/2);sel.forEach(c=>{c.pos=vec(r,c.pos);c.pos.x=Math.round(c.pos.x);c.pos.y=Math.round(c.pos.y);c.pos.z=Math.round(c.pos.z);c.orientation=mul(r,c.orientation);draw(c)})}
  function uiMoves(){return[...document.querySelectorAll('#moves .move')].map(b=>b.textContent.trim()).filter(Boolean)}
  let moves=[],step=0,playing=false,busy=false,generation=0;
  const playBtn=document.getElementById('viewer-play'),prevBtn=document.getElementById('viewer-prev'),nextBtn=document.getElementById('viewer-next'),speed=document.getElementById('viewer-speed'),stepLabel=document.getElementById('step-label'),current=document.getElementById('current-move');
  function label(){stepLabel.textContent=step===0?'Ready':`Step ${step} of ${moves.length}`;current.textContent=step?moves[step-1]:'—';document.querySelectorAll('#moves .move').forEach((b,i)=>b.classList.toggle('active',i===step-1))}
  function inverse(m){return m.endsWith('2')?m:m.endsWith("'")?m.slice(0,-1):m+"'"}
  function flash(m){indicator.textContent=m.includes('2')?'↻ '+m[0]+' — 2 × 90°':'↻ '+m;indicator.classList.add('visible');clearTimeout(flash.t);flash.t=setTimeout(()=>indicator.classList.remove('visible'),350)}
  function duration(){return Math.max(600,Math.min(1500,Number(speed.value)||900))}
  async function quarter(move){const m=parse(move),sel=cubies.filter(c=>Math.round(c.pos[m.axis])===m.layer);if(!sel.length)return;const d=duration();busy=true;sel.forEach(c=>c.el.style.transition=`transform ${d}ms cubic-bezier(.2,.8,.2,1)`);layer.style.transition=`transform ${d}ms cubic-bezier(.2,.8,.2,1)`;sel.forEach(c=>layer.appendChild(c.el));layer.style.transform=`rotate${m.axis.toUpperCase()}(${m.dir*Math.PI/2}rad)`;flash(move);await new Promise(r=>setTimeout(r,d+80));apply(sel,m);layer.style.transition='none';layer.style.transform='none';sel.forEach(c=>{c.el.style.transition='none';root.appendChild(c.el);draw(c)});busy=false}
  async function animate(move){const base=move.replace('2','');await quarter(base);if(move.includes('2'))await quarter(base)}
  async function setStep(n){generation++;playing=false;busy=false;playBtn.textContent='▶ Play';build();for(let i=0;i<n;i++){const m=parse(moves[i]);let sel=cubies.filter(c=>Math.round(c.pos[m.axis])===m.layer);apply(sel,m);if(m.two){sel=cubies.filter(c=>Math.round(c.pos[m.axis])===m.layer);apply(sel,m)}}step=n;label()}
  async function stepBy(delta){if(busy||playing)return;const target=Math.max(0,Math.min(moves.length,step+delta));if(target===step)return;await animate(delta>0?moves[step]:inverse(moves[step-1]));step=target;label()}
  async function play(){if(playing){generation++;playing=false;playBtn.textContent='▶ Play';return}if(step>=moves.length)await setStep(0);playing=true;playBtn.textContent='⏸ Pause';const token=generation;while(playing&&token===generation&&step<moves.length){await animate(moves[step]);if(token!==generation)return;step++;label()}if(token===generation){playing=false;playBtn.textContent='▶ Play'}}
  playBtn.addEventListener('click',play);prevBtn.addEventListener('click',()=>stepBy(-1));nextBtn.addEventListener('click',()=>stepBy(1));document.getElementById('prev').addEventListener('click',()=>stepBy(-1));document.getElementById('next').addEventListener('click',()=>stepBy(1));
  document.getElementById('reset').addEventListener('click',()=>{moves=[];step=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';build();label()});
  document.getElementById('scramble').addEventListener('click',()=>{moves=[];step=0;playing=false;busy=false;generation++;playBtn.textContent='▶ Play';build();label()});
  function refresh(){const n=uiMoves();if(!n.length)return;if(n.join(' ')!==moves.join(' ')){moves=n;setStep(0)}document.querySelectorAll('#moves .move').forEach((b,i)=>b.onclick=()=>setStep(i+1))}
  const card=document.getElementById('solution-card');if(card)new MutationObserver(refresh).observe(card,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  build();label();
})();