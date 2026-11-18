import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// This project is authored independently. All geometry and motion are procedural.
const PALETTE={blue:0x2454ff,ice:0xddeaff,purple:0x491c57,violet:0x865ee6,night:0x03050c};
const canvas=document.createElement('canvas');canvas.id='world';document.body.append(canvas);
const gpu=new T.WebGLRenderer({canvas,alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
gpu.setPixelRatio(1);gpu.outputColorSpace=T.SRGBColorSpace;gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.05;
const worlds=new Map();
const random=(initial)=>{let v=initial>>>0;return()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};};
const sat=x=>Math.min(1,Math.max(0,x));
const out=x=>1-Math.pow(1-sat(x),4);
function radiant(hex,power=1){const c=new T.Color(hex).multiplyScalar(power);return new T.MeshBasicMaterial({color:c,toneMapped:false});}
function metal(hex,roughness=.16){return new T.MeshPhysicalMaterial({color:hex,metalness:1,roughness,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2});}
function tube(points,radius,material,closed=false){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)),closed);return new T.Mesh(new T.TubeGeometry(curve,Math.max(24,points.length*10),radius,6,closed),material);}
function rod(a,b,radius,material){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),dir=v2.clone().sub(v1);const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,dir.length(),8),material);mesh.position.copy(v1).add(v2).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return mesh;}
function pathLine(points,hex,opacity=1){const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));return new T.Line(geometry,new T.LineBasicMaterial({color:hex,transparent:opacity<1,opacity,toneMapped:false}));}
function outlineBox(w,h,d,color){return new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w,h,d)),new T.LineBasicMaterial({color,toneMapped:false}));}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,255,255,.5)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
const glowMap=glowTexture();

// An actual studio scene is captured by PMREM for high-contrast metal reflections.
function reflectionStudio(){
 const room=new T.Scene();room.background=new T.Color(0x02040a);
 const wall=(position,size,color)=>{const m=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial({color}));m.position.set(...position);room.add(m);return m;};
 wall([0,7,0],[15,.2,12],0x7c8ca8);wall([0,-6,0],[15,.2,12],0x0b1020);
 wall([-7,1,0],[.2,9,12],0x03050a);wall([7,1,0],[.2,9,12],0x050711);
 wall([-5.8,2,3.8],[.25,8,.55],0xffffff);wall([5.5,0,1],[.25,6,1.2],0xd8e8ff);
 wall([-1.8,4,-5],[6,.5,.15],0xf4f8ff);wall([0,-1,-5],[10,.4,.15],0x8daeff);
 wall([4.8,1.4,-4],[.3,4.5,.15],0x4969f5);wall([-3,-3,4],[5,.2,.1],0x73579f);
 const diagonal=wall([1,2.5,4.7],[.6,7,.12],0xc4d5f5);diagonal.rotation.z=.6;
 wall([0,.8,6.2],[14,1.25,.12],0xd6e4ff);wall([0,-1,6.2],[14,.65,.12],0xe8efff);wall([0,3.8,6.2],[14,.8,.12],0x7585a2);wall([3.5,0,6.1],[.6,8,.12],0xffffff);wall([0,-.35,6.0],[14,.18,.12],0x02040a);wall([-4,0,6.0],[.28,8,.12],0x3e66bb);wall([0,-.95,5.95],[14,.30,.1],0x010208);
 const generator=new T.PMREMGenerator(gpu);const env=generator.fromScene(room,0,.1,40).texture;return env;
}
const studio=reflectionStudio();
function world(id,width,height,{background=PALETTE.night,bloom=.33,white=false}={}){
 const scene=new T.Scene();scene.background=new T.Color(background);scene.environment=studio;
 const camera=new T.PerspectiveCamera(36,width/height,.1,120);camera.position.set(0,1,12);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight(0xc4dcff,0x1b1026,.9));
 const lightA=new T.DirectionalLight(0xdceaff,2.5);lightA.position.set(-5,6,9);scene.add(lightA);
 const lightB=new T.DirectionalLight(0x425dff,2.1);lightB.position.set(6,2,-5);scene.add(lightB);
 const target=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,samples:4});
 const composer=new EffectComposer(gpu,target);composer.addPass(new RenderPass(scene,camera));
 if(bloom>0)composer.addPass(new UnrealBloomPass(new T.Vector2(width,height),bloom,.2,1.12));
 composer.addPass(new OutputPass());
 const result={id,width,height,scene,camera,composer,white,move:()=>{}};worlds.set(id,result);return result;
}
function distantPoints(scene,count,seed=5){const rng=random(seed),p=[],c=[];for(let i=0;i<count;i++){p.push((rng()-.5)*45,(rng()-.5)*30,-6-rng()*20);const col=new T.Color().setHSL(.63+rng()*.13,.5,.25+rng()*.4);c.push(col.r,col.g,col.b);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));const cloud=new T.Points(g,new T.PointsMaterial({size:.024,vertexColors:true,transparent:true,opacity:.7,depthWrite:false}));scene.add(cloud);return cloud;}
function horizon(scene,y){const grid=new T.GridHelper(60,60,0x304e8c,0x102044);grid.position.y=y;grid.material.transparent=true;grid.material.opacity=.19;scene.add(grid);return grid;}

