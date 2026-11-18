/**
 * LHH FESCO — evidence landscape, 32.900–43.000 s.
 * Motion adapted from the local SME scene implementations of DatavizLandscapeOpen
 * and BezierSourceConvergeMerge (video-shotcraft, Copyright 2026 Wei Yihao,
 * Apache License 2.0). The pinhole dolly, tangent-connected tributaries, arc-length
 * travel and synchronised receiver impulse are retained. New terrain, trajectories,
 * annotated source documents, opening receiver and voluntary consultation flow
 * were designed for this film. No reference media or audio is embedded.
 * Statute: https://www.mohrss.gov.cn/xxgk2020/fdzdgknr/zcfg/fl/202011/t20201102_394622_wap.html
 * Related published case: https://www.court.gov.cn/zixun/xiangqing/319151.html (case 1).
 */
import {beatAt} from './evidence-beat.mjs';
import {P, box, disc, fit, haze, lim, ln, ring, smooth, stamp, txt} from './graphic.mjs';

const WIDTH = 1920;
const HEIGHT = 1080;
const HORIZON = 346;
const LENS = 1100;
const ALTITUDE = 245;
const SHOT_START = 32.9;
const BLUE = '#4B80FF';
const CYAN = '#95D6FF';
const PAPER = '#F3F6FD';
const mix = (a, b, t) => a + (b - a) * t;
const fraction = (t, a, b) => lim((t - a) / (b - a));
const easeOut = t => 1 - Math.pow(1 - lim(t), 3);

// Event peaks use the nearest measured PCM beat on the output frame grid.
const cueCache = new WeakMap();
function cuesFor(beats) {
  const offsets = [0, .53, 1.06, 2.66, 4.24, 5.31, 7.43, 9.55];
  if (!Array.isArray(beats) || !beats.length) return offsets;
  if (!cueCache.has(beats)) {
    cueCache.set(beats, offsets.map(offset => {
      const goal = (SHOT_START + offset) * 30;
      let frame = Math.round(beats[0].frame ?? beats[0].time * 30);
      for (const beat of beats) {
        const candidate = Math.round(beat.frame ?? beat.time * 30);
        if (Math.abs(candidate - goal) < Math.abs(frame - goal)) frame = candidate;
      }
      return Math.max(0, frame / 30 - SHOT_START);
    }));
  }
  return cueCache.get(beats);
}

// The terrain and all branch endpoints are fixed in world coordinates. The
// dolly's easing is the reference camera's (.30,.30,.55,1) cubic timing curve.
function dollyCurve(value) {
  const component = (v, a, b) => 3 * (1-v)**2 * v * a + 3 * (1-v) * v*v * b + v**3;
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (component(mid, .30, .55) < value) low = mid; else high = mid;
  }
  return component((low + high) / 2, .30, 1);
}
function project(point, camera) {
  const depth = Math.max(50, point.z - camera.z);
  return {x: 960 + LENS * (point.x - camera.x) / depth,
    y: HORIZON + LENS * (ALTITUDE - (point.h || 0)) / depth,
    scale: LENS / depth, depth};
}
function groundAt(x, y) {
  const z = ALTITUDE * LENS / (y - HORIZON);
  return {x:(x - 960) * z / LENS, z};
}
const receiver = groundAt(1354, 529);
const sources = [
  {tag:'问题描述', copy:'试用期内解除劳动合同', color:'#9BD8FF', ground:groundAt(394, 795)},
  {tag:'法规依据', copy:'劳动合同法第21、39条', color:'#769DFF', ground:groundAt(893, 690)},
  {tag:'相关案例', copy:'拒绝违法超时加班案', color:'#C8AEF6', ground:groundAt(1542, 830)},
];
function cubicPoint(a, b, c, d, t) {
  const s = 1-t;
  return {x:s**3*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t**3*d.x,
    z:s**3*a.z+3*s*s*t*b.z+3*s*t*t*c.z+t**3*d.z};
}
// Arc length is measured in world space. The branches enter the same terminal
// with a common final tangent. Reprojection changes the apparent speed naturally.
function makeArc(source, index) {
  const start = source.ground;
  const control1 = {x:start.x + [-28, 28, 75][index], z:start.z + 278};
  const control2 = {x:receiver.x - 119, z:receiver.z - 236};
  const samples = Array.from({length:769}, (_, i) => cubicPoint(start, control1, control2, receiver, i / 768));
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) {
    lengths[i] = lengths[i-1] + Math.hypot(samples[i].x-samples[i-1].x, samples[i].z-samples[i-1].z);
  }
  function at(distanceFraction) {
    const target = lim(distanceFraction) * lengths.at(-1);
    let low = 1, high = samples.length - 1;
    while (low < high) {
      const mid = (low+high) >> 1;
      if (lengths[mid] < target) low = mid+1; else high = mid;
    }
    const t = (target-lengths[low-1]) / (lengths[low]-lengths[low-1] || 1);
    return {x:mix(samples[low-1].x, samples[low].x, t), z:mix(samples[low-1].z, samples[low].z, t)};
  }
  return {at};
}
const arcs = sources.map(makeArc);
// The foreground leads continue below the edge of frame. After their junction
// one thin trunk rises toward the horizon, keeping the network visibly connected.
const leads = sources.map((source, i) => {
  const end = source.ground;
  const offset = [-130, -38, 98][i];
  return {at: u => cubicPoint({x:end.x + offset, z:218},
    {x:end.x + offset, z:348}, {x:end.x + offset * .12, z:end.z - 156}, end, u)};
});
const trunk = {at: u => {
  const distance = u * 5500;
  return {x:receiver.x + distance*.29 + Math.sin(distance/710)*126,
    z:receiver.z + distance};
}};

