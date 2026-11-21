import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id);
const models={
 body:{url:'./models/bodyexplorer.glb',label:'BodyExplorer'},
 organ:{url:'./models/organui.glb',label:'OrganUI'}
};
const canvas=$('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;
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
// LAB v8 — crâne osseux stylisé, reconstruit sur la base stable v6.
// Coupe GPU de la tête d'origine, sans altérer le corps sous le cou.
function stylizeHead(root,pivot){
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const size=bounds.getSize(new THREE.Vector3());
  const top=bounds.max.y, H=size.y*.115, W=size.x*.24;
  const cx=(bounds.min.x+bounds.max.x)/2;
  const cz=(bounds.min.z+bounds.max.z)/2;
  const cut=top-H*1.02;
  const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),cut);
  renderer.localClippingEnabled=true;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats)if(m){m.clippingPlanes=[plane];m.needsUpdate=true}
  });
  const bone=new THREE.MeshStandardMaterial({color:0xe5d8bd,roughness:.93,metalness:0});
  const dark=new THREE.MeshStandardMaterial({color:0x302c29,roughness:1,metalness:0});
  const group=new THREE.Group();
  group.name='Crâne osseux stylisé — LAB v8';
  // Face visible dans la direction +Z (orientation BodyExplorer validée).
  const faceZ=cz+W*.37;
  const add=(name,mat,x,y,z,sx,sy,sz,detail=28)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,detail,20),mat);
    m.name=name;m.position.set(cx+x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;
  };
  // Voûte crânienne, os frontal et mâchoire.
  add('Voûte crânienne',bone,0,top-H*.39,cz,W*.51,H*.43,W*.43);
  add('Os frontal',bone,0,top-H*.39,faceZ,W*.45,H*.25,W*.16);
  add('Maxillaire',bone,0,top-H*.73,faceZ+W*.04,W*.30,H*.135,W*.18);
  add('Mandibule',bone,0,top-H*.90,faceZ-W*.025,W*.33,H*.10,W*.17);
  // Orbites noires en creux, entourées par les rebords osseux.
  for(const side of [-1,1]){
    const x=side*W*.22;
    add('Orbite',dark,x,top-H*.56,faceZ+W*.14,W*.155,H*.115,W*.034);
    add('Rebord orbitaire supérieur',bone,x,top-H*.445,faceZ+W*.13,W*.18,H*.034,W*.066);
    add('Pommette',bone,side*W*.35,top-H*.68,faceZ+W*.08,W*.125,H*.075,W*.10);
    add('Branche mandibulaire',bone,side*W*.29,top-H*.79,faceZ-W*.03,W*.055,H*.17,W*.08);
  }
  add('Cavité nasale',dark,0,top-H*.705,faceZ+W*.195,W*.085,H*.095,W*.024);
  add('Arête nasale',bone,0,top-H*.59,faceZ+W*.19,W*.038,H*.10,W*.06);
  // Arcade dentaire simplifiée, volontairement discrète à l'échelle iPhone.
  for(let i=-3;i<=3;i++){
    const tooth=new THREE.Mesh(new THREE.BoxGeometry(W*.075,H*.046,W*.052),bone);
    tooth.name='Dent supérieure';
    tooth.position.set(cx+i*W*.078,top-H*.805,faceZ+W*.18);
    group.add(tooth);
  }
  // Muscles faciaux superficiels visibles sur la structure osseuse.
  // Géométries simplifiées, identifiables mais non destinées à un usage médical.
  const muscle=new THREE.MeshStandardMaterial({color:0xa94b49,roughness:.87,metalness:0});
  const muscleLight=new THREE.MeshStandardMaterial({color:0xc46b61,roughness:.89,metalness:0});
  const addMuscle=(name,x,y,z,sx,sy,sz,rot=0,mat=muscle)=>{
    const mesh=add(name,mat,x,y,z,sx,sy,sz);
    mesh.rotation.z=rot;
    return mesh;
  };
  for(const side of [-1,1]){
    // Muscle temporal, de la tempe vers l'arcade zygomatique.
    addMuscle('Muscle temporal',side*W*.455,top-H*.43,cz+W*.15,W*.078,H*.235,W*.082,side*.18);
    // Masséter sur la branche mandibulaire.
    addMuscle('Muscle masséter',side*W*.335,top-H*.745,faceZ+W*.075,W*.082,H*.17,W*.073,-side*.14);
    // Muscle zygomatique majeur en diagonale vers la commissure labiale.
    addMuscle('Muscle zygomatique majeur',side*W*.245,top-H*.715,faceZ+W*.19,W*.043,H*.13,W*.043,-side*.54,muscleLight);
    // Orbiculaire de l'œil : deux arcs musculaires autour des orbites.
    for(const dy of [-1,1]){
      addMuscle('Muscle orbiculaire de l’œil',side*W*.22,top-H*(.56+dy*.112),faceZ+W*.185,W*.135,H*.029,W*.031,0,muscleLight);
    }
    // Muscle buccinateur sur les joues.
    addMuscle('Muscle buccinateur',side*W*.19,top-H*.785,faceZ+W*.22,W*.091,H*.045,W*.036,side*.10);
  }
  addMuscle('Muscle procerus',0,top-H*.635,faceZ+W*.22,W*.040,H*.077,W*.035);
  // Bande orbiculaire des lèvres, volontairement discrète.
  addMuscle('Muscle orbiculaire de la bouche',0,top-H*.805,faceZ+W*.23,W*.19,H*.027,W*.034,0,muscleLight);
  pivot.add(group);
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
    const hit=ray.intersectObject(body,true)[0];
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
