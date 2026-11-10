 try{
  const data=await api('/api/transfer',{id:match.id,query:currentQuery});
  loading.remove();setMode(data.mode);choices?.remove();
  const result=showResult(data);form.hidden=true;again.hidden=false;
  if(matchMedia('(max-width: 799px)').matches)result.scrollIntoView({behavior:'smooth',block:'start'});else scrollLatest();
 }catch(error){loading.remove();row('assistant',error.message||'Transfer information is temporarily unavailable.',true);buttons.forEach(button=>button.disabled=false);scrollLatest();}finally{setBusy(false);}
}
function showChoices(matches){
 row('assistant','Please select your name to see your transfer.');
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
  else if(data.matches?.length===1)await choosePerson(data.matches[0]);
  else if(data.matches?.length>1)showChoices(data.matches);
  else row('assistant','I couldn’t find that name. Please check the spelling used for your registration, or try your surname.',true);
 }catch(error){loading.remove();row('assistant',error.name==='AbortError'?'The search took too long. Please try again.':error.message,true);}
 finally{setBusy(false);scrollLatest();}
});
again.addEventListener('click',()=>{
 conversation.replaceChildren();row('assistant','Hi! Let’s find your transfer. What’s your first or last name?');
 input.value='';currentQuery='';form.hidden=false;again.hidden=true;input.focus();
});
fetch('/api/status',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{if(data)setMode(data.mode);}).catch(()=>{});


