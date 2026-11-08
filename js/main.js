import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMarket } from './market.js';

const characterModels=import.meta.glob('/assets/models/*.glb',{eager:true,query:'?url',import:'default'});

(function(){
const $=id=>document.getElementById(id);
let ok=false;try{const c=document.createElement('canvas');ok=!!(c.getContext('webgl')||c.getContext('experimental-webgl'))&&THREE}catch(e){}
if(!ok){$('mtext').textContent='এই ব্রাউজারে WebGL চালু নেই। অন্য একটি আধুনিক ব্রাউজার ব্যবহার করুন।';$('go').style.display='none';return}

// ---------- Scene ----------
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement,$('hud'));
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xf0c58a);
scene.fog=new THREE.Fog(0xf0c58a,40,140);
const cam=new THREE.PerspectiveCamera(60,1,.1,300);
scene.add(new THREE.HemisphereLight(0xffe7c2,0x4a5a3a,1.15));
const sun=new THREE.DirectionalLight(0xffd9a0,.9);
sun.position.set(30,50,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.bias=-.00015;
sun.shadow.normalBias=.02;
Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:140});
scene.add(sun);scene.add(sun.target);

const qualitySettings={
  high:{pixelRatio:1.75,shadows:true,shadowSize:2048},
  medium:{pixelRatio:1.25,shadows:true,shadowSize:1024},
  low:{pixelRatio:1,shadows:false,shadowSize:512},
};
function applyQuality(name){
  const setting=qualitySettings[name]||qualitySettings.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio,setting.pixelRatio));
  renderer.shadowMap.enabled=setting.shadows;
  sun.shadow.mapSize.set(setting.shadowSize,setting.shadowSize);
  sun.shadow.map=null;
  renderer.shadowMap.needsUpdate=true;
  renderer.setSize(innerWidth,innerHeight);
}
const qualitySelect=$('quality');
qualitySelect.addEventListener('change',()=>applyQuality(qualitySelect.value));
applyQuality(qualitySelect.value);

const materials=new Map();
const mat=c=>{
  if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.82}));
  return materials.get(c);
};
function box(w,h,d,c,x,y,z,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(parent||scene).add(m);return m}

// ground, road, footpaths
const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),mat(0x6f8a4a));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
box(140,.1,10,0x3a3835,0,.05,0,0).receiveShadow=true;
for(let x=-65;x<=65;x+=10)box(4,.02,.35,0xf2e6cf,x,.12,0);
[-1,1].forEach(s=>box(140,.25,5,0xb8ad9a,0,.12,s*7.5));

const colliders=[];

