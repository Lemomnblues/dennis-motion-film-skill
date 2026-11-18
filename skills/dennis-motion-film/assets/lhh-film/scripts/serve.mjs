import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.LHH_VIEWER_PORT||8767);
const mime={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.zip':'application/zip'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return}
  let start=0,end=stat.size-1,code=200;
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}else{start=Math.max(0,stat.size-Number(m[2]))}if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}code=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`)}
  res.writeHead(code,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});
  if(req.method==='HEAD'){res.end();return}
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 });
});
server.listen(port,'127.0.0.1',()=>console.log(`LHH HTML viewer: http://127.0.0.1:${server.address().port}/`));
