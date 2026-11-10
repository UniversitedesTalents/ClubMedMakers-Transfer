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
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' || /^0\.\d+$/.test(String(value))) {
    const n = Number(value);
    if (n < 0 || n >= 1) throw new Error('Invalid Excel time.');
    const m = Math.round(n*1440)%1440;
    return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  }
  const str=String(value).trim();
  const match=str.match(/^(\d{1,2})(?::(\d{2})(?::\d{2})?|h(\d{2}))$/i);
  const minutes=match?.[2]??match?.[3];
  if(!match || Number(match[1])>23 || Number(minutes)>59)throw new Error('Time must use HH:MM.');
  return `${match[1].padStart(2,'0')}:${minutes}`;
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
