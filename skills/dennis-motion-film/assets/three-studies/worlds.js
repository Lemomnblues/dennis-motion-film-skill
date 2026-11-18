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

// 02. A luminous dodecahedral instrument suspended inside offset square gimbals.
{
 const w=world('poly',960,1080,{bloom:.46});w.camera.position.set(0,.7,9.8);w.camera.lookAt(0,0,0);
 const device=new T.Group();w.scene.add(device);
 const geometry=new T.DodecahedronGeometry(1.95,0);const edges=new T.EdgesGeometry(geometry);const vertices=edges.getAttribute('position');
 for(let i=0;i<vertices.count;i+=2){device.add(rod([vertices.getX(i),vertices.getY(i),vertices.getZ(i)],[vertices.getX(i+1),vertices.getY(i+1),vertices.getZ(i+1)],.012,radiant(0x6d99ff,1.6)));}
 const shell=new T.Mesh(geometry,new T.MeshPhysicalMaterial({color:0x10226a,metalness:.7,roughness:.22,transparent:true,opacity:.28,side:T.DoubleSide}));device.add(shell);
 const heart=new T.Mesh(new T.OctahedronGeometry(.85,0),metal(0xb7cbef,.1));device.add(heart);
 const frames=[];for(let i=0;i<2;i++){const group=new T.Group();const r=2.45+i*.24;const coords=[[-r,-r,0],[r,-r,0],[r,r,0],[-r,r,0],[-r,-r,0]];for(let k=0;k<4;k++)group.add(rod(coords[k],coords[k+1],.009,radiant(i?0x7952b8:0x3f73ff,1.2)));group.rotation.set(.3+i*.5,.35+i*.5,.18);w.scene.add(group);frames.push(group);}
 horizon(w.scene,-2.65);distantPoints(w.scene,85,16);
 const plate=new T.Mesh(new T.CylinderGeometry(2.4,2.4,.02,64),new T.MeshBasicMaterial({color:0x0b1631}));plate.position.y=-2.64;w.scene.add(plate);
 w.move=t=>{device.rotation.set(.18+t*.12,.3+t*.34,.10);device.position.y=.06*Math.sin(t*1.5);heart.rotation.set(t*.24,-t*.38,.1);frames.forEach((g,i)=>{g.rotation.z=.18+t*(i?.07:-.05);});};
}

function starMaterial(size=1,opacity=1){return new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,uniforms:{uSize:{value:size},uAlpha:{value:opacity}},vertexShader:`attribute float radius;uniform float uSize;varying vec3 tint;void main(){tint=color;vec4 q=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*q;gl_PointSize=clamp(radius*uSize*290./(-q.z),.7,24.);}`,fragmentShader:`varying vec3 tint;uniform float uAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;float f=pow(max(0.,1.-d),2.3);gl_FragColor=vec4(tint,f*uAlpha);}`});}
function starsFrom(position,color,radius,material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setAttribute('radius',new T.Float32BufferAttribute(radius,1));return new T.Points(g,material);}

