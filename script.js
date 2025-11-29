/* anime-futuristic script.js
   - rendering table
   - search + filter
   - add/edit modal
   - small GSAP entrance + mouse parallax + particles
*/

(() => {
  // utils
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const formatINR = n => n ? n.toLocaleString('en-IN') : '-';

  // elements
  const tenderBody = $('#tenderBody');
  const searchInput = $('#searchInput');
  const statusFilter = $('#statusFilter');
  const newTenderBtn = $('#newTenderBtn');
  const modal = $('#modal');
  const tenderForm = $('#tenderForm');
  const cancelBtn = $('#cancelBtn');
  const modalTitle = $('#modalTitle');
  const totalTenders = $('#totalTenders');
  const submittedCount = $('#submittedCount');
  const pendingCount = $('#pendingCount');
  const awardCount = $('#awardCount');
  const buildTime = $('#buildTime');

  // state
  let data = [];
  const STORAGE_KEY = 'anime_tenders_v1';
  let editingId = null;

  // load from localStorage or default
  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      try { data = JSON.parse(raw); return; } catch(e){ console.warn(e) }
    }
    data = (typeof tenders !== 'undefined') ? JSON.parse(JSON.stringify(tenders)) : [];
    saveData();
  }
  function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); refreshStats(); }

  // render helpers
  function chipForStatus(s){
    if(s==='Submitted') return `<span class="chip sub">Submitted</span>`;
    if(s==='Pending') return `<span class="chip pen">Pending</span>`;
    if(s==='Missing Docs') return `<span class="chip mis">Missing Docs</span>`;
    if(s==='Awarded') return `<span class="chip awd">Awarded</span>`;
    return `<span class="chip draft">Draft</span>`;
  }

  function renderRow(t){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.name}</strong><span class="small">${t.id}</span></td>
      <td>${chipForStatus(t.status)}</td>
      <td>₹ ${formatINR(t.value)}</td>
      <td>${t.deadline || '-'}</td>
      <td>${t.org || '-'}</td>
      <td class="actions">
        <button class="action-btn" data-edit="${t.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="action-btn" data-clone="${t.id}" title="Clone"><i class="fa-solid fa-copy"></i></button>
        <button class="action-btn" data-del="${t.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    return tr;
  }

  function updateTable(){
    const q = (searchInput.value || '').toLowerCase().trim();
    const status = statusFilter.value;
    tenderBody.innerHTML = '';
    const list = data.filter(t => {
      const text = `${t.name} ${t.id} ${t.org} ${t.note}`.toLowerCase();
      const matchesQ = !q || text.includes(q);
      const matchesStatus = status==='All' || t.status===status;
      return matchesQ && matchesStatus;
    });

    list.forEach((t,i) => {
      const row = renderRow(t);
      tenderBody.appendChild(row);
      // GSAP staggered entrance
      gsap.from(row, {y:20, opacity:0, duration:0.7, delay: i*0.05, ease:'power2.out'});
    });

    attachRowEvents();
    refreshStats();
  }

  function attachRowEvents(){
    $$('[data-del]').forEach(btn => btn.onclick = e => {
      const id = e.currentTarget.dataset.del;
      if(!confirm('Delete '+id+'?')) return;
      data = data.filter(x=>x.id!==id); saveData(); updateTable();
    }));

    $$('[data-edit]').forEach(btn => btn.onclick = e => {
      const id = e.currentTarget.dataset.edit;
      openModal('Edit Tender', data.find(x=>x.id===id));
    });

    $$('[data-clone]').forEach(btn => btn.onclick = e => {
      const id = e.currentTarget.dataset.clone;
      const item = data.find(x=>x.id===id);
      const clone = JSON.parse(JSON.stringify(item));
      clone.id = generateId(); clone.name += ' (clone)';
      data.unshift(clone); saveData(); updateTable();
    });
  }

  // modal
  function openModal(title, item=null){
    modalTitle.textContent = title;
    modal.classList.remove('hidden'); document.body.style.overflow='hidden';
    tenderForm.id.value = item?.id || generateId();
    tenderForm.name.value = item?.name || '';
    tenderForm.org.value = item?.org || '';
    tenderForm.status.value = item?.status || 'Submitted';
    tenderForm.value.value = item?.value || '';
    tenderForm.deadline.value = item?.deadline || '';
    tenderForm.note.value = item?.note || '';
    editingId = item?.id || null;
    tenderForm.querySelector('[name="id"]').readOnly = !!item;
  }
  function closeModal(){ modal.classList.add('hidden'); document.body.style.overflow=''; tenderForm.reset(); editingId=null; }

  tenderForm.addEventListener('submit', e => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(tenderForm).entries());
    form.value = Number(form.value) || 0;
    if(editingId){
      const obj = data.find(x=>x.id===editingId);
      Object.assign(obj, form);
    } else { data.unshift(form); }
    saveData(); closeModal(); updateTable();
  });
  cancelBtn.onclick = closeModal;
  newTenderBtn.onclick = () => openModal('Add Tender');

  // search & filter
  searchInput.addEventListener('input', () => updateTable());
  statusFilter.addEventListener('change', () => updateTable());

  // misc
  function refreshStats(){
    totalTenders.textContent = data.length;
    submittedCount.textContent = data.filter(x=>x.status==='Submitted').length;
    pendingCount.textContent = data.filter(x=>x.status==='Pending').length;
    awardCount.textContent = data.filter(x=>x.status==='Awarded').length;
  }

  function generateId(){ return 'AN' + Math.random().toString(36).slice(2,7).toUpperCase(); }

  // build time
  buildTime.textContent = new Date().toLocaleString();

  // custom pointer follow
  const cursor = document.getElementById('fancy-cursor');
  document.addEventListener('mousemove', e => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });

  // background canvas (nebula) - lightweight animated gradient using canvas
  function initNebula(){
    const canvas = document.getElementById('nebula');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
    resize(); window.addEventListener('resize', resize);
    let t=0;
    function draw(){
      t += 0.005;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0,0,w,h);
      const grd = ctx.createLinearGradient(0,0,w,h);
      grd.addColorStop(0, `rgba(124,199,255,${0.06 + Math.sin(t)*0.02})`);
      grd.addColorStop(0.5, `rgba(255,155,255,${0.05 + Math.cos(t*0.6)*0.03})`);
      grd.addColorStop(1, `rgba(123,255,178,${0.04 + Math.sin(t*0.4)*0.02})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);

      // light moving blobs
      for(let i=0;i<6;i++){
        const x = (Math.sin(t*(0.3+i*0.2)+i)*0.5+0.5)*w;
        const y = (Math.cos(t*(0.2+i*0.15)+i)*0.5+0.5)*h;
        const r = 120 + Math.sin(t*2+i)*40;
        const g = ctx.createRadialGradient(x,y,r*0.1,x,y,r);
        const col = i%2? 'rgba(124,199,255,0.06)' : 'rgba(255,155,255,0.05)';
        g.addColorStop(0, col);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // particles via tsParticles
  function initParticles(){
    if(!window.tsParticles) return;
    tsParticles.load('floating-orbs', {
      fpsLimit: 60,
      particles: {
        number: { value: 50, density: { enable: true, area: 800 } },
        color: { value: ["#7cc7ff","#ff9bff","#7bffb2"] },
        shape: { type: "circle" },
        opacity: { value: 0.12 },
        size: { value: { min: 2, max: 6 } },
        move: { enable: true, speed: 0.6, direction: "none", outModes: { default: "out" } }
      },
      interactivity: {
        events: { onHover: { enable: true, mode: "repulse" }, onClick: { enable: false } },
        modes: { repulse: { distance: 80 } }
      },
      detectRetina: true
    });
  }

  // init & boot
  function init(){
    loadData();
    initNebula();
    initParticles();
    updateTable();
    // small hero intro animation
    gsap.from('.hero-title', {y:20, opacity:0, duration:0.8, ease:'power2.out'});
    gsap.from('.stat', {y:8, opacity:0, duration:0.6, stagger:0.08, delay:0.1});
    // accessible escape to close modal
    document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
  }

  init();

  // expose debug helpers
  window.animeTender = { data, reload: updateTable, reset: ()=>{ localStorage.removeItem(STORAGE_KEY); location.reload() } };

})();
