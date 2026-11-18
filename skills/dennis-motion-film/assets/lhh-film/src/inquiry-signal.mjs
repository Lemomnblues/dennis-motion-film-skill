/**
 * LHH FESCO employment inquiry and preparation scenes.
 * The localized glitch treatment in drawSignal adapts SME's glitch-cycle.mjs,
 * itself adapted from video-shotcraft / GlitchCycle, Copyright 2026 Wei Yihao,
 * licensed under Apache License 2.0. Changes: four fixed CJK slots, a separate
 * factual checklist, source-drum frame cues, restrained ink separation, and a
 * clean final hold. The printed inquiry dossier is an original LHH scene.
 */
import {createCanvas} from '@napi-rs/canvas';
import {P, base, box, disc, fit, haze, lim, ln, out, polygon, smooth, stamp, txt} from './graphic.mjs';

const FPS = 30;
const W = 1920;
const H = 1080;
const PAPER = '#F2F2EB';
const INK = '#111C36';
const GRAY = '#56657A';
const FRAME = '#C2C8C9';
const VIOLET = '#491C57';
const BLUE = '#254DFF';

function alpha(g, amount, draw) {
  g.save();
  g.globalAlpha *= lim(amount);
  draw();
  g.restore();
}

function hash(n) {
  const v = Math.sin(n * 91.373 + 17.41) * 43758.5453;
  return v - Math.floor(v);
}

function beatFrame(e, target, lower, upper) {
  let best = Math.max(lower, Math.min(upper, Math.round(target)));
  let delta = Infinity;
  for (const beat of e.beats || []) {
    if (beat.frame < lower || beat.frame > upper) continue;
    const distance = Math.abs(beat.frame - target);
    if (distance < delta) { best = beat.frame; delta = distance; }
  }
  return best;
}

function times(local, e) {
  const elapsed = e.elapsed ?? local;
  const real = e.realT ?? elapsed;
  return {elapsed, real, start: Math.round((real - elapsed) * FPS), frame: Math.round(real * FPS)};
}

function rule(g, x, y, width, color = FRAME, thick = 1) {
  ln(g, x, y, x + width, y, color, thick);
}

function tracked(g, word, x, y, size, spacing, color) {
  for (const letter of word) {
    txt(g, letter, x, y, size, color, 'Mono', 'left', 400);
    x += g.measureText(letter).width + spacing;
  }
}

function registration(g, x, y) {
  ln(g, x - 9, y, x + 9, y, '#839197');
  ln(g, x, y - 9, x, y + 9, '#839197');
  disc(g, x, y, 2.3, '#839197');
}

const printTexture = createCanvas(320, 220);
{
  const c = printTexture.getContext('2d');
  const pixels = c.createImageData(320, 220);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = hash(i / 4);
    const shade = value > .52 ? 255 : 56;
    pixels.data[i] = shade;
    pixels.data[i + 1] = shade;
    pixels.data[i + 2] = shade;
    pixels.data[i + 3] = Math.floor(value * 25);
  }
  c.putImageData(pixels, 0, 0);
}

function paperSurface(g) {
  const wash = g.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, '#FAFBF7');
  wash.addColorStop(.57, PAPER);
  wash.addColorStop(1, '#E0E6EC');
  g.fillStyle = wash;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = .45;
  const pattern = g.createPattern(printTexture, 'repeat');
  g.fillStyle = pattern;
  g.fillRect(0, 0, W, H);
  g.restore();
  rule(g, 74, 111, 1772, '#A6B3B9');
  rule(g, 74, 961, 1772, '#ACB7BD');
  registration(g, 1021, 149);
  registration(g, 1811, 922);
}

function drawBinder(g) {
  const metal = g.createLinearGradient(-48, 0, 49, 12);
  metal.addColorStop(0, '#14202A');
  metal.addColorStop(.20, '#87939C');
  metal.addColorStop(.32, '#283039');
  metal.addColorStop(.74, '#111920');
  metal.addColorStop(1, '#697C88');
  polygon(g, [[-48,0],[48,0],[37,46],[-37,46]], metal);
  for (const [x1, x2, y] of [[-31,-16,-55],[31,16,-55]]) {
    g.beginPath();
    g.moveTo(x1, 14);
    g.bezierCurveTo(x1, -6, x2, -24, x2, y);
    g.bezierCurveTo(x2, y - 16, -x2, y - 16, -x2, y);
    g.strokeStyle = '#535E69';
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = '#DDE3E5';
    g.lineWidth = 1.5;
    g.stroke();
  }
}

