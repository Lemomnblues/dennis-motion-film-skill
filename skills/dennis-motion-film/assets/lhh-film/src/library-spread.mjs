import {beatAt} from './evidence-beat.mjs';
import {P, lim, out, smooth, txt, ln, box, disc, stamp} from './graphic.mjs';

const C = {paper:'#f4f3f6', ink:'#161825', muted:'#586278', plum:'#491C57', blue:'#3159ed', night:'#101322', silk:'#e9e8f1'};

function lawIndex(g, t, beat, firstBeat) {
  const rows = [
    ['21', '第二十一条', '试用期解除的限制'],
    ['39', '第三十九条', '劳动合同解除的情形']
  ];
  // The finding aid is already legible inside the two expanding library portals.
  txt(g, '中华人民共和国劳动合同法', 94, 405, 44, C.ink, 'CN');
  ln(g, 95, 446, 857, 446, '#9993a8', 1.5);
  rows.forEach(([number, article, subject], i) => {
    const y = 462 + i * 196;
    const selected = smooth((t - .21 - i * .85) / .34);
    // Each statute tab unlocks on its own strike. The paper flexes around
    // its spine for a few frames; the section header and footer stay registered.
    const rank=beat.index-firstBeat, rowBeat=i===0?1:2;
    const prepare=rank===rowBeat-1?beat.prepare:0;
    const flex=rank===rowBeat?beat.spring:0;
    g.save();g.translate(94,y+90);g.transform(1+.025*flex-.017*prepare,-.010*flex,0,1+.015*flex,0,-7*flex+4*prepare);g.translate(-94,-y-90);
    box(g, 94, y, 763, 181, 0, i === 0 ? '#e9e3ef' : '#e7ebf6');
    box(g, 94, y, 5, 181 * selected, 0, i === 0 ? C.plum : C.blue);
    txt(g, number, 121, y + 141, 151, i === 0 ? C.plum : '#2844a6', 'Heavy');
    txt(g, article, 339, y + 62, 23, C.muted, 'CN');
    txt(g, subject, 336, y + 124, 41, C.ink, 'CN');
    ln(g, 339, y + 147, 339 + 403 * selected, y + 147, i === 0 ? '#b5a0c5' : '#98afde', 2);
    if(rank===rowBeat&&beat.age<.38){
      const travel=out(beat.age/.38);
      g.save();g.globalAlpha=.73*(1-travel);box(g,94,y,7+756*travel,4,0,i===0?C.plum:C.blue);g.restore();
    }
    g.restore();
  });
  txt(g, '按条款定位原文', 96, 920, 28, C.muted, 'CN');
}

function indexTab(g, x, y, w, fill, label) {
  g.beginPath();
  g.moveTo(x, y + 30);
  g.lineTo(x + 14, y);
  g.lineTo(x + w - 18, y);
  g.lineTo(x + w, y + 30);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  txt(g, label, x + w / 2, y + 23, 16, '#dce6ff', 'CN', 'center');
}

