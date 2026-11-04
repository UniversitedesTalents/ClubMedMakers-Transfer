import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHandlers,validateRows} from '../server/core.mjs';
const root=resolve('public');
let snapshot={records:validateRows(JSON.parse(await readFile('data/test-transfers.json','utf8'))),mode:'test',updatedAt:null};
const handlers=createHandlers({load:async()=>snapshot,save:async value=>{snapshot=value;},syncKey:process.env.TRANSFER_SYNC_KEY});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/')){
   const action=path.slice(5),handler=handlers[action];if(!handler){res.writeHead(404);res.end();return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const body=Buffer.concat(chunks);
   const request=new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});
   const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch(error){console.error('Preview request failed:',error.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Preview request failed.'}));}
});
const portIndex=process.argv.indexOf('--port');
const port=Number(process.env.PORT||(portIndex>=0?process.argv[portIndex+1]:3000));
server.listen(port,'0.0.0.0',()=>console.log('Transfer preview ready'));
