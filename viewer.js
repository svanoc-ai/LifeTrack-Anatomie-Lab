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
function stylizeHead(root, pivot){
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const sz=bounds.getSize(new THREE.Vector3());
  const h=sz.y;
  const top=bounds.max.y;
  const headHeight=h*.115;
  const neckLine=top-headHeight*1.08;
  const headCenter=new THREE.Vector3(
    bounds.getCenter(new THREE.Vector3()).x,
    top-headHeight*.50,
    bounds.getCenter(new THREE.Vector3()).z
  );
  let hidden=0;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const b=new THREE.Box3().setFromObject(o);
    if(b.isEmpty())return;
    const c=b.getCenter(new THREE.Vector3());
    const dims=b.getSize(new THREE.Vector3());
    const cranialName=/(head|skull|crani|face|facial|frontal|tempor|orbicular|masseter|nasal|zygomat|mandib|maxill|occipit|buccinat|mentalis|eyeball|eye_|teeth|tooth|tongue)/i.test(o.name);
    // Ne jamais cacher un maillage qui descend jusque dans le cou ou le tronc.
    if(b.min.y>neckLine && (cranialName || (c.y>top-headHeight*.65 && dims.y<headHeight*.8))){
      o.visible=false;hidden++;
    }
  });
  // Le rendu reste volontairement sobre, sans yeux, nez, bouche ni oreilles.
  const material=new THREE.MeshStandardMaterial({
    color:0xd99b8d,roughness:.94,metalness:0,side:THREE.FrontSide
  });
  const group=new THREE.Group();
  group.name='Tête stylisée — mannequin';
  const skull=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
  skull.scale.set(sz.x*.118,headHeight*.50,sz.x*.112);
  skull.position.copy(headCenter);
  group.add(skull);
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
  jaw.scale.set(sz.x*.091,headHeight*.245,sz.x*.096);
  jaw.position.set(headCenter.x,top-headHeight*.78,headCenter.z+sz.x*.006);
  group.add(jaw);
  // La géométrie est ajoutée au pivot global, donc elle conserve l'axe Y.
  pivot.add(group);
  console.info('LifeTrack LAB v6 : structures crâniennes masquées :',hidden);
}
function materialize(root, harmonize=false){root.traverse(o=>{if(!o.isMesh)return;const original=o.material;const color=original?.color?.clone?.()||new THREE.Color('#b25c58');// Harmonisation douce des zones très claires ; ne change pas les reliefs.
  if(harmonize && color.r>.87 && color.g>.87 && color.b>.87){
    color.set('#d7a69b');
  }
  const mat=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,side:THREE.DoubleSide});o.material=mat;o.userData.sourceMaterial=original?.name||''})}
