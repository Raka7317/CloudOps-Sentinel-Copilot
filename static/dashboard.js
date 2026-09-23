const dashStats = document.getElementById('dashStats');
const dashBreakdown = document.getElementById('dashBreakdown');
const dashTable = document.getElementById('dashTable');
const dashRefreshBtn = document.getElementById('dashRefreshBtn');

const DASH_STATUSES = [
  { key: 'open', label: 'Open', color: 'var(--warn)' },
  { key: 'in_progress', label: 'In progress', color: 'var(--cyan)' },
  { key: 'review', label: 'Review', color: '#c9a8ff' },
  { key: 'resolved', label: 'Resolved', color: 'var(--lime)' },
];

function escD(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function fmtWhen(ts){
  if(!ts) return '–';
  const d = new Date(ts);
  if(isNaN(d)) return '–';
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' · ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

async function loadDashboard(){
  dashTable.innerHTML = '<div class="status">Loading…</div>';
  try{
    const r = await fetch('/api/incidents');
    const data = await r.json();
    if(!r.ok) throw new Error(data.detail || 'Failed to load incidents');
    renderDashboard(data || []);
  }catch(e){
    dashTable.innerHTML = `<div class="status">Error: ${escD(e.message)}</div>`;
    dashBreakdown.innerHTML = '';
  }
}
window.loadDashboard = loadDashboard;

function renderDashboard(incidents){
  const counts = { open:0, in_progress:0, review:0, resolved:0 };
  incidents.forEach(inc=>{ if(counts[inc.status] !== undefined) counts[inc.status]++; });
  const total = incidents.length;

  document.getElementById('dashTotal').textContent = total;
  document.getElementById('dashOpen').textContent = counts.open;
  document.getElementById('dashProgress').textContent = counts.in_progress;
  document.getElementById('dashReview').textContent = counts.review;
  document.getElementById('dashResolved').textContent = counts.resolved;

  dashBreakdown.innerHTML = total
    ? `<div class="dash-bar">${DASH_STATUSES.map(s=>{
        const pct = total ? (counts[s.key]/total*100) : 0;
        return pct > 0 ? `<span style="width:${pct}%;background:${s.color}" title="${s.label}: ${counts[s.key]}"></span>` : '';
      }).join('')}</div>
      <div class="dash-legend">${DASH_STATUSES.map(s=>`<div class="dash-legend-item"><i style="background:${s.color}"></i>${s.label} · ${counts[s.key]}</div>`).join('')}</div>`
    : '';

  if(!total){
    dashTable.innerHTML = '<div class="status">No incidents yet.</div>';
    return;
  }

  const sorted = [...incidents].sort((a,b)=>{
    const order = { open:0, in_progress:1, review:2, resolved:3 };
    const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    return diff !== 0 ? diff : (b.id - a.id);
  });

  dashTable.innerHTML = `<div class="dash-row dash-row-head">
      <span>Title</span><span>Status</span><span>Ticket</span><span>Updated</span>
    </div>` + sorted.map(inc => `
    <div class="dash-row">
      <span class="dash-title" title="${escD(inc.description||'')}">${escD(inc.title)}</span>
      <span><span class="status-tag status-${inc.status}">${inc.status.replace('_',' ')}</span></span>
      <span>${inc.jira_url ? `<a href="${escD(inc.jira_url)}" target="_blank" rel="noopener">${escD(inc.jira_key||'View')} ↗</a>` : '–'}</span>
      <span>${fmtWhen(inc.updated_at || inc.created_at)}</span>
    </div>`).join('');
}

dashRefreshBtn?.addEventListener('click', loadDashboard);