// Nested isohypses model five separate ridges. Each elevated contour has depth,
// irregular world-space curvature and a consistent camera-relative silhouette.
const ridges = [
  [-800,1240,690,760,136,.8], [-230,2590,690,790,152,1.7],
  [760,2720,850,940,195,2.4], [740,1130,490,620,105,3.8],
  [-660,450,270,320,72,5.5],
];
const contours = [];
for (const [cx,cz,rx,rz,peak,seed] of ridges) {
  for (let level=0;level<24;level++) {
    const altitude=(level+.5)/24;
    const radius=Math.sqrt(1-altitude) * (1-.18*altitude);
    const points=[];
    for(let j=0;j<=144;j++) {
      const a=(j/144)*Math.PI*2;
      const bend=1+.12*Math.sin(3*a+seed+altitude*.8)+.065*Math.cos(5*a-seed);
      points.push({x:cx+rx*radius*Math.cos(a)*bend+altitude*78,
        z:cz+rz*radius*Math.sin(a)*bend, h:altitude*peak});
    }
    contours.push({points,depth:cz,level,seed});
  }
}
contours.sort((a,b)=>b.depth-a.depth || a.level-b.level);

function drawTerrain(g, t, camera, quiet) {
  const backdrop=g.createLinearGradient(0,0,WIDTH,HEIGHT);
  backdrop.addColorStop(0,'#050916'); backdrop.addColorStop(.40,'#10152D');
  backdrop.addColorStop(.72,'#101735'); backdrop.addColorStop(1,'#100A20');
  g.fillStyle=backdrop;g.fillRect(0,0,WIDTH,HEIGHT);
  g.save();g.translate(1310,HORIZON+15);g.scale(1,.31);
  haze(g,0,0,820,'#3655C3',.37-.1*quiet);g.restore();
  const shade=g.createLinearGradient(0,HORIZON,0,HEIGHT);
  shade.addColorStop(0,'rgba(16,26,54,.05)');shade.addColorStop(1,'rgba(1,3,11,.66)');
  g.fillStyle=shade;g.fillRect(0,HORIZON,WIDTH,HEIGHT-HORIZON);
  // Depth fog and irregular high-altitude contours keep distant ridges subordinate.
  for(const contour of contours) {
    const far=contour.depth>2000;
    const opacity=(far?.29:.24)*(1-.40*quiet)*(contour.level%4===0?1:.64);
    const color=contour.seed>3?'155,117,193':far?'106,133,203':'93,149,207';
    g.strokeStyle=`rgba(${color},${opacity})`;g.lineWidth=contour.level%4===0?1.48:1;
    g.beginPath();let pen=false;
    for(const world of contour.points) {
      if(world.z-camera.z<210){pen=false;continue;}
      const p=project(world,camera);
      if(pen)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);pen=true;
    }
    g.stroke();
  }
  // World-locked survey crosses on the near plain give the dolly a foreground.
  g.save();g.globalAlpha=.28*(1-.35*quiet);
  for(let z=435;z<3020;z+=180)for(let x=-1530;x<1570;x+=185) {
    const p=project({x,z},camera);
    if(p.x<45||p.x>1875||p.y>992)continue;
    const s=Math.min(2.9,1.5*p.scale);
    ln(g,p.x-s,p.y,p.x+s,p.y,'#718BB2',.8);
    ln(g,p.x,p.y-s,p.x,p.y+s,'#718BB2',.8);
  }
  g.restore();
  const horizonGlow=g.createLinearGradient(0,0,WIDTH,0);
  horizonGlow.addColorStop(0,'rgba(113,154,225,0)');horizonGlow.addColorStop(.7,'rgba(137,167,255,.26)');horizonGlow.addColorStop(1,'rgba(113,154,225,0)');
  ln(g,0,HORIZON,WIDTH,HORIZON,horizonGlow,1);
}