// ---------- Characters ----------
function makePerson(skin,shirt,helmetColor,isPlayer){
  const g=new THREE.Group();
  const body=box(.8,1,.45,shirt,0,1.75,0,g);
  const head=box(.55,.55,.55,skin,0,2.55,0,g);
  const hel=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8,0,Math.PI*2,0,Math.PI/2),mat(isPlayer?0x111111:0x5a3a22));
  hel.position.set(0,2.65,0);hel.castShadow=true;g.add(hel);
  if(isPlayer){ // hair, beard
    box(.62,.5,.15,0x1a1410,0,2.5,-.3,g);
    box(.5,.28,.12,0x1a1410,0,2.35,.28,g);
    box(.4,.07,.06,0x1a1410,0,2.48,.3,g);
    box(.42,.08,.04,0xf2e6cf,0,1.9,.24,g).scale.set(1,.5,1);
  }
  const mk=(x,y,w,h,c)=>{const p=new THREE.Group();p.position.set(x,y,0);g.add(p);const m=box(w,h,w,c,0,-h/2,0,p);return p};
  g.userData={armL:mk(-.55,2.2,.25,.9,shirt),armR:mk(.55,2.2,.25,.9,shirt),legL:mk(-.2,1.25,.3,1.25,0x1f1f2b),legR:mk(.2,1.25,.3,1.25,0x1f1f2b)};
  return g;
}
let marketMessageUntil=0;
const marketStatus=$('market-status');
function notifyMarket(message){
  marketStatus.textContent=message;
  marketMessageUntil=performance.now()+3500;
}
const market=createMarket(THREE,scene,box,mat,makePerson,colliders,notifyMarket);
const densitySelect=$('npc-density');
market.setDensity(densitySelect.value);
densitySelect.addEventListener('change',()=>market.setDensity(densitySelect.value));
window.addEventListener('market:police-notified',event=>{
  window.dispatchEvent(new CustomEvent('game:police-notified',{detail:event.detail}));
});
const player=new THREE.Group();
const placeholder=makePerson(0xc8956a,0x151515,0,true);
player.add(placeholder);player.position.set(0,0,0);scene.add(player);
window.__marketDebug=()=>({...market.getDebugState(),playerPosition:{
  x:Math.round(player.position.x*10)/10,
  y:Math.round(player.position.y*10)/10,
  z:Math.round(player.position.z*10)/10,
}});
const characterModel=new THREE.Group();characterModel.visible=false;player.add(characterModel);
const character={
  mixer:null,
  actions:{},
  currentAction:null,
  active:false,
  transient:null,
  transientUntil:0,
};
const characterStateAliases={
  idle:['idle','stand'],
  walk:['walk'],
  run:['running','run','jog'],
  sprint:['sprint','fast run'],
  jump:['jump'],
  landing:['land'],
  turn:['turn'],
  interact:['interact','talk','wave'],
};
const status=$('character-status');
function setCharacterStatus(message){status.textContent=message}
function matchClip(clips,terms){
  return clips.find(clip=>terms.some(term=>String(clip.name||'').toLowerCase().includes(term)));
}
function setCharacterAction(name,fade=.18){
  if(!character.active)return false;
  const action=character.actions[name];
  if(!action||action===character.currentAction)return !!action;
  action.reset();
  action.setLoop(name==='jump'||name==='landing'||name==='turn'||name==='interact'?THREE.LoopOnce:THREE.LoopRepeat,1);
  action.clampWhenFinished=name==='jump'||name==='landing'||name==='turn'||name==='interact';
  action.fadeIn(fade).play();
  if(character.currentAction)character.currentAction.fadeOut(fade);
  character.currentAction=action;
  return true;
}
function triggerCharacterAction(name,duration){
  if(setCharacterAction(name)){
    character.transient=name;
    character.transientUntil=performance.now()+duration*1000;
  }
}
function loadCharacter(gltf){
  const clips=gltf.animations||[];
  let hasSkinnedMesh=false;
  gltf.scene.traverse(object=>{
    if(object.isSkinnedMesh)hasSkinnedMesh=true;
    if(object.isMesh){object.castShadow=true;object.receiveShadow=true}
  });
  if(!hasSkinnedMesh)throw new Error('The GLB contains no skinned character mesh.');
  if(!clips.length)throw new Error('The GLB contains no skeletal animation clips.');

  const bounds=new THREE.Box3().setFromObject(gltf.scene);
  const height=bounds.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(height)||height<.1)throw new Error('The GLB character has invalid dimensions.');
  const actionClips={};
  Object.entries(characterStateAliases).forEach(([state,terms])=>{
    actionClips[state]=matchClip(clips,terms);
  });
  if(!actionClips.idle)throw new Error('Name one animation clip "Idle" in the GLB.');
  if(!actionClips.walk&&!actionClips.run&&!actionClips.sprint)throw new Error('Add a "Walk", "Run", or "Sprint" animation clip to the GLB.');

  const targetScale=2.8/height;
  gltf.scene.scale.setScalar(targetScale);
  gltf.scene.position.y=-bounds.min.y*targetScale;
  gltf.scene.rotation.y=Math.PI;
  characterModel.add(gltf.scene);
  characterModel.visible=true;
  placeholder.visible=false;
  character.mixer=new THREE.AnimationMixer(gltf.scene);
  Object.entries(actionClips).forEach(([state,clip])=>{
    if(clip)character.actions[state]=character.mixer.clipAction(clip);
  });
  character.actions.walk=character.actions.walk||character.actions.run||character.actions.sprint;
  character.actions.run=character.actions.run||character.actions.walk;
  character.actions.sprint=character.actions.sprint||character.actions.run;
  character.active=true;

  const available=Object.keys(actionClips).filter(name=>actionClips[name]);
  const missing=Object.keys(characterStateAliases).filter(name=>!actionClips[name]);
  setCharacterStatus(`Rigged model loaded · ${available.join(', ')}${missing.length?` · missing: ${missing.join(', ')}`:''}`);
  setCharacterAction('idle',0);
}
const playerModelUrl=Object.entries(characterModels).find(([path])=>/\/player\.glb$/i.test(path))?.[1];
if(playerModelUrl){
  new GLTFLoader().load(playerModelUrl,gltf=>{
    try{loadCharacter(gltf)}
    catch(error){setCharacterStatus(`Character model rejected; placeholder active. ${error.message||error}`)}
  },undefined,error=>setCharacterStatus(`Character model failed to load; placeholder active. ${error.message||error}`));
}else{
  setCharacterStatus('Placeholder active. Add a rigged, animated assets/models/player.glb.');
}
const pv={vy:0,onGround:true,facing:0,phase:0};