// Qualification V1 : inventaire exhaustif des maillages présents dans le GLB.
// Aucune classification n'est déclarée validée sans contrôle humain.
let inventory=[];
const groups=['Pectoraux','Grand dorsal','Trapèzes','Rhomboïdes','Lombaires','Deltoïdes antérieurs','Deltoïdes latéraux','Deltoïdes postérieurs','Biceps','Triceps','Avant-bras','Abdominaux','Obliques','Fessiers','Abducteurs','Adducteurs','Quadriceps','Ischio-jambiers','Mollets','Tibial antérieur'];
function candidate(name){
  const n=name.toLowerCase().replace(/[_-]/g,' ');
  const rules=[
    ['Pectoraux',/pector|chest/],['Grand dorsal',/latissimus|latiss/],
    ['Trapèzes',/trapez/],['Rhomboïdes',/rhomboid/],
    ['Lombaires',/erector.spinae|multifid|quadratus.lumb|iliocostal|longissimus/],
    ['Deltoïdes antérieurs',/deltoid.*(anterior|front|clavicular)|(anterior|front).*deltoid/],
    ['Deltoïdes latéraux',/deltoid.*(middle|lateral|acromial)|(middle|lateral).*deltoid/],
    ['Deltoïdes postérieurs',/deltoid.*(posterior|rear|spinal)|(posterior|rear).*deltoid/],
    ['Biceps',/biceps.brach|brachialis|coracobrach/],
    ['Triceps',/triceps.brach|anconeus/],
    ['Avant-bras',/brachioradial|pronator|supinator|flexor.carpi|extensor.carpi|palmaris/],
    ['Abdominaux',/rectus.abdomin|transversus.abdomin/],
    ['Obliques',/obliqu/],
    ['Fessiers',/glute/],['Abducteurs',/tensor.fascia|gluteus.medius|gluteus.minimus/],
    ['Adducteurs',/adductor|gracilis|pectineus/],
    ['Quadriceps',/rectus.femor|vastus/],
    ['Ischio-jambiers',/biceps.femor|semitendinos|semimembranos/],
    ['Mollets',/gastrocnem|soleus|plantaris/],
    ['Tibial antérieur',/tibialis.anterior|tibial.ant/]
  ];
  return [...new Set(rules.filter(([,rx])=>rx.test(n)).map(([g])=>g))];
}
function prepareInventory(root,modelKey){
  const seen=new Map();inventory=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    const name=o.name||'';
    const count=(seen.get(name)||0)+1;seen.set(name,count);
    const label=name||'(sans nom)';
    inventory.push({
      id:modelKey+'-'+String(inventory.length+1).padStart(4,'0'),
      modele:modelKey==='body'?'BodyExplorer':'OrganUI',
      nom_source:label,
      occurrence_nom:count,
      parent:o.parent?.name||'',
      groupes_proposes:candidate(name),
      groupes_valides:[],
      groupe_valide:'',
      statut:'À qualifier',
      visible_v6:o.visible?'oui':'non',
      commentaire:''
    });
  });
  $('inventory-count').textContent=inventory.length+' maillages inventoriés · '+inventory.filter(x=>x.groupes_proposes.length).length+' propositions automatiques à vérifier · '+inventory.filter(x=>x.visible_v6==='non').length+' masqués par la V6';
  $('export-inventory').disabled=!inventory.length;
  $('export-json').disabled=!inventory.length;
}
function downloadFile(filename,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('export-inventory').onclick=()=>{
  const cols=['id','modele','nom_source','occurrence_nom','parent','groupes_proposes','groupes_valides','statut','visible_v6','commentaire'];
  const esc=v=>'"'+String(Array.isArray(v)?v.join(' | '):(v??'')).replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[cols.join(';'),...inventory.map(row=>cols.map(k=>esc(row[k])).join(';'))].join('\r\n');
  downloadFile('LifeTrack-inventaire-'+$('model').value+'.csv',csv,'text/csv;charset=utf-8');
};
$('export-json').onclick=()=>{
  downloadFile('LifeTrack-referentiel-'+$('model').value+'.json',JSON.stringify({
    schema:'lifetrack.anatomy.inventory.v2-20groups',source:'LifeTrack LAB V6',model:models[$('model').value].label,
    groupes_cibles:groups,regle:'20 groupes ; associations multiples possibles ; propositions non validées.',
    structures:inventory
  },null,2),'application/json');
};
async function load(){const id=++loadId,key=$('model').value; $('status').textContent='Chargement du modèle '+models[key].label+'…';$('name').textContent='—';inventory=[];$('inventory-count').textContent='Chargement de l’inventaire…';$('export-inventory').disabled=true;$('export-json').disabled=true;if(modelPivot){scene.remove(modelPivot);modelPivot=null;body=null}try{const gltf=await loader.loadAsync(models[key].url);if(id!==loadId)return;body=gltf.scene;
    materialize(body,key==='body');
    modelPivot=new THREE.Group();
    modelPivot.name='Pivot vertical';
    modelCorrection=key==='body'?normalizeBodyExplorer(body):body;
    modelPivot.add(modelCorrection);
    scene.add(modelPivot);
    modelPivot.updateMatrixWorld(true);
    if(key==='body')stylizeHead(modelCorrection,modelPivot);
    prepareInventory(body,key);
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
