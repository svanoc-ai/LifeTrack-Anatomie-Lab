import fs from 'node:fs';import path from 'node:path';
const dist='dist';fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','viewer.js','styles.css'])fs.copyFileSync(f,path.join(dist,f));
fs.mkdirSync(path.join(dist,'vendor','three','addons','loaders'),{recursive:true});
fs.mkdirSync(path.join(dist,'vendor','three','addons','utils'),{recursive:true});
fs.copyFileSync('node_modules/three/build/three.module.js',path.join(dist,'vendor','three','three.module.js'));
for(const [from,to] of [['examples/jsm/loaders/GLTFLoader.js','addons/loaders/GLTFLoader.js'],['examples/jsm/utils/BufferGeometryUtils.js','addons/utils/BufferGeometryUtils.js']]){
 fs.copyFileSync(path.join('node_modules/three',from),path.join(dist,'vendor','three',to));
}
console.log('Static comparator built');
