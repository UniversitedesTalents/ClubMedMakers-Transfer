const form=document.querySelector('#search-form');
const input=document.querySelector('#participant-name');
const conversation=document.querySelector('#conversation');
const again=document.querySelector('#search-again');
const testBadge=document.querySelector('#test-badge');
let currentQuery='';

function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function row(role,text,error=false){
 const wrap=element('div',`row ${role==='user'?'user-row':'assistant-row'}`);
 if(role==='assistant'){const mark=element('span','mini-mark','CM');mark.setAttribute('aria-hidden','true');wrap.append(mark);}
 wrap.append(element('div',`bubble ${role==='user'?'user-bubble':'assistant-bubble'}${error?' error-bubble':''}`,text));conversation.append(wrap);return wrap;
}
function typing(){const wrap=element('div','row assistant-row');wrap.id='typing-row';wrap.innerHTML='<span class="mini-mark" aria-hidden="true">CM</span><div class="typing" aria-label="Searching"><i></i><i></i><i></i></div>';conversation.append(wrap);return wrap;}
function setBusy(busy){input.disabled=busy;form.querySelector('button').disabled=busy;conversation.setAttribute('aria-busy',String(busy));}
function setMode(mode){testBadge.hidden=mode==='live';}
function scrollLatest(){conversation.scrollTo({top:conversation.scrollHeight,behavior:'smooth'});}
async function api(path,body){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});const text=await response.text();if(!text){console.error('Empty API response',path,response.status);throw new Error('Transfer information is temporarily unavailable. Please try again.');}let data;try{data=JSON.parse(text);}catch{throw new Error('Transfer information is temporarily unavailable. Please try again.');}if(!response.ok)throw new Error(data.error||'Please try again.');return data;}finally{clearTimeout(timer);}
}
function readableName(name){return name.toLocaleLowerCase('en-GB').replace(/(^|[\s'-])\p{L}/gu,letter=>letter.toLocaleUpperCase('en-GB'));}
function dateLabel(date){
 const d=new Date(`${date}T12:00:00Z`);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}).format(d):'Date to be confirmed';
}
function detail(label,value){const block=element('div');block.append(element('small',null,label),element('strong',null,value));return block;}
function transferCard(entry){
 const section=element('section','transfer-entry');
 section.append(element('p','schedule-meta',dateLabel(entry.date)));
 const time=element('div','arrival-time',entry.arrivalTime||'To be confirmed');
 time.append(element('small',null,'Flight / train arrival · Local time'));
 section.append(time);
 const details=element('div','transfer-details');
 details.append(detail('Arrival location',entry.arrivalLocation||'To be confirmed'));
 if(entry.flightTrain)details.append(detail('Flight / train',entry.flightTrain));
 details.append(detail('Meeting point',entry.meetingPoint||'Meeting point details will be shared shortly.'));
 section.append(details);
 const paid=entry.paymentStatus==='Pay driver - expense claim';
 const covered=entry.paymentStatus==='Covered - no payment required';
 const note=element('aside',`important-note ${paid?'payment-required':covered?'payment-covered':'payment-pending'}`);
 note.append(element('p','note-eyebrow','Important note'));
 const heading=paid?'Pay driver · Expense claim':covered?(entry.transferType==='Private transfer'?'Private transfer · No payment required':'No payment required'):'Details to be confirmed';
 note.append(element('h3',null,heading),element('p','note-copy',entry.importantNote));
 section.append(note);
 return section;
}
function showResult(data){
 const result=element('div','result');
 const found=element('p','found');found.innerHTML='<span>✓</span> Your transfer details';
 const card=element('article','result-card');
 card.append(element('p','result-intro','Your journey to Opio'),element('h2','participant',readableName(data.name)));
 if(data.transfers.length>1)card.append(element('p','multi-arrival','More than one arrival is listed. Please confirm your travel date with the organising team.'));
 for(const entry of data.transfers)card.append(transferCard(entry));
 result.append(found,card);conversation.append(result);return result;
}
async function choosePerson(match,choices){
 setBusy(true);
 const buttons=choices.querySelectorAll('button');buttons.forEach(button=>button.disabled=true);
 const loading=typing();
 try{
  const data=await api('/api/transfer',{id:match.id,query:currentQuery});
  loading.remove();setMode(data.mode);choices.remove();row('user',readableName(match.name));
  const result=showResult(data);form.hidden=true;again.hidden=false;
  if(matchMedia('(max-width: 799px)').matches)result.scrollIntoView({behavior:'smooth',block:'start'});else scrollLatest();
 }catch(error){loading.remove();row('assistant',error.message||'Transfer information is temporarily unavailable.',true);buttons.forEach(button=>button.disabled=false);scrollLatest();}finally{setBusy(false);}
}
function showChoices(matches){
 row('assistant',matches.length===1?'I found your name. Tap below to see your transfer.':'Please select your name to see your transfer.');
 const choices=element('div','name-choices');choices.setAttribute('aria-label','Select your name');
 for(const match of matches){
  const button=element('button','name-choice');button.type='button';button.append(element('span',null,readableName(match.name)),element('span','choice-arrow','→'));
  button.addEventListener('click',()=>choosePerson(match,choices));choices.append(button);
 }
 conversation.append(choices);choices.querySelector('button')?.focus({preventScroll:true});
}
form.addEventListener('submit',async event=>{
 event.preventDefault();const query=input.value.trim();if(!query)return;
 currentQuery=query;conversation.querySelectorAll('.name-choices,.result').forEach(node=>node.remove());
 row('user',query);const loading=typing();setBusy(true);
 try{
  const data=await api('/api/search',{query});loading.remove();setMode(data.mode);
  if(data.refine)row('assistant','Please enter both your first and last name to narrow the search.');
  else if(data.matches?.length)showChoices(data.matches);
  else row('assistant','I couldn’t find that name. Please check the spelling used for your registration, or try your surname.',true);
 }catch(error){loading.remove();row('assistant',error.name==='AbortError'?'The search took too long. Please try again.':error.message,true);}
 finally{setBusy(false);scrollLatest();}
});
again.addEventListener('click',()=>{
 conversation.replaceChildren();row('assistant','Hi! Let’s find your transfer. What’s your first or last name?');
 input.value='';currentQuery='';form.hidden=false;again.hidden=true;input.focus();
});
fetch('/api/status',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{if(data)setMode(data.mode);}).catch(()=>{});