function stampTool(g,age){
  if(age < -7 || age > 7)return;
  const descent=age<0 ? 1-(1+age/7)**3 : smooth(age/7);
  const opacity=age<0?lim((age+7)/3):1-smooth((age-1)/5);
  g.save();g.globalAlpha*=opacity;
  g.translate(20+52*descent,228-212*descent);g.rotate(-.055+.07*descent);
  // The shadow converges below the die as it reaches the inked paper face.
  g.shadowColor='rgba(15,12,25,.30)';g.shadowBlur=10+22*descent;g.shadowOffsetY=3+16*descent;
  const metal=g.createLinearGradient(0,-28,0,30);metal.addColorStop(0,'#5F6580');metal.addColorStop(.38,'#333A56');metal.addColorStop(.82,'#20263C');metal.addColorStop(1,'#8C93AA');
  box(g,-223,-41,446,82,8,metal,'#8790A8',1.6);g.shadowBlur=0;g.shadowOffsetY=0;
  box(g,-211,26,422,16,4,'#272236');
  const grip=g.createLinearGradient(-48,0,48,0);grip.addColorStop(0,'#301139');grip.addColorStop(.47,'#86518C');grip.addColorStop(1,'#38163E');
  box(g,-52,-112,104,91,16,grip,'#79517F');box(g,-75,-135,150,54,18,grip,'#916D95');
  rule(g,-201,-21,139,'#A3ACC2',2);g.restore();
}

function paperStack(g, t, stampAge) {
  const result=stampAge>=0?1:0;
  const impact=stampAge>=0&&stampAge<8?(1-stampAge/8)**2:0;
  const settle = out(t / .40);
  g.save();
  g.translate(1395 + 91 * (1 - settle) + Math.cos(t * .65) * 3, 555 + 40 * (1 - settle) + 11*impact);
  g.rotate(-.064 + .065 * (1 - settle));
  g.scale(.94 + .025 * settle, .94 + .025 * settle);
  g.shadowColor = '#3034574D';
  g.shadowBlur = 45;
  g.shadowOffsetY = 30;
  g.save();
  g.rotate(.085);
  box(g,-339,-333,680,736,5,'#2339B9');
  box(g,-332,-354,228,55,7,'#2339B9');
  g.restore();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.save();
  g.rotate(.045);
  box(g,-320,-340,646,721,2,'#D6DADC','#AEB8CA');
  g.restore();
  box(g,-325,-355,645,723,2,'#FCFCF6','#B4B9BC');
  g.fillStyle = g.createPattern(printTexture,'repeat');
  g.fillRect(-324,-354,643,721);
  tracked(g,'PERSONNEL RECORD',-278,-283,18,2.0,GRAY);
  txt(g,'试用期考核记录',-278,-206,56,INK,'CN');
  rule(g,-278,-172,547,INK,3);
  const rows = [['岗位','客户服务'],['入职天数','45 天'],['评估阶段','试用期考核']];
  rows.forEach(([name,value],i) => {
    const y = -104 + i * 86;
    txt(g,name,-276,y,25,GRAY,'CN');
    txt(g,value,-67,y,34,INK,'CN');
    rule(g,-278,y+26,547,'#CBD1D0');
  });
  txt(g,'考核结果',-276,146,25,GRAY,'CN');
  g.save();
  g.translate(16,228);
  g.rotate(-.055);
  const press = 1 + .045 * impact;
  g.scale(press,press);
  alpha(g, result, () => {
    box(g,-217,-62,437,117,1,null,VIOLET,4);
    box(g,-209,-54,421,101,1,null,'#6A446D',1);
    txt(g,'未达预期',0,26,65,VIOLET,'CN','center');
  });
  g.restore();
  rule(g,-278,311,547,'#B9C2C1');
  txt(g,'用工情境示例',-275,342,17,GRAY,'CN');
  g.save();g.translate(44,-364);drawBinder(g);g.restore();
  stampTool(g,stampAge);
  g.restore();
}