function exampleFile(g, t, beat, firstBeat) {
  const rank=beat.index-firstBeat;
  const wake=(rank===3||rank===4||rank===5)?beat.spring:0;
  const wind=(rank===2||rank===3||rank===4)?beat.prepare:0;
  const arrive = out((t + .09) / .48);
  g.save();
  g.translate(1049, 432 + 42 * (1 - arrive)+7*wind-12*wake);
  g.transform(1+.018*wake-.012*wind,-.009*wake+.007*wind,0,1+.014*wake,0,0);
  for (let k = 2; k >= 1; k--) {
    const spread = out((t + .08 - (2 - k) * .12) / .62);
    const x = (12 + spread * 6 + 15*wake-8*wind) * k;
    const y = -(10 + spread * 6+8*wake-5*wind) * k;
    box(g, x, y, 740, 426, 4, k === 2 ? '#30304e' : '#3b4e7d', '#6e7194');
    indexTab(g, x + 317 + 153 * (k - 1), y - 29, 145, k === 2 ? '#564368' : '#3d568b', k === 2 ? '相关材料' : '检索主题');
  }
  g.shadowColor = '#04071366';
  g.shadowBlur = 19;
  box(g, 0, 0, 740, 431, 4, '#edeef8');
  g.shadowBlur = 0;
  box(g, 0, 0, 740, 65, 0, C.blue);
  txt(g, '参考案例', 28, 44, 25, 'white', 'CN');
  txt(g, '典型案例 01', 708, 43, 22, '#e4eaff', 'CN', 'right');
  txt(g, '拒绝违法加班被辞退', 34, 165, 67, C.ink, 'CN');
  ln(g, 35, 198, 704, 198, '#bbc3d7');
  [['案情','试用期内拒绝超时加班'], ['比对点','解除理由与录用条件']].forEach(([label, value], i) => {
    const baseline = 259 + i * 92;
    const reveal = out((t - .16 - i * .27) / .42);
    txt(g, label, 35, baseline, 26, '#5a6785', 'CN');
    g.save();
    g.globalAlpha = .32 + .68 * reveal;
    txt(g, value, 210 + (1 - reveal) * 19, baseline + 2, 39, C.plum, 'CN');
    g.restore();
    ln(g, 35, baseline + 31, 704, baseline +31, '#c8cddc');
    if(rank===3+i&&beat.age<.46){
      const v=smooth(beat.age/.46);g.save();g.globalAlpha=1-v;
      ln(g,35+604*v,baseline+31,100+604*v,baseline+31,C.blue,4);g.restore();
    }
  });
  g.restore();
  txt(g, '人社部、最高法  ·  劳动人事争议典型案例（第二批）', 1051, 920, 25, '#b4bedb', 'CN');
}

// The right side is a case search example. No parties, court, docket or ruling
// are invented. The legal titles on the left identify research references.
export function drawLibraries(g, t, e) {
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 960, 1080);
  const field = g.createLinearGradient(960, 0, 1920, 1080);
  field.addColorStop(0, '#181729');
  field.addColorStop(.7, '#11172d');
  field.addColorStop(1, '#152343');
  g.fillStyle = field;
  g.fillRect(960, 0, 960, 1080);
  txt(g, '法律法规库', 92, 260, 105, P.purple, 'CN');
  txt(g, '案例库', 1051, 260, 105, P.paper, 'CN');
  txt(g, 'STATUTE INDEX', 97, 309, 19, C.muted, 'Mono');
  txt(g, 'CASE INDEX', 1055, 309, 19, '#9baed6', 'Mono');
  const beat=beatAt(e),firstBeat=beatAt(e,e.realT-t).index;
  lawIndex(g,t,beat,firstBeat);
  exampleFile(g,t,beat,firstBeat);
  ln(g, 960, 0, 960, 1080, '#84aeff', 3);
  // Matching cross-references close the spread on the final two beats.
  const joinStart=e.beats?.find(b=>b.index===firstBeat+5)?.frame/30;
  const joinEnd=e.beats?.find(b=>b.index===firstBeat+6)?.frame/30;
  const age=Number.isFinite(joinStart)?e.realT-joinStart:t-2.65;
  const interval=Number.isFinite(joinEnd-joinStart)?joinEnd-joinStart:.55;
  const join=smooth(age/interval),join2=out((age-interval)/.24);
  if (join > 0) {
    const cy = 967;
    ln(g, 390, cy, 390 + 570 * join, cy, '#8492d0', 2);
    ln(g, 1530, cy, 1530 - 570 * join, cy, '#9c98db', 2);
    disc(g, 390 + 570 * join, cy, 4 + 3 * join2, C.blue);
    disc(g, 1530 - 570 * join, cy, 4 + 3 * join2, '#afbaff');
    if(age>=interval){const strike=Math.exp(-(age-interval)*12);g.save();g.globalAlpha=.68*strike;
      g.strokeStyle='#779CFF';g.lineWidth=3.5;g.beginPath();g.arc(960,cy,10+50*(1-strike),0,Math.PI*2);g.stroke();g.restore();}

  }
  stamp(g, '08  /  SOURCE INDEX', e.realT);
  g.save();
  g.beginPath();
  g.rect(0, 0, 960, 1080);
  g.clip();
  stamp(g, '08  /  SOURCE INDEX', e.realT, true);
  g.restore();
}