// 01. Exploded glass architecture: five precision plates on a square light plinth.
{
 const w=world('layers',960,1080,{background:0xf5f7fc,bloom:0,white:true});
 w.camera.position.set(7.4,7.1,10.2);w.camera.lookAt(0,.2,0);
 const rig=new T.Group();w.scene.add(rig);const decks=[];
 const shades=[0x182a8b,0x2453e8,0x3b70f4,0x5c8dff,0x89b8ff];
 for(let i=0;i<5;i++){
  const deck=new T.Group();rig.add(deck);decks.push(deck);
  const plate=new T.Mesh(new T.BoxGeometry(3.6,.075,3.6),new T.MeshPhysicalMaterial({color:shades[i],metalness:.25,roughness:.16,clearcoat:1,transparent:true,opacity:.78,side:T.DoubleSide}));deck.add(plate);
  deck.add(outlineBox(3.62,.085,3.62,0xb4d9ff));
  const inner=new T.Mesh(new T.PlaneGeometry(2.95,2.95),new T.MeshBasicMaterial({color:0x8eb8ff,transparent:true,opacity:.045,side:T.DoubleSide}));inner.rotation.x=-Math.PI/2;inner.position.y=.05;deck.add(inner);
  const marks=new T.Group();deck.add(marks);
  for(let j=0;j<7;j++){marks.add(pathLine([[-1.45+j*.48,.048,-1.45],[-1.45+j*.48,.048,1.45]],0xc2e0ff,.28));}
  for(let j=0;j<3;j++){const chip=new T.Mesh(new T.BoxGeometry(.5,.018,.12),radiant(0xaad6ff));chip.position.set(-1.16+j*.68,.06,-1.43);deck.add(chip);}
  const corners=[[-1.62,-1.62],[1.62,-1.62],[1.62,1.62],[-1.62,1.62]];
  corners.forEach(([x,z])=>{const p=new T.Mesh(new T.BoxGeometry(.07,.025,.07),radiant(0xffffff));p.position.set(x,.06,z);deck.add(p);});
  const center=new T.Mesh(new T.RingGeometry(.34,.35,48),radiant(0xbbdfff));center.rotation.x=-Math.PI/2;center.position.set(.6,.052,.4);deck.add(center);
 }
 const foot=new T.Mesh(new T.BoxGeometry(4.35,.12,4.35),new T.MeshStandardMaterial({color:0xe7edf8,roughness:.65}));foot.position.y=-1.85;rig.add(foot);
 const footBorder=outlineBox(4.36,.13,4.36,0xb7c8e7);footBorder.position.copy(foot.position);rig.add(footBorder);
 for(const [x,z]of[[-1.82,-1.82],[1.82,-1.82],[1.82,1.82],[-1.82,1.82]]){rig.add(pathLine([[x,-1.7,z],[x,2.25,z]],0x9bb0d3,.28));}
 w.move=t=>{decks.forEach((deck,i)=>{const e=out((t-.12*i)/1.5);deck.position.y=-1.65+i*(.11+.69*e);deck.rotation.y=(1-e)*(.16-i*.02);});rig.rotation.y=-.12+Math.sin(t*.35)*.025;w.camera.position.x=7.4-.25*Math.sin(t*.4);w.camera.lookAt(0,.15,0);};
}

window.worldMetadata=Object.fromEntries([...worlds].map(([id,w])=>[id,{width:w.width,height:w.height,frames:120,fps:30}]));
window.drawWorld=(id,seconds)=>{const w=worlds.get(id);if(!w)throw Error('Unknown world: '+id);gpu.toneMapping=w.white?T.NoToneMapping:T.ACESFilmicToneMapping;gpu.setSize(w.width,w.height,false);w.composer.setSize(w.width,w.height);w.camera.aspect=w.width/w.height;w.camera.updateProjectionMatrix();w.move(seconds);w.composer.render();return canvas.toDataURL('image/png');};
window.worldsReady=true;
