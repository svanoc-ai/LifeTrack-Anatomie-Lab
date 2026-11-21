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
// Tête de mannequin, sans traits faciaux. Elle remplace uniquement les petits
// maillages contenus dans la région crânienne ; le cou reste anatomique.
function stylizeHead(root,pivot){
  // V9: visage humain chauve, surface continue avec reliefs sculptés.
  // Pas de crâne osseux, ni de superposition de sphères faciales.
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const sz=bounds.getSize(new THREE.Vector3());
  const top=bounds.max.y,H=sz.y*.115,W=sz.x*.235;
  const cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2;
  const cut=top-H*1.025;
  renderer.localClippingEnabled=true;
  const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),cut);
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const mat of mats)if(mat){mat.clippingPlanes=[plane];mat.clipShadows=true;mat.needsUpdate=true}
  });
  const skin=new THREE.MeshStandardMaterial({color:0xd5a092,roughness:.94,metalness:0});
  const feature=new THREE.MeshStandardMaterial({color:0x76514d,roughness:1});
  const eyeWhite=new THREE.MeshStandardMaterial({color:0xded6cc,roughness:.85});
  const iris=new THREE.MeshStandardMaterial({color:0x504d47,roughness:.7});
  const group=new THREE.Group();group.name='Visage humain chauve — V9';
  const headY=top-H*.49;
  // Maillage paramétrique fermé : la profondeur du visage varie avec les reliefs
  // du front, des arcades, des orbites, du nez, des lèvres et du menton.
  const verts=[],indices=[],N=96,M=72;
  const gaussian=(x,y,mx,my,sx,sy)=>Math.exp(-.5*((x-mx)**2/sx**2+(y-my)**2/sy**2));
  for(let j=0;j<=M;j++){
    const v=-Math.PI/2+Math.PI*j/M;
    for(let i=0;i<=N;i++){
      const u=2*Math.PI*i/N;
      const xx=Math.cos(v)*Math.sin(u),zz=Math.cos(v)*Math.cos(u),yy=Math.sin(v);
      // Le visage est orienté vers +Z.
      const frontal=Math.max(0,zz);
      let relief=0;
      relief+=.085*gaussian(xx,yy,0,.30,.55,.19); // front
      relief+=.075*(gaussian(xx,yy,-.34,.12,.19,.10)+gaussian(xx,yy,.34,.12,.19,.10)); // sourcils
      relief-=.13*(gaussian(xx,yy,-.34,-.01,.20,.13)+gaussian(xx,yy,.34,-.01,.20,.13)); // orbites
      relief+=.31*gaussian(xx,yy,0,-.25,.13,.26); // nez
      relief+=.10*gaussian(xx,yy,0,-.46,.25,.065); // lèvres
      relief+=.075*gaussian(xx,yy,0,-.70,.35,.14); // menton
      const jaw=1-.11*Math.max(0,-yy-.18);
      const x=cx+xx*W*.49*jaw;
      const y=headY+yy*H*.50;
      const z=cz+zz*W*.45+(frontal*relief*W*.45);
      verts.push(x,y,z);
    }
  }
  for(let j=0;j<M;j++)for(let i=0;i<N;i++){
    const k=j*(N+1)+i;
    indices.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const head=new THREE.Mesh(geo,skin);head.name='Tête humaine';group.add(head);
  const add=(name,mat,x,y,z,sx,sy,sz)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);
    m.name=name;m.position.set(cx+x,headY+y,cz+z);m.scale.set(sx,sy,sz);group.add(m);return m;
  };
  for(const side of [-1,1]){
    // Oreilles discrètes, intégrées à la silhouette.
    add('Oreille',skin,side*W*.485,-H*.055,0,W*.095,H*.13,W*.07);
    add('Conque de l’oreille',feature,side*W*.55,-H*.060,W*.036,W*.018,H*.062,W*.018);
    // Yeux sobres, sans effet cartoon.
    add('Œil',eyeWhite,side*W*.165,H*.005,W*.449,W*.085,H*.032,W*.016);
    add('Iris',iris,side*W*.165,H*.005,W*.467,W*.025,H*.025,W*.009);
    add('Sourcil',feature,side*W*.165,H*.088,W*.461,W*.11,H*.012,W*.011);
  }
  // Sillon des lèvres et narines : détails non proéminents.
  add('Lèvres',feature,0,-H*.238,W*.49,W*.14,H*.008,W*.012);
  for(const side of [-1,1])
    add('Narine',feature,side*W*.052,-H*.17,W*.56,W*.020,H*.010,W*.008);
  // Raccord court sous la mandibule ; évite la tête flottante.
  add('Raccord du cou',skin,0,-H*.49,0,W*.265,H*.105,W*.255);
  pivot.add(group);
  window.__headCutY=cut;
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
    const hit=ray.intersectObject(body,true).find(h=>h.point.y<=(window.__headCutY??Infinity)+.001);
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
