const incTitle = document.getElementById('incTitle');
const incDesc = document.getElementById('incDesc');
const incCreateBtn = document.getElementById('incCreateBtn');
const incCreateStatus = document.getElementById('incCreateStatus');
const incidentList = document.getElementById('incidentList');
const incRefreshBtn = document.getElementById('incRefreshBtn');

const STATUSES = ['open', 'in_progress', 'review', 'resolved'];
function escI(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function incidentCard(inc){
  const opts = STATUSES.map(s=>`<option value="${s}" ${s===inc.status?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const answerBlock = inc.rag_answer
    ? `<div class="incident-answer-wrap">
         <div class="incident-answer-head"><strong>Self-RAG suggestion</strong><button type="button" class="toggle-answer-btn inc-toggle-answer-btn">Hide answer</button></div>
         <div class="incident-answer">${formatAnswer(inc.rag_answer)}</div>
       </div>`
    : `<button class="inc-resolve-btn new-session-btn">Get Self-RAG suggestion</button>`;
  return `<div class="incident-card" data-id="${inc.id}">
    <div class="incident-top">
      <strong>${escI(inc.title)}</strong>
      ${inc.jira_url ? `<a href="${escI(inc.jira_url)}" target="_blank" rel="noopener">${escI(inc.jira_key||'Jira ticket')} ↗</a>` : ''}
    </div>
    <p class="incident-desc">${escI(inc.description||'')}</p>
    ${answerBlock}
    <div class="incident-bottom">
      <select class="inc-status">${opts}</select>
      <span class="status-tag status-${inc.status}">${inc.status.replace('_',' ')}</span>
    </div>
  </div>`;
}

async function loadIncidents(){
  incidentList.innerHTML = '<div class="status">Loading…</div>';
  try{
    const r = await fetch('/api/incidents');
    const data = await r.json();
    if(!r.ok) throw new Error(data.detail || 'Failed to load incidents');
    incidentList.innerHTML = data.length ? data.map(incidentCard).join('') : '<div class="status">No incidents yet.</div>';
  }catch(e){
    incidentList.innerHTML = `<div class="status">Error: ${escI(e.message)}</div>`;
  }
}
window.loadIncidents = loadIncidents;

incidentList.addEventListener('click', async (e)=>{
  const toggleBtn = e.target.closest('.inc-toggle-answer-btn');
  if(toggleBtn){
    const wrap = toggleBtn.closest('.incident-answer-wrap');
    const body = wrap.querySelector('.incident-answer');
    const nowHidden = body.classList.toggle('collapsed');
    toggleBtn.textContent = nowHidden ? 'Show answer' : 'Hide answer';
    return;
  }
  const btn = e.target.closest('.inc-resolve-btn');
  if(!btn) return;
  const card = btn.closest('.incident-card');
  const id = card.dataset.id;
  btn.disabled = true; btn.textContent = 'Running Self-RAG…';
  try{
    const r = await fetch(`/api/incidents/${id}/resolve`, {method:'POST'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.detail || 'Self-RAG failed');
    loadIncidents();
  }catch(err){
    btn.disabled = false; btn.textContent = 'Get Self-RAG suggestion';
    alert('Self-RAG failed: ' + err.message);
  }
});

incidentList.addEventListener('change', async (e)=>{
  if(!e.target.classList.contains('inc-status')) return;
  const card = e.target.closest('.incident-card');
  const id = card.dataset.id;
  const status = e.target.value;
  e.target.disabled = true;
  try{
    const r = await fetch(`/api/incidents/${id}/status`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status})
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.detail || 'Update failed');
    loadIncidents();
  }catch(err){
    alert('Status update failed: ' + err.message);
  }finally{
    e.target.disabled = false;
  }
});

incCreateBtn.addEventListener('click', async ()=>{
  const title = incTitle.value.trim();
  const description = incDesc.value.trim();
  if(!title){ incCreateStatus.textContent = 'Title is required.'; return; }
  incCreateBtn.disabled = true;
  incCreateStatus.textContent = 'Creating Jira ticket and notifying Slack…';
  try{
    const r = await fetch('/api/incidents', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, description})
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.detail || 'Failed to create incident');
    incCreateStatus.textContent = `✓ Created ${data.jira_key || 'ticket'} and notified Slack.`;
    incTitle.value = ''; incDesc.value = '';
    loadIncidents();
  }catch(e){
    incCreateStatus.textContent = 'Error: ' + e.message;
  }finally{
    incCreateBtn.disabled = false;
  }
});

incRefreshBtn.addEventListener('click', loadIncidents);