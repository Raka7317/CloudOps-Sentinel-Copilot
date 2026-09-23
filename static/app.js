const THREAD_KEY = 'cloudops_sentinel_thread_id';
function newThreadId(){ return 'incident-' + crypto.randomUUID(); }
let threadId = localStorage.getItem(THREAD_KEY) || newThreadId();
localStorage.setItem(THREAD_KEY, threadId);

const q = document.getElementById('question');
const send = document.getElementById('sendBtn');
const messages = document.getElementById('messages');
const upload = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const fileLabel = document.getElementById('fileLabel');
const starters = document.getElementById('starterPrompts');
const sessionId = document.getElementById('sessionId');
const newSessionBtn = document.getElementById('newSessionBtn');
function renderSession(){ if(sessionId) sessionId.textContent='MEMORY / '+threadId.slice(-8).toUpperCase(); }
renderSession();

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

// Turn a plain/markdown-ish answer string into HTML: real numbered/bulleted
// lists (one item per line) instead of one flat paragraph.
function formatAnswer(raw=''){
  let text = String(raw).replace(/\r\n/g,'\n');
  // If the model ran list markers together on one line without newlines,
  // force a break before each marker so every point lands on its own line.
  text = text.replace(/([^\n])\s(?=\d{1,2}[.)]\s+\S)/g, '$1\n');
  text = text.replace(/([^\n])\s(?=[-*•]\s+\S)/g, '$1\n');

  const esced = esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = esced.split('\n');
  let html = '', listType = null, buf = [];
  const flush = () => {
    if(buf.length){ html += `<${listType}>${buf.map(li=>`<li>${li}</li>`).join('')}</${listType}>`; }
    buf = []; listType = null;
  };
  for(const rawLine of lines){
    const line = rawLine.trim();
    if(!line){ flush(); continue; }
    const num = line.match(/^(\d{1,2})[.)]\s+(.*)/);
    const bul = line.match(/^[-*•]\s+(.*)/);
    if(num){ if(listType!=='ol') flush(); listType='ol'; buf.push(num[2]); }
    else if(bul){ if(listType!=='ul') flush(); listType='ul'; buf.push(bul[1]); }
    else { flush(); html += `<p>${line}</p>`; }
  }
  flush();
  return html || `<p>${esced}</p>`;
}

function addMessage(role, html, meta='', collapsible=false){
  const el=document.createElement('div'); el.className=`message ${role}`;
  const avatar=role==='assistant'?'<div class="avatar">S</div>':'';
  const label=role==='assistant'?'CLOUDOPS SENTINEL':'ON-CALL ENGINEER';
  const toggle=collapsible?'<button type="button" class="toggle-answer-btn">Hide answer</button>':'';
  el.innerHTML=`${avatar}<div class="message-body"><div class="message-label"><span>${label}</span>${toggle}</div><div class="bubble answer-bubble">${html}</div>${meta}</div>`;
  messages.appendChild(el); messages.scrollTop=messages.scrollHeight;
  if(collapsible){
    const btn=el.querySelector('.toggle-answer-btn');
    const bubble=el.querySelector('.answer-bubble');
    btn.addEventListener('click',()=>{
      const nowHidden=bubble.classList.toggle('collapsed');
      btn.textContent=nowHidden?'Show answer':'Hide answer';
    });
  }
  return el;
}
function loadingMarkup(){return '<span class="thinking">Running Self-RAG <i></i><i></i><i></i></span>';}
function pretty(v=''){return String(v).replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());}

async function ask(){
  const question=q.value.trim(); if(!question) return;
  starters.style.display='none';
  addMessage('user',esc(question)); q.value=''; send.disabled=true;
  const loading=addMessage('assistant',loadingMarkup());
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question, thread_id: threadId})});
    const data=await r.json(); if(!r.ok) throw new Error(data.detail||'Request failed');
    loading.remove();
    let meta=`<div class="meta-card"><div class="verification"><span class="tag">ROUTE · ${esc(data.route)}</span>`;
    if(data.support_status) meta+=`<span class="tag ok">IsSUP · ${esc(pretty(data.support_status))}</span>`;
    if(data.usefulness) meta+=`<span class="tag ok">IsUSE · ${esc(pretty(data.usefulness))}</span>`;
    if(data.used_web_search) meta+=`<span class="tag web">INTERNET SEARCH USED</span>`;
    meta+=`<span class="tag memory">SQLITE MEMORY · ${data.memory_turns||0} TURN${(data.memory_turns||0)===1?'':'S'}</span>`;
    meta+='</div>';
    if(data.sources?.length){
      meta+='<div class="sources">'+data.sources.map(s=>`<div class="source"><span class="source-icon">${s.type==='web'?'⌁':'▱'}</span><span>${esc(s.title||s.source||'Evidence')}${s.page?' · p.'+s.page:''}${s.url?` · <a target="_blank" rel="noopener" href="${esc(s.url)}">open source ↗</a>`:''}</span></div>`).join('')+'</div>';
    }
    if(data.trace?.length) meta+=`<div class="trace"><details><summary>Inspect Self-RAG workflow trace</summary><ol>${data.trace.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details></div>`;
    meta+='</div>';
    addMessage('assistant',formatAnswer(data.answer),meta,true);
  }catch(e){loading.remove();addMessage('assistant','Request failed: '+esc(e.message));}
  finally{send.disabled=false;q.focus();}
}

document.querySelectorAll('.nav-item[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.style.display='none');
    document.getElementById(btn.dataset.view).style.display='flex';
    if(btn.dataset.view==='incidentsView') window.loadIncidents?.();
    if(btn.dataset.view==='dashboardView') window.loadDashboard?.();
  });
});

send.addEventListener('click',ask);
q.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}});
starters.addEventListener('click',e=>{const b=e.target.closest('button[data-q]');if(!b)return;q.value=b.dataset.q;q.focus();});
fileInput.addEventListener('change',()=>{fileLabel.textContent=fileInput.files[0]?.name||'Choose runbook';uploadStatus.textContent='';});

upload.addEventListener('click',async()=>{
  const file=fileInput.files[0]; if(!file){uploadStatus.textContent='Choose a runbook first.';return;}
  upload.disabled=true; uploadStatus.textContent='Indexing private operational knowledge…';
  try{
    const fd=new FormData();fd.append('file',file);
    const r=await fetch('/api/upload',{method:'POST',body:fd});const d=await r.json();
    if(!r.ok)throw new Error(d.detail||'Upload failed');
    uploadStatus.textContent=`✓ ${d.chunks_indexed} chunks indexed in ${d.namespace}`;
  }catch(e){uploadStatus.textContent='Error: '+e.message;}
  finally{upload.disabled=false;}
});


newSessionBtn?.addEventListener('click',()=>{
  threadId = newThreadId();
  localStorage.setItem(THREAD_KEY, threadId);
  renderSession();
  messages.innerHTML = `<div class="message assistant"><div class="avatar">S</div><div class="message-body"><div class="message-label">CLOUDOPS SENTINEL</div><div class="bubble intro">New incident memory session started. Describe the production issue and I’ll build context across your follow-up questions.</div></div></div>`;
  starters.style.display='flex';
  q.value=''; q.focus();
});