function ribbon(g, arc, camera, from, to, color, width, alpha) {
  if(to<=from+.001)return;
  g.save();g.globalAlpha*=alpha;
  const count=Math.max(5,Math.ceil((to-from)*66));
  const edgeA=[],edgeB=[];
  for(let i=0;i<=count;i++){
    const u=mix(from,to,i/count),p=project(arc.at(u),camera);
    const n=project(arc.at(Math.min(1,u+.002)),camera);
    const angle=Math.atan2(n.y-p.y,n.x-p.x)+Math.PI/2;
    const h=width*p.scale/2;
    edgeA.push([p.x+Math.cos(angle)*h,p.y+Math.sin(angle)*h]);
    edgeB.push([p.x-Math.cos(angle)*h,p.y-Math.sin(angle)*h]);
  }
  g.fillStyle=color;g.beginPath();
  [...edgeA,...edgeB.reverse()].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.closePath();g.fill();g.restore();
}
function drawPacket(g, arc, camera, progress, color, opacity, force=1) {
  if(progress<=0||progress>=1||opacity<=.001)return;
  const end=project(arc.at(progress),camera);
  ribbon(g,arc,camera,Math.max(0,progress-.095*force),progress,color,5.5*force,opacity*.84);
  ribbon(g,arc,camera,Math.max(0,progress-.035*force),progress,'#F5FAFF',2.8*force,opacity);
  haze(g,end.x,end.y,(16+4*force)*end.scale,color,opacity*.39);
  g.save();g.globalAlpha*=opacity;disc(g,end.x,end.y,(2.2+force)*end.scale,'#ECF7FF');g.restore();
}
function documentMark(g,x,y,color) {
  g.save();g.strokeStyle=color;g.lineWidth=2.1;g.lineJoin='round';
  g.beginPath();g.moveTo(x,y);g.lineTo(x+18,y);g.lineTo(x+27,y+9);g.lineTo(x+27,y+35);g.lineTo(x,y+35);g.closePath();g.stroke();
  ln(g,x+6,y+17,x+20,y+17,color,1.8);ln(g,x+6,y+24,x+17,y+24,color,1.8);g.restore();
}
function drawSource(g, source, point, visibility, travel, index, prepare, strike) {
  if(visibility<.001||travel>.995)return;
  const remaining=1-travel;
  const zoom=(.73+.27*remaining)*Math.pow(remaining,.57)*(1-.063*prepare+.052*strike);
  const lift=20*easeOut(visibility), height=(40+lift-13*prepare+15*strike)*remaining;
  const y=point.y-height;
  g.save();g.globalAlpha*=visibility;
  ln(g,point.x,point.y,point.x,y,source.color,1.2*zoom);
  disc(g,point.x,point.y,4.4*zoom,source.color);
  g.translate(point.x,y);g.scale(zoom,zoom);g.rotate((index-1)*(.024*prepare-.017*strike));
  // Two offset paper edges plus a light metal clip read as an actual source dossier.
  box(g,-189,-101,378,96,8,'#121A31','#475272',1);
  box(g,-191,-109,382,101,8,'#202B42','#6B7998',1);
  const skin=g.createLinearGradient(-190,-114,191,-1);
  skin.addColorStop(0,'#EDF4FF');skin.addColorStop(.65,'#D6E0F1');skin.addColorStop(1,'#B4C4E0');
  box(g,-194,-115,388,102,8,skin,'#F8FBFF',1);
  box(g,-194,-114,6,99,2,index===2?'#745489':'#476BDE');
  documentMark(g,-170,-89,index===2?'#704685':'#2C4BB7');
  txt(g,source.tag,-121,-79,22,'#354869','CN');
  fit(g,source.copy,-121,-38,30,300,'#101A32','CN');
  g.restore();
}
function header(g, t, summaryProgress) {
  const enter=easeOut((t+.1)/.45);
  const shrink=1-.17*summaryProgress;
  g.save();g.translate(102,129+(1-enter)*19);g.globalAlpha=enter;g.scale(shrink,shrink);
  txt(g,'用工咨询  /  试用期',0,29,24,'#B6C8ED','CN');
  txt(g,'试用期能否',-4,132,84,P.paper,'CN');
  txt(g,'随意辞退员工？',-5,237,96,'#D4DEFF','CN');
  g.restore();
}
function receiverMark(g, x, y, scale, pulse) {
  g.save();g.translate(x,y);g.scale(scale,scale);
  haze(g,0,0,132+16*pulse,'#496DFF',.28);
  g.save();g.scale(1,.28);ring(g,0,55,104,'#5976E1',2.3);ring(g,0,55,118,'#394477',1);g.restore();
  g.beginPath();g.moveTo(-43,-19);g.lineTo(0,-43);g.lineTo(43,-19);g.lineTo(0,5);g.closePath();g.fillStyle='#C5DCFF';g.fill();
  g.beginPath();g.moveTo(-43,-18);g.lineTo(0,6);g.lineTo(0,44);g.lineTo(-43,19);g.closePath();g.fillStyle='#557AFF';g.fill();
  g.beginPath();g.moveTo(43,-18);g.lineTo(0,6);g.lineTo(0,44);g.lineTo(43,19);g.closePath();g.fillStyle='#49367D';g.fill();g.restore();
}

