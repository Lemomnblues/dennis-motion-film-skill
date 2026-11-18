import {chromium} from 'playwright-core';
import {build} from 'esbuild';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const options=process.argv.slice(2);const preview=options.includes('--preview');
const named=options.find(s=>!s.startsWith('--'));
const available=['layers'];
const chosen=named?named.split(','):available;
for(const id of chosen)if(!available.includes(id))throw new Error('Unknown scene '+id);
await mkdir(resolve(root,'render3d'),{recursive:true});
await build({entryPoints:[resolve(root,'src/worlds.js')],outfile:resolve(root,'render3d/worlds.bundle.js'),bundle:true,format:'iife'});
const html='<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#03050c}canvas{display:block}</style><body><script src="worlds.bundle.js"></script></body>';
await writeFile(resolve(root,'render3d/view.html'),html);
const executablePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath,headless:true,args:['--allow-file-access-from-files','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});page.on('pageerror',error=>console.error(error));
await page.goto(pathToFileURL(resolve(root,'render3d/view.html')).href,{waitUntil:'load'});
await page.waitForFunction(()=>window.worldsReady,undefined,{timeout:180000});
const metadata=await page.evaluate(()=>window.worldMetadata);await writeFile(resolve(root,'render3d/manifest.json'),JSON.stringify(metadata,null,2));
for(const id of chosen){
 const output=preview?resolve(root,'assets'):resolve(root,'render3d',id);await mkdir(output,{recursive:true});const count=preview?1:120;
 for(let frame=0;frame<count;frame++){
  const file=resolve(output,preview?id+'-preview.png':String(frame).padStart(4,'0')+'.png');
  if(!preview&&!options.includes('--force')){try{await access(file);continue;}catch{}}
  const time=preview?2:frame/30;
  const image=await page.evaluate(({id,time})=>window.drawWorld(id,time),{id,time});
  await writeFile(file,Buffer.from(image.substring(image.indexOf(',')+1),'base64'));
  if(frame%30===0||frame===count-1)console.log(`${id}: ${frame+1}/${count}`);
 }
}
await browser.close();
