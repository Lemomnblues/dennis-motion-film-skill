import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'output/film.mp4');
const edit=JSON.parse(fs.readFileSync(path.join(root,'analysis/ending.json'),'utf8'));
const frames=Math.round(edit.duration*30);
const data=JSON.parse(execFileSync(ffprobe.path,['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
const v=data.streams.find(s=>s.codec_type==='video'),a=data.streams.find(s=>s.codec_type==='audio');
function require(value,why){if(!value)throw Error(why)}
require(v&&v.width===1920&&v.height===1080,'Dimensions');require(v.r_frame_rate==='30/1'&&Number(v.nb_frames)===frames,'Frame rate / count');require(Math.abs(Number(v.duration)-edit.duration)<.0001,'Video duration');require(a&&a.channels===2&&a.sample_rate==='48000'&&Math.abs(Number(a.duration)-edit.duration)<.05,'Audio format or duration');
const result=JSON.parse(execFileSync(ffprobe.path,['-v','error','-select_streams','v','-show_entries','frame=best_effort_timestamp_time','-of','json',file],{encoding:'utf8',maxBuffer:32e6}));let timestampError=0;result.frames.forEach((f,i)=>{timestampError=Math.max(timestampError,Math.abs(Number(f.best_effort_timestamp_time)-i/30))});require(timestampError<.00001,'Discontinuous frame timestamps');
execFileSync(ffmpeg,['-v','error','-i',file,'-map','0','-f','null','-'],{stdio:['ignore','ignore','pipe']});
const scan=spawnSync(ffmpeg,['-hide_banner','-i',file,'-an','-vf','blackdetect=d=0.15:pix_th=0.035:pic_th=0.99,freezedetect=n=-75dB:d=0.8','-f','null','-'],{encoding:'utf8',maxBuffer:16e6});require(scan.status===0,'Continuity scanner');const freezes=[...scan.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map(x=>Number(x[1]));const blacks=[...scan.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(x=>[Number(x[1]),Number(x[2])]);require(!freezes.some(t=>t<edit.lockTime-.10),'Unexpected frozen scene');require(!blacks.length,'Unexpected black interval');
// Compare AAC packet payloads with an independent encode of the verified
// soundtrack, in addition to validating exact video PTS and audio duration.
const packetHash = args => execFileSync(ffmpeg, ['-v','error',...args,'-map','0:a:0',
  '-f','hash','-hash','sha256','-'], {encoding:'utf8'}).trim();
const muxedAAC = packetHash(['-i',file,'-c:a','copy']);
const referenceAAC = packetHash(['-i',path.join(root,'assets/film-mix.wav'),'-t',String(edit.duration),'-c:a','aac','-b:a','256k','-ar','48000']);
require(muxedAAC===referenceAAC,'AAC payload differs from reference encode');
const fileHash = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const mix=JSON.parse(fs.readFileSync(path.join(root,'analysis/mix-review.json'),'utf8'));
require(mix.status==='PASS' && mix.outsideCueWindowsPcmIdentical && mix.naturalOutroPcmIdentical &&
  mix.sourceSha256===fileHash('assets/soundtrack.wav') && mix.cueSheetSha256===fileHash('analysis/progress-cues.json') &&
  mix.events.every(e=>e.measuredFrame===e.frame), 'Cue timing or music preservation failed');
require(fileHash('assets/film-mix.wav')===mix.masterSha256,'Mixed master hash differs from cue report');
const report={progressCueFrames:JSON.parse(fs.readFileSync(path.join(root,'analysis/progress-cues.json'))).events.map(e=>e.frame),mixMasterSha256:mix.masterSha256,file:path.relative(root,file),resolution:[1920,1080],fps:30,frames,duration:Number(v.duration),audioDuration:Number(a.duration),bpm:JSON.parse(fs.readFileSync(path.join(root,'analysis/beats.json'))).bpm,audioCheck:mix.status,aacPacketsMatchReference:true,packetHash:muxedAAC,frameTimestampMaxError:timestampError,fullDecode:'PASS',blackIntervals:blacks,freezeStarts:freezes,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};fs.writeFileSync(path.join(root,'output/quality-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
