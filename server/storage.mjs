import {getStore} from '@netlify/blobs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHandlers,validateRows} from './core.mjs';

const store=()=>getStore('opio-transfer-2026');
async function load(){
  const snapshot=await store().get('current',{type:'json',consistency:'strong'});
  if(snapshot)return snapshot;
  if(process.env.TRANSFER_USE_TEST_DATA==='false')throw new Error('No synced dataset.');
  const seed=JSON.parse(await readFile(join(process.cwd(),'data/test-transfers.json'),'utf8'));
  return {records:validateRows(seed),mode:'test',updatedAt:null};
}
async function save(snapshot){await store().setJSON('current',snapshot);}
export const handlers=createHandlers({load,save,syncKey:()=>process.env.TRANSFER_SYNC_KEY});
