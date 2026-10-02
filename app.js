const $ = id=>document.getElementById(id);
let history = [], busy = false, roster = [];
let readyText = '500 agents, ready when you are';
function addMessage(role,content){
  const block=document.createElement('div');block.className=`message ${role}`;
  const label=document.createElement('span');label.className='message-label';label.textContent=role==='user'?'You':role==='error'?'Something went wrong':'Cluster';
  block.append(label,document.createTextNode(content));$('messages').append(block);block.scrollIntoView({behavior:'smooth',block:'end'});
}
function resetNodes(){$('active-agents').replaceChildren();document.querySelectorAll('.agent').forEach(n=>n.classList.remove('active','done','failed'));}
function handleEvent(event){
  if(event.type==='phase'){
    document.querySelectorAll('.agent').forEach(n=>n.classList.remove('active'));
    event.agents.forEach(id=>$(`agent-${id}`)?.classList.add('active'));
    $('active-agents').replaceChildren(...event.agents.map(id=>{const chip=document.createElement('span');chip.className='agent-chip';chip.textContent=roster.find(a=>a.id===id)?.name || id;return chip;}));
    $('status').textContent={routing:'Finding the right perspectives…',specialists:'Specialists are thinking…',synthesis:'Bringing it all together…'}[event.phase];
  }else if(event.type==='agent_done'){
    const node=$(`agent-${event.id}`);node?.classList.remove('active');node?.classList.add(event.failed?'failed':'done');
  }else if(event.type==='reply'){
    addMessage('assistant',event.content);history.push({role:'assistant',content:event.content});
    return true;
  }else if(event.type==='error')throw new Error(event.message);
  return false;
}
async function send(){
  const content=$('input').value.trim();if(busy||!content)return;
  busy=true;$('send').disabled=true;$('new-chat').disabled=true;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=true);
  $('welcome').hidden=true;$('input').value='';$('input').style.height='auto';resetNodes();addMessage('user',content);
  const messages=[...history.slice(-18),{role:'user',content}];let gotReply=false;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages})});
    if(!response.ok){let data;try{data=await response.json();}catch{}throw new Error(data?.error||`Request failed (${response.status}). Please try again shortly.`);}
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let i;
      while((i=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(line.trim()){const event=JSON.parse(line);if(event.type==='reply')history=messages;gotReply=handleEvent(event)||gotReply;}}
      if(done)break;
    }
    if(!gotReply)throw new Error('The connection ended before a reply arrived. Please try again.');
  }catch(error){addMessage('error',error.message);}
  finally{busy=false;$('send').disabled=false;$('new-chat').disabled=false;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=false);document.querySelectorAll('.agent').forEach(n=>n.classList.remove('active'));$('status').textContent=readyText;$('input').focus();}
}
$('composer').addEventListener('submit',e=>{e.preventDefault();send();});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}});
$('input').addEventListener('input',()=>{$('input').style.height='auto';$('input').style.height=`${Math.min($('input').scrollHeight,180)}px`;});
$('new-chat').addEventListener('click',()=>{history=[];$('messages').replaceChildren();$('welcome').hidden=false;resetNodes();$('input').focus();});
 document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{$('input').value=b.dataset.prompt;send();}));
fetch('/api/config').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(config=>{
  $('mode').textContent=config.demo?'Demo mode':'Live cluster';$('disclaimer').textContent=config.demo?'Demo replies are illustrative.':'AI can make mistakes.';
  roster=config.agents;readyText=`${config.agentCount} agents · up to ${config.maxSpecialists} specialists per message`;$('status').textContent=readyText;
  config.agents.forEach((agent,i)=>{const node=document.createElement('div');node.className='agent';node.id=`agent-${agent.id}`;node.textContent=agent.name;node.dataset.search=`${agent.name} ${agent.blurb} ${agent.category}`.toLowerCase();node.title=`${agent.name}: ${agent.blurb}`;node.setAttribute('aria-label',agent.name);$('agents').append(node);});
  filterAgents();
}).catch(()=>{$('mode').textContent='Offline';$('status').textContent='Unable to connect. Reload to try again.';});

function filterAgents(){
 const query=$('agent-search').value.trim().toLowerCase();let count=0;
 document.querySelectorAll('.agent').forEach(node=>{node.hidden=!node.dataset.search.includes(query);if(!node.hidden)count++;});
 $('roster-count').textContent=`${count} of ${roster.length} agents`;
}
$('agent-search').addEventListener('input',filterAgents);