// 03. Two dominant spiral arms, star clusters and softly layered interstellar dust.
{
 const w=world('galaxy',1920,1080,{background:0x02030a,bloom:.58});w.camera.position.set(-.5,7.2,14.5);w.camera.up.set(.18,1,0);w.camera.lookAt(.6,.6,0);
 const system=new T.Group();system.position.set(1.05,.8,0);system.scale.setScalar(.84);system.rotation.z=-.12;w.scene.add(system);
 const rng=random(87051),p=[],c=[],r=[];
 for(let i=0;i<44000;i++){
  const radial=Math.pow(rng(),.73)*7.2;const arm=i%2;const theta=arm*Math.PI+radial*.74;const gaussian=(rng()+rng()+rng()-1.5);const spread=.09+radial*.075;
  const a=theta+gaussian*.22;const radius=radial+(rng()-.5)*spread*2;
  p.push(Math.cos(a)*radius,(rng()-.5)*(.18+Math.exp(-radial)*.7),Math.sin(a)*radius);
  const center=Math.exp(-radial*.7),color=new T.Color().setHSL(.62+rng()*.13,.4+radial*.05,.38+rng()*.35+center*.15);c.push(color.r*(1+center),color.g*(1+center),color.b*(1+center*.5));r.push(.025+Math.pow(rng(),6)*.20);
 }
 const stars=starsFrom(p,c,r,starMaterial(1.2,.95));system.add(stars);
 const dustGeometry=new T.PlaneGeometry(18,18);const dust=new T.Mesh(dustGeometry,new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{flow:{value:0}},vertexShader:`varying vec2 uvw;void main(){uvw=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 uvw;uniform float flow;float hash(vec2 p){return fract(sin(dot(p,vec2(79.7,269.3)))*34589.257);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=(uvw-.5)*18.;float r=length(p),a=atan(p.y,p.x);float n=noise(p*1.7+flow*.04)*.55+noise(p*5.4)*.3+noise(p*15.)*.15;float arms=pow(max(0.,.5+.5*cos(a*2.-r*1.48+n*.7)),7.);float halo=exp(-r*.17)*smoothstep(8.7,6.7,r);float gas=(arms*(.5+n)*.82+n*.055)*halo;float core=exp(-r*r*.77)*.85;vec3 color=mix(vec3(.19,.035,.49),vec3(.21,.43,.9),n);color=mix(color,vec3(.78,.83,1.),core);gl_FragColor=vec4(color*(gas+core),.86);}`}));dust.rotation.x=-Math.PI/2;dust.position.y=-.06;system.add(dust);
 for(let j=0;j<18;j++){const a=j*.4,rr=.3+j*.33;const glow=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:j%2?0x6552c2:0x507ed9,transparent:true,opacity:.12,blending:T.AdditiveBlending,depthWrite:false}));glow.position.set(Math.cos(a)*rr,.04,Math.sin(a)*rr);glow.scale.setScalar(.55+rr*.11);system.add(glow);}
 const core=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:0xdce8ff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));core.scale.set(2.5,2.5,1);system.add(core);
 distantPoints(w.scene,460,28);
 w.move=t=>{system.rotation.y=t*.075;stars.rotation.y=t*.012;dust.material.uniforms.flow.value=t;w.camera.position.set(-.5+t*.14,7.2-t*.17,14.5-t*.22);w.camera.lookAt(.6,.6,0);};
}