function cursor(g,x,y,alpha,scale){
  if(alpha<=0)return;
  g.save();g.translate(x,y);g.scale(scale,scale);g.globalAlpha*=alpha;
  g.beginPath();g.moveTo(0,0);g.lineTo(8,31);g.lineTo(15,22);g.lineTo(28,22);g.closePath();g.fillStyle='#F5F7FF';g.fill();g.strokeStyle='#3D366A';g.lineWidth=2;g.stroke();g.restore();
}
function proofMark(g,t,when,x,y,w,ink){
  // The decision and legal references each receive a short proofing stroke.
  // Three pre-beat frames load its left stop; the text never leaves its baseline.
  const dt=t-when;
  if(dt<-.13||dt>.64)return;
  const charging=dt<0?smooth((dt+.13)/.13):1;
  const run=smooth(dt/.4),decay=1-smooth((dt-.29)/.35);
  g.save();g.globalAlpha*=decay;
  box(g,x-3,y-3,6,6+8*charging,2,ink);
  if(dt>=0){
    const xx=x+w*run;
    ln(g,x,y+2,xx,y+2,ink,2.5);
    disc(g,xx,y+2,4.8-2.3*run,ink);
  }
  g.restore();
}

function drawSummary(g, anchor, t, receiveTime, followTime, clickTime, confirmAt, referenceAt) {
  const seconds=t-receiveTime;
  if(seconds<0)return;
  const deploy=easeOut(seconds/.68);
  // The receiver widens into the document at the very same screen-space anchor.
  const centerX=mix(anchor.x,1270,deploy),centerY=mix(anchor.y,570,deploy);
  // A small damped overshoot travels across the mounting edge while the text
  // becomes visible. Its amplitude drops below a pixel during the reading hold.
  const spring=Math.sin(seconds*16)*Math.exp(-seconds*8);
  const width=mix(118,938,deploy)+38*spring,height=mix(88,636,deploy)+24*spring;
  const left=centerX-width/2,top=centerY-height/2;
  g.save();
  g.shadowColor='rgba(0,0,10,.4)';g.shadowBlur=31;g.shadowOffsetY=19;
  box(g,left+13*deploy,top+16*deploy,width,height,14,'#262542','#77688C');
  g.shadowBlur=0;g.shadowOffsetY=0;
  box(g,left+6*deploy,top+9*deploy,width,height,13,'#8A96B0','#BCC8DE');
  const paper=g.createLinearGradient(left,top,left+width,top+height);
  paper.addColorStop(0,'#FFFFFF');paper.addColorStop(.7,'#F0F3FA');paper.addColorStop(1,'#DEE5F4');
  box(g,left,top,width,height,13,paper,'#FBFDFF',1.5);
  g.beginPath();g.roundRect(left+1,top+1,width-2,height-2,12);g.clip();
  g.translate(left,top);
  if(seconds<.50){
    const streak=lim(seconds/.5);
    const gloss=g.createLinearGradient(width*streak-60,0,width*streak+32,0);
    gloss.addColorStop(0,'#FFFFFF00');gloss.addColorStop(.62,'#BFCFFF94');gloss.addColorStop(1,'#FFFFFF00');
    g.fillStyle=gloss;g.fillRect(width*streak-60,0,92,height);
  }
  g.globalAlpha*=smooth(fraction(seconds,.16,.58));
  if(g.globalAlpha>.001){
    const edge=54;
    box(g,0,0,14,640,0,'#491C57');
    txt(g,'咨询摘要',edge,99,63,'#242437','CN');
    txt(g,'试用期解除劳动合同',edge,157,31,'#65718A','CN');
    ln(g,edge,186,884,186,'#BFCADB',1.5);
    txt(g,'参考答复',edge,242,24,'#435BA4','CN');
    txt(g,'试用期不能随意辞退。',edge,308,48,'#17223A','CN');
    txt(g,'以不符合录用条件为由解除，需有证据支持。',edge,365,32,'#3D4C66','CN');
    txt(g,'解除时，还应向员工说明理由。',edge,409,32,'#3D4C66','CN');
    ln(g,edge,444,884,444,'#C2CDDE',1.5);
    txt(g,'法规依据',edge,497,24,'#52617B','CN');
    fit(g,'《劳动合同法》第21条、第39条第1项',203,498,26,640,'#2D3D5B','CN');
    proofMark(g,t,confirmAt,edge,320,446,'#7266A5');
    proofMark(g,t,referenceAt,203,511,478,'#577CD9');
    const active=smooth(fraction(t,followTime-.23,followTime+.17));
    const pressed=t>=clickTime;
    const clickPulse=pressed?Math.exp(-(t-clickTime)*15):0;
    box(g,edge,535,830,62,7,active>.01?'#4D245D':'#E0E7F5');
    if(active>.01){g.save();g.globalAlpha*=active;txt(g,'转人工咨询',edge+27,578,30,'#FCF8FF','CN');txt(g,'→',844,579,33,'#E9D8F2','Sans','right');g.restore();}
    else txt(g,'查看法规与相关案例',edge+27,576,27,'#3C507A','CN');
    if(active>.8){
      const hover=smooth(fraction(t,followTime+.48,clickTime-.09));
      cursor(g,mix(934,746,hover),mix(637,564,hover),hover,1-clickPulse*.11);
      if(pressed)ring(g,746,564,8+(1-clickPulse)*31,`rgba(255,255,255,${clickPulse*.9})`,2);
    }
  }
  g.restore();
}
function followUp(g,t,when){
  const a=easeOut((t-when)/.44);
  if(a<=0)return;
  g.save();g.globalAlpha*=a;g.translate(104,635+(1-a)*18);
  ln(g,0,0,512,0,'#797FA8',1.3);
  txt(g,'待核实',0,52,26,'#ABAAD8','CN');
  txt(g,'录用条件是否已告知？',0,120,43,P.paper,'CN');
  txt(g,'考核记录能否支持解除理由？',0,181,32,'#C2CEE5','CN');
  g.restore();
}