// ---------- Input ----------
const keys={};let paused=true,yaw=0,pitch=.45,dist=8,drag=false,lx=0,ly=0;
addEventListener('keydown',e=>{
  if(!keys[e.code]&&e.code==='KeyE')keys.interactPressed=true;
  if(!keys[e.code]&&e.code==='Space')keys.jumpPressed=true;
  keys[e.code]=true;
  if(e.code==='Escape')setPause(!paused);
  if(e.code==='Space')e.preventDefault();
});
addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2||e.pointerType==='touch'){drag=true;lx=e.clientX;ly=e.clientY}});
addEventListener('pointerup',()=>drag=false);
addEventListener('pointermove',e=>{if(!drag||paused)return;yaw-=(e.clientX-lx)*.005;pitch=Math.min(1.2,Math.max(.1,pitch+(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY});
addEventListener('wheel',e=>{dist=Math.min(14,Math.max(4,dist+e.deltaY*.01))},{passive:true});
// joystick
const joy={x:0,y:0},jel=$('joy'),knob=jel.firstElementChild;
function jmove(e){const r=jel.getBoundingClientRect(),cx=r.left+60,cy=r.top+60;let dx=(e.clientX-cx)/50,dy=(e.clientY-cy)/50;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*40}px,${dy*40}px)`}
jel.addEventListener('pointerdown',e=>{jel.setPointerCapture(e.pointerId);jmove(e)});
jel.addEventListener('pointermove',e=>{if(e.buttons)jmove(e)});
jel.addEventListener('pointerup',()=>{joy.x=joy.y=0;knob.style.transform=''});

function setPause(p){paused=p;$('menu').style.display=p?'flex':'none';
  if(p){$('mtitle').textContent='বিরতি';$('mtext').textContent='খেলা থেমে আছে। Esc চেপে বা বোতামে ফিরুন।';$('go').textContent='চালিয়ে যান'}}
$('go').onclick=()=>setPause(false);$('pause').onclick=()=>setPause(true);
$('go').addEventListener('click',()=>market.enableAudio());

// ---------- Update ----------
const clock=new THREE.Clock(),camPos=new THREE.Vector3(),cameraRaycaster=new THREE.Raycaster();let visited=0,interactionMessage='',interactionUntil=0;
function resolve(p){colliders.forEach(c=>{const dx=p.x-c.x,dz=p.z-c.z,ox=c.hw+.45-Math.abs(dx),oz=c.hd+.45-Math.abs(dz);
  if(ox>0&&oz>0){if(ox<oz)p.x+=Math.sign(dx||1)*ox;else p.z+=Math.sign(dz||1)*oz}})}
function update(dt){
  let fx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x, fz=(keys.KeyW?1:0)-(keys.KeyS?1:0)-joy.y;
  const m=Math.hypot(fx,fz);if(m>1){fx/=m;fz/=m}
  const run=keys.ShiftLeft||keys.ShiftRight, speed=(run?9:4.5);
  const dx=-Math.sin(yaw)*fz+Math.cos(yaw)*fx, dz=-Math.cos(yaw)*fz-Math.sin(yaw)*fx;
  player.position.x+=dx*speed*dt;player.position.z+=dz*speed*dt;
  let turnAmount=0;
  if(Math.hypot(fx,fz)>.1){let t=Math.atan2(dx,dz),d=t-pv.facing;d=Math.atan2(Math.sin(d),Math.cos(d));turnAmount=d;pv.facing+=d*Math.min(1,dt*12);player.rotation.y=pv.facing}
  if(keys.jumpPressed&&pv.onGround){pv.vy=7;pv.onGround=false}
  keys.jumpPressed=false;
  const wasGrounded=pv.onGround;
  pv.vy-=20*dt;player.position.y+=pv.vy*dt;if(player.position.y<=0){player.position.y=0;pv.vy=0;pv.onGround=true}
  if(!wasGrounded&&pv.onGround){pv.landed=true;triggerCharacterAction('landing',.35)}
  const p=player.position;resolve(p);p.x=Math.max(-68,Math.min(68,p.x));p.z=Math.max(-30,Math.min(30,p.z));
  // walk cycle
  const mv=Math.min(1,Math.hypot(fx,fz));pv.phase+=dt*(run?13:8)*mv;const s=Math.sin(pv.phase)*.9*mv,u=placeholder.userData;
  if(!character.active){u.legL.rotation.x=s;u.legR.rotation.x=-s;u.armL.rotation.x=-s;u.armR.rotation.x=s}
  if(character.active&&character.mixer){
    character.mixer.update(dt);
    if(performance.now()>character.transientUntil)character.transient=null;
    if(mv>.1&&Math.abs(turnAmount)>1.2)triggerCharacterAction('turn',.25);
    const state=character.transient||(pv.vy>.1?'jump':mv>.1?(run?'sprint':'walk'):'idle');
    setCharacterAction(state);
  }
  market.update(dt,player,run);
  // camera
  const tgt=new THREE.Vector3(p.x,p.y+2,p.z);
  const want=new THREE.Vector3(p.x+Math.sin(yaw)*Math.cos(pitch)*dist,p.y+2+Math.sin(pitch)*dist,p.z+Math.cos(yaw)*Math.cos(pitch)*dist);
  want.y=Math.max(.6,want.y);camPos.lerp(want,1-Math.pow(.0005,dt));cam.position.copy(camPos);cam.lookAt(tgt);
  const cameraOffset=want.clone().sub(tgt),cameraDistance=cameraOffset.length();
  cameraRaycaster.set(tgt,cameraOffset.normalize());
  cameraRaycaster.near=2.75;cameraRaycaster.far=cameraDistance;
  const cameraHits=cameraRaycaster.intersectObjects(market.cameraObstacles,false);
  const obstruction=cameraHits.find(hit=>{
    let node=hit.object;
    while(node&&node!==player)node=node.parent;
    return node!==player;
  });
  if(obstruction){
    const safeDistance=Math.max(2.4,obstruction.distance-.4);
    camPos.copy(tgt).addScaledVector(cameraOffset,safeDistance);
    cam.position.copy(camPos);
  }
  sun.position.set(p.x+30,50,p.z+20);sun.target.position.copy(p);
  const near=market.getNearestShop(p);
  const pr=$('prompt');
  if(near){pr.style.display='block';pr.textContent=performance.now()<interactionUntil?interactionMessage:`${near.owner} — ${near.title} · ${near.isOpen?'খোলা':'বন্ধ'} · E আলাপ`;
    if(!near.visited){near.visited=true;visited++;$('mission').textContent='লক্ষ্য: তিনটি দোকানের কাছে যান ('+Math.min(visited,3)+'/3)'+(visited>=3?' ✔':'')}}
  else pr.style.display='none';
  if(keys.interactPressed){
    if(near){triggerCharacterAction('interact',.8);interactionMessage=market.interact(near);interactionUntil=performance.now()+3000}
    keys.interactPressed=false;
  }
  if(performance.now()<marketMessageUntil)marketStatus.style.display='block';
  else marketStatus.style.display='none';
}
function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

function start(){
  camPos.set(0,6,9);
  $('go').textContent='খেলা শুরু';
  (function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(!paused)update(dt);renderer.render(scene,cam)})();
}
// wait for Bengali font so shop signs render correctly
Promise.race([Promise.all([document.fonts.load('700 54px "Hind Siliguri"'),document.fonts.load('500 34px "Hind Siliguri"')]),new Promise(r=>setTimeout(r,2500))]).then(start,start);
})();
