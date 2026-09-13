const scanner={faceIndex:0,faces:['U','R','F','D','L','B'],stream:null,video:null,canvas:null,detected:[],active:false,starting:false};
const scanColors=['U','R','F','D','L','B'];

function openScanner(){
  if(!navigator.mediaDevices?.getUserMedia){setScanStatus('Camera access is not supported by this browser.');return;}
  const modal=document.getElementById('scanner');
  modal.classList.remove('hidden');
  scanner.faceIndex=0;
  scanner.active=true;
  scanner.video=document.getElementById('scan-video');
  updateScannerUI();
  startCamera();
}
async function startCamera(){
  if(scanner.starting)return;
  scanner.starting=true;
  stopCamera();
  const video=document.getElementById('scan-video');
  scanner.video=video;
  video.pause();
  video.srcObject=null;
  video.removeAttribute('src');
  video.load();
  setScanStatus('Requesting camera access…');
  try{
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    }catch(firstError){
      console.warn('Preferred camera request failed, trying basic video.',firstError);
      stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    }
    scanner.stream=stream;
    video.srcObject=stream;
    video.muted=true;
    video.playsInline=true;
    await waitForVideoReady(video);
    await video.play();
    setScanStatus('Camera ready. Center the cube face inside the 3×3 guide, then tap Scan Face.');
  }catch(e){
    console.error('Camera start failed:',e);
    if(e.name==='NotAllowedError')setScanStatus('Camera permission was denied. In Chrome, allow Camera for this site, then tap Scan Cube again.');
    else if(e.name==='NotFoundError')setScanStatus('No camera was found on this device.');
    else if(e.name==='NotReadableError')setScanStatus('The camera is busy or unavailable. Close other apps using the camera, then try again.');
    else if(e.name==='SecurityError')setScanStatus('Camera access was blocked by the browser security settings.');
    else setScanStatus(`Unable to start the camera (${e.name||'unknown error'}). Tap Scan Cube to try again.`);
    stopCamera();
  }finally{scanner.starting=false}
}
function waitForVideoReady(video){
  if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener('loadedmetadata',onReady);video.removeEventListener('canplay',onReady);resolve()};
    const onReady=()=>{if(video.videoWidth>0&&video.videoHeight>0)finish()};
    const timer=setTimeout(()=>{if(done)return;done=true;video.removeEventListener('loadedmetadata',onReady);video.removeEventListener('canplay',onReady);reject(new Error('Camera video did not become ready.'))},8000);
    video.addEventListener('loadedmetadata',onReady,{once:false});
    video.addEventListener('canplay',onReady,{once:false});
  });
}
function stopCamera(){if(scanner.stream){scanner.stream.getTracks().forEach(t=>t.stop());scanner.stream=null}}
function closeScanner(){scanner.active=false;stopCamera();const video=document.getElementById('scan-video');if(video){video.pause();video.srcObject=null}document.getElementById('scanner').classList.add('hidden')}
function setScanStatus(text){const el=document.getElementById('scan-status');if(el)el.textContent=text}
function updateScannerUI(){
  const face=scanner.faces[scanner.faceIndex];
  document.getElementById('scan-face-name').textContent={U:'UP',R:'RIGHT',F:'FRONT',D:'DOWN',L:'LEFT',B:'BACK'}[face];
  document.getElementById('scan-progress').textContent=`Face ${scanner.faceIndex+1} of 6`;
  document.getElementById('scan-review').classList.add('hidden');
  document.getElementById('scan-capture').classList.remove('hidden');
}
function captureFace(){
  const video=scanner.video;
  if(!scanner.stream||!video||video.readyState<2||!video.videoWidth){setScanStatus('Camera is not ready yet. Please wait a moment or tap Scan Cube again.');return}
  scanner.canvas=document.createElement('canvas');
  scanner.canvas.width=video.videoWidth;scanner.canvas.height=video.videoHeight;
  const ctx=scanner.canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);
  const w=scanner.canvas.width,h=scanner.canvas.height;
  const side=Math.min(w,h)*0.62;const x=(w-side)/2,y=(h-side)/2;
  const cell=side/3;
  scanner.detected=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const px=Math.round(x+(col+.5)*cell),py=Math.round(y+(row+.5)*cell);
    const sample=ctx.getImageData(Math.max(0,px-8),Math.max(0,py-8),17,17).data;
    scanner.detected.push(classifySample(sample));
  }
  renderScanReview();
}
function classifySample(data){
  let r=0,g=0,b=0,n=0;
  for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];n++}
  r/=n;g/=n;b/=n;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  const v=max/255,s=max?d/max:0;
  if(v>.78&&s<.22)return 'U';
  let hue=0;if(d){if(max===r)hue=60*((g-b)/d%6);else if(max===g)hue=60*((b-r)/d+2);else hue=60*((r-g)/d+4);if(hue<0)hue+=360}
  if(hue<10||hue>=345)return 'R';
  if(hue<43)return 'L';
  if(hue<75)return 'D';
  if(hue<165)return 'F';
  return 'B';
}
function renderScanReview(){
  document.getElementById('scan-capture').classList.add('hidden');
  const review=document.getElementById('scan-review');review.classList.remove('hidden');
  const grid=document.getElementById('scan-review-grid');grid.innerHTML='';
  scanner.detected.forEach((c,i)=>{const b=document.createElement('button');b.className='scan-sticker';b.style.background=window.rubiksColors?.[c]||'#888';b.textContent=c;b.title='Tap to change';b.onclick=()=>{scanner.detected[i]=scanColors[(scanColors.indexOf(scanner.detected[i])+1)%6];renderScanReview()};grid.appendChild(b)});
  setScanStatus('Review the detected colors. Tap any sticker to cycle through colors.');
}
function acceptFace(){
  if(!scanner.detected.length){setScanStatus('Scan a face first.');return}
  const face=scanner.faces[scanner.faceIndex];
  if(window.applyScannedFace)window.applyScannedFace(face,scanner.detected.slice());
  if(scanner.faceIndex<5){scanner.faceIndex++;updateScannerUI();setScanStatus(`Face ${face} saved. Now scan the ${document.getElementById('scan-face-name').textContent} face.`)}
  else{setScanStatus('All six faces scanned. Check the cube editor, then tap Solve Cube.');closeScanner()}
}
function rescanFace(){updateScannerUI();setScanStatus('Reposition the cube face and scan again.')}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('scan-open').onclick=openScanner;
  document.getElementById('scan-close').onclick=closeScanner;
  document.getElementById('scan-capture-btn').onclick=captureFace;
  document.getElementById('scan-accept').onclick=acceptFace;
  document.getElementById('scan-rescan').onclick=rescanFace;
});
