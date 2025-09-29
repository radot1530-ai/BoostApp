// app.js - statique + localStorage
const App = (function(){
  const STORAGE_KEY = "boostapp_v1";

  // Admin credentials (ke w te mande yo)
  const ADMIN_USERNAME = "boost.app.com/1234";
  const ADMIN_PASSWORD = "lazarrepatrice558@gmail.com";

  // Rates (pou worker)
  const WORKER_RATE = { abonne: 2.5, like: 1.25, view: 0.625 };

  // Default data
  function defaultData(){
    return {
      clients: [],    // {id,name,phone,platform,service,quantity,link,payment_proof,status,createdAt}
      missions: [],   // {id,clientId,service,quantity,link,status,createdAt}
      workers: [],    // {id,name,phone,moncash,password,balance}
      proofs: []      // {id,workerId,missionId,file,status,submittedAt,approvedAt}
    };
  }

  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData())); return defaultData(); }
    try { return JSON.parse(raw); } catch(e){ localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData())); return defaultData(); }
  }
  function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function nextId(arr){ return arr.length ? (Math.max(...arr.map(x=>x.id||0))+1) : 1; }

  // Helpers file->dataURL for image
  function fileToDataURL(file){ return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = ()=> res(reader.result);
    reader.onerror = e => rej(e);
    reader.readAsDataURL(file);
  });}

  // ----------------- Client page -----------------
  async function initClientPage(){
    const form = document.getElementById('clientForm');
    const list = document.getElementById('clientList');
    const messages = document.getElementById('messages');

    renderClients();

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      messages.innerHTML = "";
      const fdata = new FormData(form);
      const name = fdata.get('name').trim();
      const phone = fdata.get('phone').trim();
      const platform = fdata.get('platform').trim();
      const service = fdata.get('service');
      const quantity = parseInt(fdata.get('quantity'),10) || 0;
      const link = fdata.get('link').trim();
      const file = document.getElementById('paymentFile').files[0];

      if(quantity < 100){ messages.innerHTML = "<li style='color:red'>Quantité min = 100</li>"; return; }
      if(!file){ messages.innerHTML = "<li style='color:red'>Ajoute screenshot peman</li>"; return; }

      const proofDataUrl = await fileToDataURL(file);
      const data = load();
      const cid = nextId(data.clients);
      data.clients.push({
        id: cid,
        name, phone, platform, service, quantity, link,
        payment_proof: proofDataUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      save(data);
      messages.innerHTML = "<li>Demann voye. Tanpri tann admin valide peman.</li>";
      form.reset();
      renderClients();
    });

    function renderClients(){
      const data = load();
      if(!list) return;
      if(!data.clients.length){ list.innerHTML = "<p class='small'>Pa gen demann pou kounye.</p>"; return; }
      list.innerHTML = data.clients.map(c => `
        <div style="border:1px dashed #ddd;padding:8px;margin-bottom:8px">
          <b>#${c.id}</b> ${c.name} (${c.phone}) — ${c.service} x ${c.quantity} — <span class="small">${c.status}</span>
          <div class="small">Lyen: ${c.link}</div>
        </div>
      `).join('');
    }
  }

  // ----------------- Worker page -----------------
  function initWorkerPage(){
    const area = document.getElementById('workerArea');
    const dashboard = document.getElementById('workerDashboard');

    const data = load();

    // If logged in
    let curWorkerId = sessionStorage.getItem('boost_worker_id');
    if(curWorkerId) showDashboard();

    function showRegisterLogin(){
      area.innerHTML = `
        <h2>Enskri</h2>
        <form id="regForm">
          <label>Non:</label><input name="name" required>
          <label>Phone (unique):</label><input name="phone" required>
          <label>MonCash:</label><input name="moncash">
          <label>Modpas:</label><input name="password" type="password" required>
          <button type="submit">Enskri</button>
        </form>
        <hr>
        <h2>Login</h2>
        <form id="loginForm">
          <label>Phone:</label><input name="phone" required>
          <label>Modpas:</label><input name="password" type="password" required>
          <button type="submit">Login</button>
        </form>
      `;
      document.getElementById('regForm').addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const f = new FormData(ev.target);
        const name = f.get('name').trim(), phone=f.get('phone').trim(), moncash=f.get('moncash').trim(), pass=f.get('password').trim();
        const d = load();
        if(d.workers.find(w=>w.phone===phone)){ alert("Nimewo deja anrejistre. Eseye login."); return; }
        const id = nextId(d.workers);
        d.workers.push({id, name, phone, moncash, password:pass, balance:0});
        save(d);
        alert("Enskri reussi. Konekte kounye a.");
        ev.target.reset();
      });
      document.getElementById('loginForm').addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const f = new FormData(ev.target); const phone=f.get('phone').trim(), pass=f.get('password').trim();
        const d = load(); const w = d.workers.find(x=>x.phone===phone && x.password===pass);
        if(!w){ alert("Credentials invalid"); return; }
        sessionStorage.setItem('boost_worker_id', w.id);
        curWorkerId = w.id;
        showDashboard();
      });
    }

    function showDashboard(){
      area.style.display='none';
      dashboard.style.display='block';
      renderDashboard();
      document.getElementById('logoutWorker').addEventListener('click', ()=> {
        sessionStorage.removeItem('boost_worker_id'); location.reload();
      });
    }

    function renderDashboard(){
      const d = load();
      const w = d.workers.find(x=>x.id == curWorkerId);
      if(!w){ alert("Worker not found"); sessionStorage.removeItem('boost_worker_id'); location.reload(); return; }
      document.getElementById('workerInfo').innerText = `${w.name} - ${w.phone}`;
      document.getElementById('workerBalance').innerText = w.balance || 0;

      // missions
      const missions = d.missions.filter(m=>m.status==='active');
      const mdiv = document.getElementById('missionsList');
      if(!missions.length) mdiv.innerHTML = "<p class='small'>Pa gen mission aktyèl.</p>";
      else mdiv.innerHTML = missions.map(m => `
        <div style="border:1px solid #eee;padding:8px;margin-bottom:8px">
          <b>#${m.id}</b> ${m.service} x ${m.quantity} — <a href="${m.link}" target="_blank">Lyen</a>
          <form style="margin-top:8px" enctype="multipart/form-data" method="post" onsubmit="return false">
            <input type="hidden" name="mission_id" value="${m.id}">
            <input type="file" name="proof" data-mission="${m.id}" accept="image/*" required>
            <button data-mission="${m.id}" class="submitProof">Soumèt prèv</button>
          </form>
        </div>
      `).join('');

      // proofs of this worker
      const proofs = d.proofs.filter(p=>p.workerId==w.id).sort((a,b)=>b.id-a.id);
      const pdiv = document.getElementById('proofsList');
      pdiv.innerHTML = proofs.length ? proofs.map(p=>`
        <div style="border:1px dashed #ddd;padding:6px;margin-bottom:6px">
          Proof #${p.id} pou mission #${p.missionId} — Status: ${p.status}
          <div class="small"><a href="${p.file}" target="_blank">Voir image</a></div>
        </div>
      `).join('') : "<p class='small'>Ou poko soumèt okenn prèv</p>";

      // attach event listeners for submitProof
      Array.from(document.getElementsByClassName('submitProof')).forEach(btn=>{
        btn.onclick = async function(){
          const mid = this.getAttribute('data-mission');
          const input = document.querySelector(`input[type=file][data-mission='${mid}']`);
          if(!input || !input.files[0]){ alert("Chwazi yon fichye"); return; }
          const dataUrl = await fileToDataURL(input.files[0]);
          const dat = load();
          const id = nextId(dat.proofs);
          dat.proofs.push({ id, workerId: w.id, missionId: parseInt(mid), file: dataUrl, status:'pending', submittedAt: new Date().toISOString() });
          save(dat);
          alert("Prèv soumèt. Tanpri tann admin valide li.");
          renderDashboard();
        }
      });
    }

    showRegisterLogin();
  }

  // ----------------- Admin page -----------------
  function initAdminPage(){
    const area = document.getElementById('adminArea');
    // login form
    area.innerHTML = `
      <div id="adminLogin">
        <h2></h2>
        <form id="admForm">
          <label></label><input name="u" required>
          <label></label><input name="p" type="password" required>
          <button type="submit">Enter</button>
        </form>
      </div>
      <div id="adminPanel" style="display:none"></div>
    `;
    document.getElementById('admForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const f = new FormData(ev.target); const u=f.get('u').trim(), p=f.get('p').trim();
      if(u===ADMIN_USERNAME && p===ADMIN_PASSWORD){ sessionStorage.setItem('boost_admin', '1'); showPanel(); }
      else alert("Identifiants invalid");
    });

    if(sessionStorage.getItem('boost_admin')) showPanel();

    function showPanel(){
      document.getElementById('adminLogin').style.display='none';
      document.getElementById('adminPanel').style.display='block';
      renderAdmin();
    }

    function renderAdmin(){
      const d = load();
      const panel = document.getElementById('adminPanel');
      panel.innerHTML = `
        <h2>Admin Dashboard</h2>
        <p><button id="logoutAdmin">Logout</button></p>
        <h3>Demand Kliyan (pèman)</h3>
        <div id="clientsBlock"></div>
        <h3>Misyon</h3>
        <div id="missionsBlock"></div>
        <h3>Proofs</h3>
        <div id="proofsBlock"></div>
        <h3>Travayè</h3>
        <div id="workersBlock"></div>
        <hr>
        <h3>Ajoute misyon manyèl</h3>
        <form id="addMissionForm">
          <label>Service</label>
          <select name="service"><option value="abonne">abonne</option><option value="like">like</option><option value="view">view</option></select>
          <label>Quantity</label><input name="quantity" type="number" value="100">
          <label>Link</label><input name="link">
          <button type="submit">Ajoute misyon</button>
        </form>
      `;

      document.getElementById('logoutAdmin').onclick = ()=>{ sessionStorage.removeItem('boost_admin'); location.reload(); }

      // render clients
      const clientHtml = d.clients.map(c=>`
        <div style="border:1px solid #eee;padding:8px;margin-bottom:8px">
          <b>#${c.id}</b> ${c.name} (${c.phone}) ${c.platform} - ${c.service} x ${c.quantity} - <small>${c.status}</small>
          <div class="small">Link: ${c.link}</div>
          ${c.payment_proof ? `<div><a href="${c.payment_proof}" target="_blank">Voir paiement</a></div>` : ''}
          ${c.status==='pending' ? `<div><button class="approvePayment" data-id="${c.id}">Valide peman</button></div>` : ''}
        </div>
      `).join('') || "<p class='small'>Pa gen demann</p>";
      document.getElementById('clientsBlock').innerHTML = clientHtml;

      // missions
      const mHtml = d.missions.map(m=>`
        <div style="border:1px dashed #ddd;padding:8px;margin-bottom:8px">
          #${m.id} - ${m.service} x ${m.quantity} - <a href="${m.link}" target="_blank">Voir</a> - ${m.status}
        </div>
      `).join('') || "<p class='small'>Pa gen mission</p>";
      document.getElementById('missionsBlock').innerHTML = mHtml;

      // proofs
      const pHtml = d.proofs.map(p=>{
        const worker = d.workers.find(w=>w.id===p.workerId);
        return `<div style="border:1px solid #ddd;padding:8px;margin-bottom:8px">
          #${p.id} - Travayè: ${worker?worker.name:'?'} - Mission: ${p.missionId} - ${p.status}
          - <a href="${p.file}" target="_blank">Voir</a>
          ${p.status==='pending'?` <button class="approveProof" data-id="${p.id}">Valide</button> <button class="rejectProof" data-id="${p.id}">Rejete</button>`:''}
        </div>`;
      }).join('') || "<p class='small'>Pa gen proofs</p>";
      document.getElementById('proofsBlock').innerHTML = pHtml;

      // workers
      const wHtml = d.workers.map(w=>`<div>#${w.id} - ${w.name} - ${w.phone} - Solde: ${w.balance||0}</div>`).join('') || "<p class='small'>Pa gen workers</p>";
      document.getElementById('workersBlock').innerHTML = wHtml;

      // events
      Array.from(document.getElementsByClassName('approvePayment')).forEach(b=>{
        b.onclick = ()=>{
          const id = parseInt(b.getAttribute('data-id'));
          approvePayment(id);
        }
      });
      Array.from(document.getElementsByClassName('approveProof')).forEach(b=>{
        b.onclick = ()=> approveProof(parseInt(b.getAttribute('data-id')));
      });
      Array.from(document.getElementsByClassName('rejectProof')).forEach(b=>{
        b.onclick = ()=> rejectProof(parseInt(b.getAttribute('data-id')));
      });

      document.getElementById('addMissionForm').addEventListener('submit',(ev)=>{
        ev.preventDefault();
        const f = new FormData(ev.target);
        const service = f.get('service'), quantity=parseInt(f.get('quantity')||0), link=f.get('link');
        const dat = load();
        dat.missions.push({ id: nextId(dat.missions), clientId:null, service, quantity, link, status:'active', createdAt: new Date().toISOString() });
        save(dat); alert("Mission ajoute"); renderAdmin();
      });
    }

    function approvePayment(clientId){
      const d = load();
      const client = d.clients.find(c=>c.id===clientId); if(!client) return alert("Pa jwenn client");
      // create mission based on client
      d.missions.push({ id: nextId(d.missions), clientId: client.id, service: client.service, quantity: client.quantity, link: client.link, status:'active', createdAt:new Date().toISOString() });
      client.status = 'paid';
      save(d); alert("Peman valide - misyon kreye"); renderAdmin();
    }

    function approveProof(proofId){
      const d = load(); const p = d.proofs.find(x=>x.id===proofId); if(!p) return;
      const mission = d.missions.find(m=>m.id===p.missionId); if(!mission) { alert("Misyon pa jwenn"); return; }
      const rate = WORKER_RATE[mission.service] || 0;
      const payout = rate * mission.quantity;
      const worker = d.workers.find(w=>w.id===p.workerId);
      if(worker){ worker.balance = (worker.balance||0) + payout; }
      p.status = 'approved';
      p.approvedAt = new Date().toISOString();
      if(mission) mission.status = 'completed';
      save(d);
      alert(`Prèv valide. Travayè a kredite ${payout} HTG.`);
      renderAdmin();
    }

    function rejectProof(proofId){
      const d = load(); const p = d.proofs.find(x=>x.id===proofId); if(!p) return;
      p.status = 'rejected'; save(d); alert("Prèv rejte"); renderAdmin();
    }
  }

  // expose
  return {
    initClientPage, initWorkerPage, initAdminPage
  };
})();