function clippedText(g, value, x, baseline, fontSize, color, reveal) {
  g.save();
  g.beginPath();g.rect(x-5,baseline-fontSize*1.18,1020,fontSize*1.43);g.clip();
  txt(g,value,x,baseline+(1-out(reveal))*fontSize*1.35,fontSize,color,'CN');
  g.restore();
}

export function drawInquiry(g, local, e) {
  const {elapsed,real,start,frame} = times(local,e);
  const assessment = beatFrame(e,start+16,start+10,start+23);
  const question = beatFrame(e,start+49,start+42,start+55);
  paperSurface(g);
  paperStack(g,elapsed,frame-assessment);
  g.fillStyle=BLUE; g.fillRect(96,173,8,58);
  txt(g,'HR 用工咨询',125,215,39,INK,'CN');
  tracked(g,'CASE INTAKE',386,212,17,2,GRAY);
  clippedText(g,'试用期考核',88,431,123,INK,(frame-start+3)/6);
  clippedText(g,'未达预期。',85,611,154,VIOLET,(frame-assessment+1)/6);
  const ask = out((frame-question+1)/7);
  // The printed docket stays in the scene while the HR question opens a new line.
  rule(g,99,704,777,'#9BA9B3');
  alpha(g,ask,()=>{
    g.save();g.translate(0,(1-ask)*18);
    box(g,100,746,8,111,0,BLUE);
    txt(g,'HR 提问',127,773,24,BLUE,'CN');
    fit(g,'可以直接辞退吗？',125,853,79,795,INK,'CN');
    g.restore();
  });
  if (frame<question) {
    tracked(g,'PROBATION REVIEW',100,766,19,3.1,GRAY);
  }
  stamp(g,'03  /  HR CONSULTATION',real,true);
}

const PREP = [
  {word:'录用条件', en:'HIRING CRITERIA', prompt:'入职时约定了哪些条件？'},
  {word:'考核记录', en:'REVIEW RECORDS', prompt:'哪些记录反映工作表现？'},
  {word:'沟通时间', en:'COMMUNICATION', prompt:'何时向员工反馈过结果？'},
  {word:'待问事项', en:'OPEN QUESTIONS', prompt:'还需要向顾问确认什么？'},
];
const NOISE_GLYPHS = [...'条件核录间时问项需认用沟'];
const ROW = createCanvas(944,230);
const glyphs = ROW.getContext('2d');
const PROBABILITY = [1,0,0,.10,0,0,1];
const FINAL_PROBABILITY = [1,0,0,.10,0,0,0];

function envelope(keys, position) {
  const scaled = lim(position) * (keys.length-1);
  const a = Math.min(keys.length-2,Math.floor(scaled));
  return keys[a] + (keys[a+1]-keys[a]) * (scaled-a);
}

function signalCues(e, start) {
  const end = start + Math.round((e.shotDuration ?? 112/FPS)*FPS);
  return [start, beatFrame(e,start+32,start+25,start+39),
    beatFrame(e,start+64,start+55,start+69),beatFrame(e,start+80,start+73,end-20),end];
}

function stateAt(frame,cues) {
  let index=0;
  while(index<3 && frame>=cues[index+1])index++;
  const age=Math.max(0,frame-cues[index]);
  const length=index===3?8:Math.max(1,cues[index+1]-cues[index]);
  const prob=age===0?1:envelope(index===3?FINAL_PROBABILITY:PROBABILITY,age/length);
  return {index,age,prob,bucket:Math.floor(frame/2)};
}

function registerGlyphs(g, state, shift, tint, opacity) {
  g.save();g.globalAlpha=opacity;
  const letters=[...PREP[state.index].word];
  for(let i=0;i<4;i++){
    const nz=hash(1+state.bucket*29+i*97+state.index*11);
    const hot=nz<state.prob;
    const cp=hot?NOISE_GLYPHS[Math.floor(hash(71+state.bucket*23+i*31)*NOISE_GLYPHS.length)]:letters[i];
    txt(g,cp,115+i*231+shift,182,190,tint || (hot?'#A4BAFF':'#F0F0FA'),'CN','center');
  }
  g.restore();
}