// 04. A neon balance suspended over a precision stage; left third is reserved for type.
{
 const w=world('justice',1920,1080,{background:0x03040b,bloom:.42});w.camera.position.set(0,.6,13.7);w.camera.lookAt(0,.1,0);
 const rig=new T.Group();rig.position.set(2.6,-2.4,0);w.scene.add(rig);
 const silver=metal(0xc7d8fa,.14),blue=metal(0x345dff,.18);
 const plinth=new T.Mesh(new T.CylinderGeometry(1.25,1.5,.24,64),blue);plinth.position.y=.02;rig.add(plinth);
 const rim=new T.Mesh(new T.TorusGeometry(1.4,.018,8,90),radiant(0x6f9dff,1.7));rim.rotation.x=Math.PI/2;rim.position.y=.12;rig.add(rim);
 const stem=new T.Mesh(new T.CylinderGeometry(.065,.12,4.65,24),silver);stem.position.y=2.4;rig.add(stem);
 const finial=new T.Mesh(new T.OctahedronGeometry(.23),silver);finial.position.y=4.91;rig.add(finial);
 const beam=new T.Group();beam.position.y=4.2;rig.add(beam);
 beam.add(rod([-2.23,0,0],[2.23,0,0],.068,silver));
 const arms=[];for(const sign of [-1,1]){
  const support=new T.Group();support.position.x=sign*2.02;beam.add(support);arms.push(support);
  const cap=new T.Mesh(new T.SphereGeometry(.11,16,12),radiant(0xb9d7ff,1.4));support.add(cap);
  for(let j=0;j<3;j++){const angle=j*Math.PI*2/3;support.add(rod([0,-.07,0],[Math.cos(angle)*.73,-1.78,Math.sin(angle)*.73],.009,silver));}
  const profile=[new T.Vector2(0,-.19),new T.Vector2(.16,-.17),new T.Vector2(.4,-.11),new T.Vector2(.64,-.015),new T.Vector2(.76,.04)];const bowl=new T.Mesh(new T.LatheGeometry(profile,64),new T.MeshPhysicalMaterial({color:0x9fb6ef,metalness:.95,roughness:.16,side:T.DoubleSide,envMapIntensity:1.2}));bowl.position.y=-1.82;support.add(bowl);
  const lip=new T.Mesh(new T.TorusGeometry(.76,.015,8,90),radiant(0x839eff,1.5));lip.rotation.x=Math.PI/2;lip.position.y=-1.78;support.add(lip);
 }
 const arch=new T.Group();arch.position.set(2.6,0,-2);w.scene.add(arch);
 for(let j=0;j<3;j++){const x=3.1+j*.24,y0=-2.7,y1=3.2+j*.1;arch.add(pathLine([[-x,y0,0],[-x,y1-.7,0],[-x+.65,y1,0],[x-.65,y1,0],[x,y1-.7,0],[x,y0,0]],j===1?0x7145a4:0x294bd4,.65-j*.1));}
 const floor=new T.Mesh(new T.PlaneGeometry(34,30),new T.MeshStandardMaterial({color:0x040711,roughness:.9,metalness:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.58;w.scene.add(floor);horizon(w.scene,-2.57);
 for(let i=0;i<7;i++){const line=rod([-6+i*2,-2.55,-5],[-6+i*2,-2.55,5],.008,radiant(0x182d68));w.scene.add(line);}
 const stageLight=new T.PointLight(0x2447ff,13,10);stageLight.position.set(2.4,0,2);w.scene.add(stageLight);
 w.move=t=>{beam.rotation.z=Math.sin(t*1.45)*.045;arms.forEach(a=>a.rotation.z=-beam.rotation.z);rig.rotation.y=-.07+Math.sin(t*.45)*.045;w.camera.position.z=13.7-t*.08;};
}

function shape(points){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
// 05. Slanted, knife-cut LHH letters, sculpted in solid chrome with a visible bevel.
{
 const w=world('chrome',1920,1080,{background:0x02040a,bloom:.19});w.camera.position.set(-3.6,1.45,12.9);w.camera.lookAt(0,0,0);
 w.scene.children.filter(o=>o.isLight).forEach(o=>o.intensity*=.34);
 const logo=new T.Group();w.scene.add(logo);
 const glyphs=[
 shape([[-4.25,-1.45],[-3.89,1.5],[-3.02,1.5],[-3.3,-.61],[-1.82,-.61],[-2.15,-1.45]]),
 shape([[-1.8,-1.45],[-1.45,1.5],[-.6,1.5],[-.72,.43],[.38,.43],[.51,1.5],[1.38,1.5],[1.04,-1.45],[.17,-1.45],[.30,-.45],[-.82,-.45],[-.93,-1.45]]),
 shape([[1.47,-1.45],[1.82,1.5],[2.68,1.5],[2.55,.43],[3.65,.43],[3.78,1.5],[4.65,1.5],[4.30,-1.45],[3.43,-1.45],[3.56,-.45],[2.45,-.45],[2.34,-1.45]])
 ];
 const geometry=new T.ExtrudeGeometry(glyphs,{depth:.68,steps:1,bevelEnabled:true,bevelThickness:.1,bevelSize:.09,bevelSegments:5});geometry.translate(-.2,0,-.34);
 const polished=metal(0xe2e9f9,.045);polished.envMapIntensity=1.5;logo.add(new T.Mesh(geometry,polished));
 const fins=new T.Group();logo.add(fins);
 const blades=[shape([[-5.5,1.75],[-3.9,1.78],[-1.1,2.72],[-2.8,2.53]]),shape([[5.65,-1.65],[3.9,-1.75],[1.05,-2.55],[2.75,-2.44]]),shape([[-5.2,-2.2],[-4.61,-1.56],[-4.42,.7],[-4.91,-.03]]),shape([[5.1,2.25],[4.84,1.43],[4.63,-.7],[5.12,.05]])];
 blades.forEach((s,i)=>{const b=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.15,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2}),polished);b.position.z=-.35-i*.03;fins.add(b);});
 const backdrop=new T.Group();w.scene.add(backdrop);
 for(let i=0;i<9;i++){const z=-3.5-i*.3;const rail=rod([-9+i*.25,-3,z],[7+i*.3,4,z],.011,radiant(i%3?0x182c63:0x4b2a6f));backdrop.add(rail);}
 const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0x02040a,metalness:.15,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-3.1;w.scene.add(ground);
 const kicker=new T.PointLight(0xd4e5ff,3,15);kicker.position.set(-4,3,5);w.scene.add(kicker);
 w.move=t=>{logo.rotation.set(.025,-.12+t*.045,-.035);logo.position.y=.05*Math.sin(t*.7);w.camera.position.set(-3.6+t*.65,1.45-t*.08,12.9-t*.14);w.camera.lookAt(0,0,0);w.scene.environmentRotation.y=-.12+t*.07;fins.rotation.z=Math.sin(t*.6)*.015;kicker.position.x=-4+t*2;};
}

// 06. A right-aligned purple knowledge sphere made from interleaving particle ribbons.
{
 const w=world('orb',1920,1080,{background:0x03030b,bloom:.43});w.camera.position.set(0,.15,13.1);w.camera.lookAt(0,.15,0);
 const sphere=new T.Group();sphere.position.set(2.75,.05,0);w.scene.add(sphere);const rng=random(90142),p=[],c=[],r=[];
 const n=16500;for(let i=0;i<n;i++){const y=1-2*(i+.5)/n;const radial=Math.sqrt(1-y*y);const angle=i*2.39996323;const jitter=(rng()-.5)*.06;const distance=2.44+(rng()-.5)*.14;const v=new T.Vector3(Math.cos(angle)*radial,y,Math.sin(angle)*radial).multiplyScalar(distance);v.y+=jitter;p.push(v.x,v.y,v.z);const stripe=.5+.5*Math.sin(angle*3+y*17);const col=new T.Color().setHSL(.71+rng()*.075,.5,.4+stripe*.22);c.push(col.r*1.65,col.g*1.65,col.b*1.65);r.push(.022+rng()*.052+stripe*.025);}
 const dots=starsFrom(p,c,r,starMaterial(1.95,1));sphere.add(dots);
 const atmosphere=new T.Mesh(new T.SphereGeometry(2.4,48,32),new T.MeshBasicMaterial({color:0x491c57,transparent:true,opacity:.075,depthWrite:false,blending:T.AdditiveBlending}));sphere.add(atmosphere);
 const inside=new T.LineSegments(new T.WireframeGeometry(new T.OctahedronGeometry(1.92,0)),new T.LineBasicMaterial({color:0x7180df,transparent:true,opacity:.7,toneMapped:false}));sphere.add(inside);
 for(let k=0;k<4;k++){const pts=[];for(let j=0;j<=80;j++){const a=-Math.PI*.9+j/80*Math.PI*1.8;pts.push([Math.cos(a)*(2.7+k*.05),Math.sin(a)*(2.7+k*.05),Math.sin(a*1.2+k)*.6]);}const trajectory=tube(pts,.006,radiant(k%2?0x8f6dcc:0x4672f1));trajectory.rotation.set(k*.55,.5+k*.25,.3);sphere.add(trajectory);}
 const wire=new T.Mesh(new T.IcosahedronGeometry(.55,0),metal(0x767aaf,.2));sphere.add(wire);
 distantPoints(w.scene,65,73);
 w.move=t=>{sphere.rotation.set(.08,t*.13,.16);inside.rotation.set(t*.17,-t*.23,0);wire.rotation.y=t*.3;w.camera.position.z=13.1-t*.055;};
}

window.worldMetadata=Object.fromEntries([...worlds].map(([id,w])=>[id,{width:w.width,height:w.height,frames:120,fps:30}]));
window.drawWorld=(id,seconds)=>{const w=worlds.get(id);if(!w)throw Error('Unknown world: '+id);gpu.toneMapping=w.white?T.NoToneMapping:T.ACESFilmicToneMapping;gpu.setSize(w.width,w.height,false);w.composer.setSize(w.width,w.height);w.camera.aspect=w.width/w.height;w.camera.updateProjectionMatrix();w.move(seconds);w.composer.render();return canvas.toDataURL('image/png');};
window.worldsReady=true;
