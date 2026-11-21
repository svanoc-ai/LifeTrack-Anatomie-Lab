import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id);
const models={
 body:{url:'./models/bodyexplorer.glb',label:'BodyExplorer'},
 organ:{url:'./models/organui.glb',label:'OrganUI'}
};
const canvas=$('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.localClippingEnabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,2000);
scene.add(new THREE.HemisphereLight(0xffffff,0x73818a,2.7));
for(const x of [-5,5]){const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(x,7,9);scene.add(light)}
const rim=new THREE.DirectionalLight(0xd5f2ff,1.6);rim.position.set(0,6,-9);scene.add(rim);
let body=null,baseRadius=1,center=new THREE.Vector3(),yaw=0,pitch=0,zoom=1,loadId=0,modelPivot=null,modelCorrection=null;
const loader=new GLTFLoader(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function updateCamera(){const distance=baseRadius*3.2/zoom;camera.position.set(center.x+Math.sin(yaw)*Math.cos(pitch)*distance,center.y+Math.sin(pitch)*distance,center.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(center)}
function fit(){if(modelPivot)modelPivot.rotation.y=0;modelPivot?.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(modelPivot||body);box.getCenter(center);const size=new THREE.Vector3();box.getSize(size);baseRadius=Math.max(size.length()/2,.01);yaw=0;pitch=0;zoom=1;camera.near=Math.max(baseRadius/1000,.001);camera.far=baseRadius*100;camera.updateProjectionMatrix();updateCamera()}
// Orientation validée sur iPhone : BodyExplorer X = -90 degrés.
function normalizeBodyExplorer(root){
  const correction=new THREE.Group();
  correction.name='BodyExplorer orientation X -90';
  correction.rotation.x=-Math.PI/2;
  correction.add(root);
  return correction;
}
function applyView(){
  if(!modelPivot)return;
  modelPivot.rotation.y=$('view').value==='back'?Math.PI:$('view').value==='side'?Math.PI/2:0;
  yaw=0;pitch=0;updateCamera();
}
// Masquage garanti par plan de coupe GPU : contrairement à un filtrage par
// nom de mesh, il fonctionne aussi si le visage appartient à un mesh géant.
function stylizeHead(root,pivot){
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const size=bounds.getSize(new THREE.Vector3());
  const top=bounds.max.y;
  const headHeight=size.y*.115;
  const cutY=top-headHeight*.99;
  window.__headCutY=cutY;
  // Le plan garde la partie inférieure (y <= cutY).
  const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),cutY);
  let clipped=0;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const mat of materials){
      if(!mat)continue;
      mat.clippingPlanes=[plane];
      mat.clipShadows=true;
      mat.needsUpdate=true;
    }
    clipped++;
  });
  const centerX=(bounds.min.x+bounds.max.x)/2;
  const centerZ=(bounds.min.z+bounds.max.z)/2;
  // Largeur du crâne proportionnelle aux épaules, sans traits faciaux.
  const headWidth=size.x*.215;
  const depth=headWidth*.84;
  const skin=new THREE.MeshStandardMaterial({
    color:'#dca69b',roughness:.91,metalness:0
  });
  const head=new THREE.Group();
  head.name='Tête stylisée lisse';
  const skull=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),skin);
  skull.name='Crâne stylisé';
  skull.scale.set(headWidth*.50,headHeight*.50,depth*.50);
  skull.position.set(centerX,top-headHeight*.48,centerZ);
  head.add(skull);
  // Bas du visage volontairement discret pour éviter un effet boule.
  const chin=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),skin);
  chin.name='Menton stylisé';
  chin.scale.set(headWidth*.38,headHeight*.24,depth*.41);
  chin.position.set(centerX,top-headHeight*.79,centerZ+depth*.055);
  head.add(chin);
  pivot.add(head);
  console.info('LAB v7 : plan de coupe facial y=',cutY,'maillages=',clipped);
}
function materialize(root, harmonize=false){root.traverse(o=>{if(!o.isMesh)return;const original=o.material;const color=original?.color?.clone?.()||new THREE.Color('#b25c58');// Harmonisation douce des zones très claires ; ne change pas les reliefs.
  if(harmonize && color.r>.87 && color.g>.87 && color.b>.87){
    color.set('#d7a69b');
  }
  const mat=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,side:THREE.DoubleSide});o.material=mat;o.userData.sourceMaterial=original?.name||''})}
