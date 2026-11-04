import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHandlers,normalizeName,nameMatches,personId,validateRows,payments,parseTime} from '../server/core.mjs';
const source=JSON.parse(await readFile(new URL('../data/test-transfers.json',import.meta.url),'utf8'));
const records=validateRows(source);
function setup(){
 let snapshot={records,mode:'test',updatedAt:null},saved=0;
 return {handlers:createHandlers({load:async()=>snapshot,save:async value=>{snapshot=value;saved++;},syncKey:'unit-test-private-key'}),get snapshot(){return snapshot;},get saved(){return saved;}};
}
function post(action,body,key){return new Request(`https://test.invalid/api/${action}`,{method:'POST',headers:{'Content-Type':'application/json',...(key?{'x-sync-key':key}:{})},body:JSON.stringify(body)});}
test('accent-insensitive, first/surname/both and reversed-order token searches',()=>{
 assert.equal(normalizeName('Écenaz ELMA'),'ecenaz elma');
 for(const q of ['Ecenaz','Elma','Ecenaz Elma','ELMA ECENAZ'])assert(nameMatches('ELMA ECENAZ',q));
 assert(nameMatches('DUCHÉ OLIVIER','duche'));
 assert(nameMatches('TEISSIER','Teissier'));
 assert(!nameMatches('TESSIER ALEXIA','TEISSIER'));
 assert(!nameMatches('ELMA ECENAZ','ECEN'));
});
test('source-block payment inheritance and covered exceptions are preserved',()=>{
 assert.equal(records.length,147);
 const get=row=>records.find(r=>r.RecordID===`OPIO-R${String(row).padStart(3,'0')}`);
 assert.equal(get(90).PaymentStatus,payments.driver);
 assert.equal(get(82).TransferType,'Private transfer');
 assert.equal(get(88).PaymentStatus,payments.included); // one passenger, explicitly included
 for(const r of [149,150,151,152]){assert.equal(get(r).PaymentStatus,payments.included);assert.equal(get(r).ArrivalTime,'17:32');}
 assert.equal(get(110).PaymentStatus,payments.pending);
 assert.equal(get(159).PaymentStatus,payments.pending);
});
test('search returns candidate names only; detail returns only the selected person',async()=>{
 const {handlers}=setup();
 const response=await handlers.search(post('search',{query:'Nadia'}));
 const data=await response.json();assert.equal(response.status,200);
 assert(data.matches.length>=1);
 assert(data.matches.every(x=>Object.keys(x).sort().join(',')==='id,name'));
 const selected=data.matches.find(x=>x.name==='MESLEM NADIA');assert(selected);
 const detail=await (await handlers.transfer(post('transfer',{id:selected.id,query:'Nadia'}))).json();
 assert.equal(detail.name,'MESLEM NADIA');assert.equal(detail.transfers.length,1);
 assert.equal(detail.transfers[0].arrivalTime,'17:32');
 const text=JSON.stringify(detail);
 for(const forbidden of ['MONTAGNIER','LE GOUILL','DUPRAT','TransferID','SourceRow','ReviewNote','EstimatedResortArrival'])assert(!text.includes(forbidden));
 const denied=await handlers.transfer(post('transfer',{id:personId('ELMA ECENAZ'),query:'Nadia'}));assert.equal(denied.status,404);
});
test('sync authentication, validation, atomic replacement and meeting point update',async()=>{
 const state=setup(),h=state.handlers;
 assert.equal((await h.sync(post('sync',{rows:source}))).status,401);
 assert.equal((await h.sync(post('sync',{rows:[]} ,'unit-test-private-key'))).status,400);
 assert.equal((await h.sync(post('sync',{rows:[{...source[0],PaymentStatus:'free??'}]},'unit-test-private-key'))).status,400);
 assert.equal(state.saved,0);
 const row={...source.find(r=>r.FullName==='ELMA ECENAZ'),MeetingPoint:'Please meet your driver outside the station.'};
 const result=await h.sync(post('sync',{mode:'live',rows:[row]},'unit-test-private-key'));
 assert.equal(result.status,200);assert.equal(state.saved,1);assert.equal(state.snapshot.records.length,1);
 const detail=await (await h.transfer(post('transfer',{id:personId(row.FullName),query:'Elma'}))).json();
 assert.equal(detail.mode,'live');assert.equal(detail.transfers[0].meetingPoint,row.MeetingPoint);
 assert.equal(detail.transfers[0].paymentStatus,payments.included);
});
test('Excel serial dates and time fractions are accepted; invalid values rejected',()=>{
 assert.equal(parseTime(0.5),'12:00');assert.equal(parseTime('0.647222222222222'),'15:32');
 const row=validateRows([{...source[0],Date:46334,ArrivalTime:0.5}])[0];
 assert.equal(row.ArrivalTime,'12:00');assert.match(row.Date,/^2026-11-/);
 assert.throws(()=>validateRows([{...source[0],Date:'2026-02-30'}]));
 assert.throws(()=>parseTime('25:01'));
});
test('no-match, missing query and malformed request do not expose names',async()=>{
 const {handlers}=setup();
 const data=await (await handlers.search(post('search',{query:'Zzzzzzzz'}))).json();assert.deepEqual(data.matches,[]);
 assert.equal((await handlers.search(post('search',{query:''}))).status,400);
 assert.equal((await handlers.search(new Request('https://test.invalid/api/search'))).status,405);
});