/** Draws a complete, continuous 1920×1080 shot. local is scene time; compositor
 * e.elapsed is preferred because it already follows the quantised music cuts. */
export function drawEvidenceFlow(g,local,e={}) {
  const t=lim(e.elapsed??local,0,10.1);
  const cue=cuesFor(e.beats);
  const sceneStart=(e.realT??(SHOT_START+t))-t;
  const sharedFrame=e.progressFrames?.['summary-ready'];
  const receiveTime=Number.isInteger(sharedFrame)?sharedFrame/30-sceneStart:cue[4];
  const receiveFrame=Math.round((sceneStart+receiveTime)*30);
  const earlier=(e.beats||[]).filter(b=>b.frame<receiveFrame).slice(-3);
  const before=earlier.length===3?earlier.map(b=>b.frame/30-sceneStart):[receiveTime-1.59,receiveTime-1.06,receiveTime-.53];
  const capture=[before[1],before[2],receiveTime],depart=[before[0],before[0],before[1]];
  const beat=beatAt(e,e.realT??SHOT_START+t);
  const followTime=cue[6],clickTime=cue[7];
  const cameraProgress=dollyCurve(t/10.1);
  const camera={z:122*cameraProgress,x:38*cameraProgress};
  const deploy=smooth(fraction(t,receiveTime,receiveTime+.65));
  const anchor=project(receiver,camera);
  g.save();drawTerrain(g,t,camera,deploy);
  const reach=easeOut((t+.15)/1.45),groundStrength=1-.72*deploy;
  ribbon(g,trunk,camera,0,reach,'#547CFF',16,.12*groundStrength);
  ribbon(g,trunk,camera,0,reach,'#8AB6FF',4.7,.83*groundStrength);
  for(let i=0;i<sources.length;i++){
    const leadStrength=groundStrength*(1-.74*smooth(fraction(t,cue[3],receiveTime)));
    const leadReach=easeOut((t-cue[i]+.2)/.56);
    ribbon(g,leads[i],camera,0,leadReach,sources[i].color,13,.07*leadStrength);
    ribbon(g,leads[i],camera,0,leadReach,sources[i].color,2.2,.57*leadStrength);
    const source=sources[i],arc=arcs[i];
    const arrival=cue[i];
    const growth=easeOut((t-arrival+.20)/.82);
    // One packet lands per measured beat. The rising source pauses, then
    // accelerates toward its collector; the luminous tip survives the tiny card.
    const flight=fraction(t,depart[i],capture[i]);
    const travel=flight*flight*(2.12-1.12*flight);
    const winding=t<depart[i]?smooth((t-depart[i]+.16)/.16):0;
    const launch=t>=depart[i]?Math.exp(-(t-depart[i])*13):0;
    const erasure=easeOut(fraction(t,receiveTime+.10,receiveTime+1.34));
    // Colour and thickness vary in perspective. Only the illuminated core blooms.
    ribbon(g,arc,camera,erasure,growth,source.color,9,.06);
    ribbon(g,arc,camera,erasure,growth,source.color,2.2,.72);
    const phase=((beat.index+beat.phase+i*.69)/2)%1;
    if(phase<growth&&flight===0)drawPacket(g,arc,camera,phase,source.color,growth*.88,1+beat.hit*.62);
    if(flight>0&&flight<1)drawPacket(g,arc,camera,travel,source.color,1,1.75+flight*.85);
    const position=project(arc.at(travel),camera);
    drawSource(g,source,position,easeOut((t-arrival+.10)/.33),travel,i,winding,launch);
    const absorbed=t-capture[i];
    if(absorbed>=0&&absorbed<.42){
      const wave=1-Math.exp(-absorbed*8); g.save();
      g.translate(anchor.x,anchor.y+8);g.scale(1,.34);g.globalAlpha=(1-wave)*.9;
      ring(g,0,0,(i===2?102:71)+wave*(i===2?251:146),source.color,i===2?7:5);
      g.restore();
    }
  }
  const hit=t>=receiveTime?Math.exp(-(t-receiveTime)*12):0;
  const ready=t<receiveTime?smooth((t-receiveTime+.13)/.13):0;
  const earlierStrike=capture.slice(0,2).reduce((sum,when)=>sum+(t>=when?Math.exp(-(t-when)*13):0),0);
  if(deploy<1)receiverMark(g,anchor.x,anchor.y,(1-.13*ready+.17*earlierStrike+.42*hit)*(1-.4*deploy),e.pulse??0);
  if(hit>.02){
    const fan=1-hit;
    g.save();g.globalAlpha=.9*hit;
    ln(g,anchor.x-63-260*fan,anchor.y,anchor.x-55-31*fan,anchor.y,'#DBE7FF',3.4);
    ln(g,anchor.x+55+31*fan,anchor.y,anchor.x+63+260*fan,anchor.y,'#C7D9FF',3.4);
    g.restore();
  }
  if(hit>.012)ring(g,anchor.x,anchor.y,51+(1-hit)*115,`rgba(144,197,255,${hit*.85})`,2.3);
  header(g,t,deploy);
  const referenceFrame=(e.beats||[]).find(b=>b.frame>=Math.round((sceneStart+cue[5]+.88)*30))?.frame;
  const referenceAt=referenceFrame===undefined?cue[5]+1.06:referenceFrame/30-sceneStart;
  drawSummary(g,anchor,t,receiveTime,followTime,clickTime,cue[5],referenceAt);
  followUp(g,t,followTime);
  stamp(g,'',e.realT??SHOT_START+t);
  g.restore();
}
