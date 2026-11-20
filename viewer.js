import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id);
const models={
 body:{url:'./models/bodyexplorer.glb',label:'BodyExplorer'},
 organ:{url:'./models/organui.glb',label:'OrganUI'}
};
const canvas=$('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,2000);
scene.add(new THREE.HemisphereLight(0xffffff,0x46535a,2.2));
for(const x of [-5,5]){const light=new THREE.DirectionalLight(0xfff3ea,2.0);light.position.set(x,7,9);scene.add(light)}
const rim=new THREE.DirectionalLight(0xd5f2ff,1.1);rim.position.set(0,6,-9);scene.add(rim);
let body=null,baseRadius=1,center=new THREE.Vector3(),yaw=0,pitch=0,zoom=1,loadId=0;
const loader=new GLTFLoader(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function updateCamera(){const distance=baseRadius*3.2/zoom;camera.position.set(center.x+Math.sin(yaw)*Math.cos(pitch)*distance,center.y+Math.sin(pitch)*distance,center.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(center)}
function fit(){const box=new THREE.Box3().setFromObject(body);box.getCenter(center);const size=new THREE.Vector3();box.getSize(size);baseRadius=Math.max(size.length()/2,.01);yaw=0;pitch=0;zoom=1;camera.near=Math.max(baseRadius/1000,.001);camera.far=baseRadius*100;camera.updateProjectionMatrix();updateCamera()}
function materialize(root){root.traverse(o=>{if(!o.isMesh)return;const original=o.material;const color=original?.color?.clone?.()||new THREE.Color('#b25c58');const mat=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,side:THREE.DoubleSide});o.material=mat;o.userData.sourceMaterial=original?.name||''})}
async function load(){const id=++loadId,key=$('model').value; $('status').textContent='Chargement du modèle '+models[key].label+'…';$('name').textContent='—';if(body){scene.remove(body);body=null}try{const gltf=await loader.loadAsync(models[key].url);if(id!==loadId)return;body=gltf.scene;materialize(body);scene.add(body);fit();$('status').textContent='Modèle chargé · glisser pour tourner, pincer pour zoomer'}catch(e){$('status').textContent='Échec de chargement : '+e.message;console.error(e)}}
$('model').onchange=load;$('view').onchange=()=>{yaw=$('view').value==='back'?Math.PI:$('view').value==='side'?Math.PI/2:0;pitch=0;updateCamera()};$('reset').onclick=()=>{if(body)fit();$('view').value='front'};
let active=new Map(),start=null;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);active.set(e.pointerId,[e.clientX,e.clientY]);start={x:e.clientX,y:e.clientY,moved:false}});
canvas.addEventListener('pointermove',e=>{if(!active.has(e.pointerId))return;const prev=active.get(e.pointerId);active.set(e.pointerId,[e.clientX,e.clientY]);if(active.size===1){const dx=e.clientX-prev[0],dy=e.clientY-prev[1];yaw-=dx*.008;pitch=Math.max(-1.3,Math.min(1.3,pitch+dy*.006));if(start&&(Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)>8))start.moved=true;updateCamera()}else if(active.size===2){const vals=[...active.values()];const d=Math.hypot(vals[0][0]-vals[1][0],vals[0][1]-vals[1][1]);const old=active.get('_distance');if(old)zoom=Math.max(.55,Math.min(4,zoom*d/old));active.set('_distance',d);updateCamera()}});
canvas.addEventListener('pointerup',e=>{if(start&&!start.moved&&active.size===1&&body){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(body,true)[0];if(hit){$('name').textContent=hit.object.name||hit.object.parent?.name||'Structure sans nom';$('details').textContent='Nom issu du modèle anatomique ; correspondance sportive à vérifier.'}}active.delete(e.pointerId);active.delete('_distance');start=null});
canvas.addEventListener('pointercancel',e=>{active.delete(e.pointerId);active.delete('_distance');start=null});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(4,zoom*Math.exp(-e.deltaY*.001)));updateCamera()},{passive:false});
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(canvas);resize();
let frames=0,then=performance.now(),fps=0;function animate(t){requestAnimationFrame(animate);frames++;if(t-then>1000){fps=Math.round(frames*1000/(t-then));frames=0;then=t;$('perf').textContent=fps+' IPS (indicatif)'}renderer.render(scene,camera)}requestAnimationFrame(animate);
for(const [input,out] of [['realism','rout'],['relief','lout'],['complete','cout'],['fluid','fout']])$(input).oninput=()=>$(out).textContent=$(input).value+'/5';
$('copy').onclick=()=>{const text='LifeTrack 3D — '+models[$('model').value].label+' : réalisme '+$('realism').value+'/5, reliefs '+$('relief').value+'/5, corps complet '+$('complete').value+'/5, fluidité '+$('fluid').value+'/5. '+$('perf').textContent;navigator.clipboard?.writeText(text).then(()=>{$('copy').textContent='Copié !'}).catch(()=>{$('details').textContent=text})};
load();