async function load(){const id=++loadId,key=$('model').value; $('status').textContent='Chargement du modèle '+models[key].label+'…';$('name').textContent='—';if(modelPivot){scene.remove(modelPivot);modelPivot=null;body=null}try{const gltf=await loader.loadAsync(models[key].url);if(id!==loadId)return;body=gltf.scene;
    materialize(body,key==='body');
    modelPivot=new THREE.Group();
    modelPivot.name='Pivot vertical';
    modelCorrection=key==='body'?normalizeBodyExplorer(body):body;
    modelPivot.add(modelCorrection);
    scene.add(modelPivot);
    modelPivot.updateMatrixWorld(true);
    if(key==='body')stylizeHead(modelCorrection,modelPivot);
    modelPivot.updateMatrixWorld(true);
    fit();$('view').value='front';$('status').textContent='Modèle chargé · glisser pour tourner, pincer pour zoomer'}catch(e){$('status').textContent='Échec de chargement : '+e.message;console.error(e)}}
$('model').onchange=load;
$('view').onchange=applyView;
$('reset').onclick=()=>{$('view').value='front';if(body)fit()};
const active=new Map();
let tapStart=null, previousPinch=null;
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  active.set(e.pointerId,[e.clientX,e.clientY]);
  if(active.size===1)tapStart={x:e.clientX,y:e.clientY,moved:false};
  else {tapStart=null;previousPinch=null;}
});
canvas.addEventListener('pointermove',e=>{
  if(!active.has(e.pointerId))return;
  const prev=active.get(e.pointerId);
  active.set(e.pointerId,[e.clientX,e.clientY]);
  if(active.size===1){
    const dx=e.clientX-prev[0],dy=e.clientY-prev[1];
    yaw-=dx*.008;
    pitch=Math.max(-1.3,Math.min(1.3,pitch+dy*.006));
    if(tapStart&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>8)tapStart.moved=true;
  }else if(active.size===2){
    const vals=[...active.values()];
    const d=Math.hypot(vals[0][0]-vals[1][0],vals[0][1]-vals[1][1]);
    if(previousPinch)zoom=Math.max(.55,Math.min(4,zoom*d/previousPinch));
    previousPinch=d;
  }
  updateCamera();
});
canvas.addEventListener('pointerup',e=>{
  if(tapStart&&!tapStart.moved&&active.size===1&&body){
    const rect=canvas.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(body,true).find(h=>h.point.y<=((window.__headCutY??Infinity)+.001));
    if(hit){
      $('name').textContent=hit.object.name||hit.object.parent?.name||'Structure sans nom';
      $('details').textContent='Nom issu du modèle anatomique ; correspondance sportive à vérifier.';
    }
  }
  active.delete(e.pointerId);tapStart=null;previousPinch=null;
});
canvas.addEventListener('pointercancel',e=>{
  active.delete(e.pointerId);tapStart=null;previousPinch=null;
});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(4,zoom*Math.exp(-e.deltaY*.001)));updateCamera()},{passive:false});
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(canvas);resize();
let frames=0,then=performance.now(),fps=0;function animate(t){requestAnimationFrame(animate);frames++;if(t-then>1000){fps=Math.round(frames*1000/(t-then));frames=0;then=t;$('perf').textContent=fps+' IPS (indicatif)'}renderer.render(scene,camera)}requestAnimationFrame(animate);
for(const [input,out] of [['realism','rout'],['relief','lout'],['complete','cout'],['fluid','fout']])$(input).oninput=()=>$(out).textContent=$(input).value+'/5';
$('copy').onclick=()=>{const text='LifeTrack 3D — '+models[$('model').value].label+' : réalisme '+$('realism').value+'/5, reliefs '+$('relief').value+'/5, corps complet '+$('complete').value+'/5, fluidité '+$('fluid').value+'/5. '+$('perf').textContent;navigator.clipboard?.writeText(text).then(()=>{$('copy').textContent='Copié !'}).catch(()=>{$('details').textContent=text})};
load();
