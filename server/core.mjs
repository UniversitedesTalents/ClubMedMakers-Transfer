import { createHash, timingSafeEqual } from 'node:crypto';

export const payments = {
  included: 'Covered - no payment required',
  driver: 'Pay driver - expense claim',
  pending: 'To be confirmed'
};
export function normalizeName(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function nameMatches(name, query) {
  const q = normalizeName(query).split(' ').filter(Boolean);
  const words = normalizeName(name).split(' ');
  return q.length > 0 && q.every(word => words.includes(word));
}
export function personId(name) {
  return createHash('sha256').update(normalizeName(name)).digest('hex').slice(0, 24);
}
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function hasValidKey(actual, expected) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
export function parseDate(value) {
  if (typeof value === 'number' || /^\d{5}(\.\d+)?$/.test(String(value))) {
    const date = new Date(Date.UTC(1899,11,30) + Math.floor(Number(value))*86400000);
    return date.toISOString().slice(0,10);
  }
  const str = String(value ?? '').trim();
  if (!str) return '';
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(str)) throw new Error('Date must use YYYY-MM-DD.');
  const iso = str.slice(0,10), date = new Date(iso+'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==iso) throw new Error('Invalid date.');
  return iso;
}
export function parseTime(value) {
  const str = String(value ?? '').trim();
  if (!str) return '';

  if (typeof value === 'number' || /^0(?:\.\d+)?$/.test(str)) {
    const n = Number(str);
    if (n < 0 || n >= 1) throw new Error('Invalid Excel time.');
    const m = Math.round(n * 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  const match = str.match(/^(\d{1,2})(?:[:h.])(\d{2})(?::\d{2})?$/i);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error(`Time must use HH:MM. Received ${JSON.stringify(str.slice(0, 32))}.`);
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}
export function paymentNote(row) {
  if(row.PaymentStatus===payments.driver) return 'Your transfer is booked. Please pay the driver directly and keep your receipt to submit an expense claim. Have a pleasant journey!';
  if(row.PaymentStatus===payments.included && row.TransferType==='Private transfer') return 'Your private transfer is booked and covered by Club Med. No payment is required. Have a pleasant journey!';
  if(row.PaymentStatus===payments.included) return 'Your transfer is included. No payment is required. Have a pleasant journey!';
  return 'Your transfer details are being confirmed. Please check back for an update. We look forward to welcoming you!';
}
export function validateRows(input) {
  if(!Array.isArray(input) || input.length===0 || input.length>5000) throw new Error('Send 1 to 5,000 rows. Empty syncs are rejected to protect existing data.');
  const ids=new Set();
  return input.map((row,i)=>{
    if(!row || typeof row!=='object')throw new Error(`Row ${i+1}: invalid record.`);
    const text=(key,max=500)=>String(row[key]??'').trim().slice(0,max);
    const RecordID=text('RecordID',100),FullName=text('FullName',160);
    if(!RecordID || !FullName)throw new Error(`Row ${i+1}: RecordID and FullName are required.`);
    if(ids.has(RecordID))throw new Error(`Row ${i+1}: duplicate RecordID.`);ids.add(RecordID);
    const PaymentStatus=text('PaymentStatus',80);
    if(!Object.values(payments).includes(PaymentStatus))throw new Error(`Row ${i+1}: unknown PaymentStatus.`);
    const TransferType=text('TransferType',80);
    if(!['Included transfer','Private transfer','Booked transfer','Arranged transfer','To be confirmed'].includes(TransferType))throw new Error(`Row ${i+1}: unknown TransferType.`);
    const Status=text('Status',40)||'Test';
    if(!['Test','Needs review','Confirmed'].includes(Status))throw new Error(`Row ${i+1}: unknown Status.`);
    const Date=parseDate(row.Date), ArrivalTime=parseTime(row.ArrivalTime);
    if(!Date)throw new Error(`Row ${i+1}: Date is required.`);
    const Direction=text('Direction',40)||'Arrival';
    if(!['Arrival','Departure'].includes(Direction))throw new Error(`Row ${i+1}: unknown Direction.`);
    const record={RecordID,FullName,Date,ArrivalTime,ArrivalLocation:text('ArrivalLocation',200),FlightTrain:text('FlightTrain',100),MeetingPoint:text('MeetingPoint',1800),TransferType,PaymentStatus,Status};
    record.Direction=Direction;
    if(Direction==='Departure'){
      record.PickupTime=parseTime(row.PickupTime);
      record.DepartureTime=parseTime(row.DepartureTime);
      record.DropoffLocation=text('DropoffLocation',200);
    }
    record.ImportantNote=paymentNote(record);
    return record;
  });
}
export async function readBody(request) {
  const text=await request.text();
  if(Buffer.byteLength(text)>4_000_000)throw new Error('Request too large.');
  try{return JSON.parse(text);}catch{throw new Error('Request body must be valid JSON.');}
}
export function publicTransfer(record) {
  const entry={date:record.Date,arrivalTime:record.ArrivalTime,arrivalLocation:record.ArrivalLocation,flightTrain:record.FlightTrain,meetingPoint:record.MeetingPoint,transferType:record.TransferType,paymentStatus:record.PaymentStatus,importantNote:paymentNote(record),needsReview:record.Status==='Needs review'};
  if(record.Direction==='Departure')return {...entry,direction:'Departure',pickupTime:record.PickupTime,departureTime:record.DepartureTime,dropoffLocation:record.DropoffLocation};
  return {...entry,direction:'Arrival'};
}
function transferOrder(record) {
  return record.Direction==='Departure'?`1${record.Date}${record.PickupTime}`:`0${record.Date}${record.ArrivalTime}`;
}
export function createHandlers({load,save,syncKey}) {
  return {
    async status(request) {
      if(request.method!=='GET')return json({error:'Method not allowed.'},405);
      try{const data=await load();return json({mode:data.mode,updatedAt:data.updatedAt});}
      catch{return json({error:'Transfer information is temporarily unavailable.'},503);}
    },
    async search(request) {
      if(request.method!=='POST')return json({error:'Method not allowed.'},405);
      try{
        const body=await readBody(request),query=String(body.query??'').trim();
        if(normalizeName(query).length<2 || query.length>160)return json({error:'Please enter at least two letters of your first name or surname.'},400);
        const data=await load(), names=[...new Set(data.records.filter(row=>nameMatches(row.FullName,query)).map(row=>row.FullName))];
        if(names.length>15)return json({matches:[],refine:true,mode:data.mode});
        return json({matches:names.map(name=>({id:personId(name),name})),mode:data.mode});
      }catch(error){if(error.message.includes('JSON')||error.message.includes('large'))return json({error:error.message},400);return json({error:'The search is temporarily unavailable. Please try again.'},503);}
    },
    async transfer(request) {
      if(request.method!=='POST')return json({error:'Method not allowed.'},405);
      try{
        const {id,query}=await readBody(request);
        if(typeof query!=='string'||normalizeName(query).length<2||query.length>160||typeof id!=='string')return json({error:'Please search for your name again.'},400);
        const data=await load(), matches=data.records.filter(row=>personId(row.FullName)===id && nameMatches(row.FullName,query));
        if(!matches.length)return json({error:'No transfer found. Please search again.'},404);
        return json({name:matches[0].FullName,mode:data.mode,transfers:matches.sort((a,b)=>transferOrder(a).localeCompare(transferOrder(b))).map(publicTransfer)});
      }catch{return json({error:'Transfer information is temporarily unavailable. Please try again.'},503);}
    },
    async sync(request) {
      if(request.method!=='POST')return json({error:'Method not allowed.'},405);
      const expected=typeof syncKey==='function'?syncKey():syncKey;
      if(!expected)return json({error:'Sync key has not been configured on the server.'},503);
      if(!hasValidKey(request.headers.get('x-sync-key'),expected))return json({error:'Unauthorised.'},401);
      let records,mode;
      try{
        const body=await readBody(request);
        records=validateRows(Array.isArray(body)?body:body.rows??body.value);
        mode=Array.isArray(body)?'test':body.mode??'test';
        if(!['test','live'].includes(mode))throw new Error('Mode must be test or live.');
      }catch(error){return json({error:error.message},400);}
      try{
        const updatedAt=new Date().toISOString();
        await save({records,mode,updatedAt});
        return json({ok:true,count:records.length,mode,updatedAt});
      }catch{return json({error:'Sync could not be saved. Previous data has been retained.'},503);}
    }
  };
}