function drawSlotBand(g, state) {
  const strength=state.prob;
  glyphs.resetTransform();glyphs.clearRect(0,0,ROW.width,ROW.height);
  if(strength>.03){
    registerGlyphs(glyphs,state,-9*strength,'#2D80F8',strength*.80);
    registerGlyphs(glyphs,state,8*strength,'#BD7BCE',strength*.65);
  }
  registerGlyphs(glyphs,state,0,null,1);
  // Sampling only this narrow transparent layer keeps the surrounding checklist legible.
  const destinationX=82,destinationY=412;
  if(strength<.16){g.drawImage(ROW,destinationX,destinationY);return;}
  const stripe=64+Math.floor(hash(state.bucket+19)*69);
  const height=13+Math.floor(hash(state.bucket+33)*17);
  const shift=(hash(state.bucket+14)-.5)*64*strength;
  g.drawImage(ROW,0,0,944,stripe,destinationX,destinationY,944,stripe);
  g.drawImage(ROW,0,stripe,944,height,destinationX+shift,destinationY+stripe,944,height);
  g.drawImage(ROW,0,stripe+height,944,230-stripe-height,destinationX,destinationY+stripe+height,944,230-stripe-height);
}

function checklist(g, index, age) {
  const x=1139,w=654;
  txt(g,'咨询准备清单',x,314,41,'#E5E5F3','CN');
  rule(g,x,343,w,'#55516C');
  const highlightY=365+121*index-(index===0?0:121)*(1-out((age+1)/7));
  const hit=age<9?(1-lim(age/9))**2:0;
  const gradient=g.createLinearGradient(x,0,x+w,0);
  gradient.addColorStop(0,hit>.38?'#573E70':'#382547');gradient.addColorStop(1,'#18263F');
  box(g,x,highlightY,w,107,1,gradient);
  box(g,x,highlightY,4+5*hit,107,0,'#B6ACFA');
  PREP.forEach((item,i)=>{
    const y=365+i*121;
    const live=i===index;
    txt(g,`0${i+1}`,x+16,y+46,19,live?'#B8B8FF':'#70809D','Mono','left',400);
    txt(g,item.word,x+77,y+44,30,live?'#FFFFFF':'#BBC2D5','CN');
    txt(g,item.prompt,x+77,y+85,28,live?'#D5D8E9':'#99A6C2','CN');
    rule(g,x,y+117,w,'#30394C');
  });
}

export function drawSignal(g,local,e) {
  const {elapsed,real,start,frame}=times(local,e);
  const cues=signalCues(e,start);
  const state=stateAt(frame,cues);
  base(g,elapsed);
  haze(g,822,574,686,'#374894',.18);
  const cut=Math.max(0,Math.min(111,frame-start));
  const xScan=118+(cut/111)*881;
  for(let x=94;x<1080;x+=67)ln(g,x,340,x,771,'#29334855');
  for(let y=341;y<=771;y+=53)rule(g,93,y,916,'#2A344750');
  ln(g,xScan,341,xScan,771,'#668AC340',1);
  txt(g,'咨询前，先理清事实。',88,239,82,P.paper,'CN');
  tracked(g,'BEFORE THE CONSULTATION',92,291,17,2.4,'#91A2C4');
  rule(g,91,341,928,'#465475');rule(g,91,772,928,'#465475');
  for(const [x,sx]of[[91,1],[1019,-1]])for(const [y,sy]of[[341,1],[772,-1]]){
    ln(g,x,y,x+20*sx,y,'#8192B9',2);ln(g,x,y,x,y+20*sy,'#8192B9',2);
  }
  drawSlotBand(g,state);
  tracked(g,PREP[state.index].en,103,699,27,3.4,'#AABAD6');
  const marks=[0,1,2,3],left=97,w=220;
  marks.forEach(i=>{
    const x=left+i*232;
    rule(g,x,856,w,i<state.index?'#6D75AA':'#313D53',3);
    if(i===state.index){
      const portion=lim((frame-cues[i]+1)/(cues[i+1]-cues[i]));
      rule(g,x,856,Math.max(5,w*portion),'#8A9EFF',4);
    }
  });
  txt(g,'HR  /  用工咨询',97,906,26,'#A0ABC2','CN');
  checklist(g,state.index,state.age);
  stamp(g,'06  /  CASE PREPARATION',real,false);
}
