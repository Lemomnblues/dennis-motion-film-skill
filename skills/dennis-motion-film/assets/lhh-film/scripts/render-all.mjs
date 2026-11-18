import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const force=process.argv.includes('--force-three');
async function step(script,options=[]){await new Promise((ok,no)=>{let job=spawn(process.execPath,[path.join(root,'scripts',script),...options],{cwd:root,stdio:'inherit',env:process.env});job.on('error',no);job.on('exit',code=>code!==0?no(Error(`${script} failed (${code})`)):ok())})}
for(const asset of ['assets/fonts/CJK.otf','analysis/beats.json'])if(!fs.existsSync(path.join(root,asset)))throw Error('Required asset missing: '+asset);
if(!process.env.CHROME_PATH){let choices=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];if(process.platform==='win32')choices.unshift(path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'));const chrome=choices.find(x=>fs.existsSync(x));if(!chrome)throw Error('Set CHROME_PATH to an installed Chrome / Chromium executable.');process.env.CHROME_PATH=chrome}
await step('demo-score.mjs');
execFileSync(process.env.PYTHON || (process.platform==='win32'?'python':'python3'),[path.join(root,'scripts/mix-cues.py')],{cwd:root,stdio:'inherit'});
await step('render3d.mjs',['--all',...(force?['--force']:[])]);
await step('render.mjs',['--previews']);
await step('render.mjs',['--all']);
await step('verify.mjs');
await step('verify-kinetic.mjs');
await step('verify-employment.mjs');
await step('final-contact.mjs');
await step('viewer.mjs');
console.log('Complete: output/film.mp4');
