/* ============ Rendu ============ */
function pendingGroups(){
  const g={};
  for(const o of S.ops){ if(catOf(o)) continue;
    const key=S.rules[o.merchant]?o.merchant+(o.amount>0?'|+':'|-'):o.merchant;
    const e=g[key]||(g[key]={m:key,n:0,total:0,label:o.label,refunds:0});
    if(o.amount>0&&(LINK[o.id]||REFUND_RE.test(norm(o.label)))) e.refunds++;
    e.n++; e.total+=o.amount; }
  return Object.values(g).sort((a,b)=>b.n-a.n||Math.abs(b.total)-Math.abs(a.total));
}
function icons(){ if(window.lucide&&lucide.createIcons) lucide.createIcons({icons:lucide.icons,attrs:{'stroke-width':1.25}}) }
function catOptions(sel,withAuto){
  return (withAuto?`<option value="">Selon la règle</option>`:'')+S.categories.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}</option>`).join('');
}

let ACCN=0;
function render(){
  AGG={}; relink(); ACCN=accounts().length;
  const n=pendingGroups().length, nw=waitingReturns().length;
  const tabs=[['synthese','Synthèse'],['economies','Économies'],['objectifs','Objectifs'],['operations','Opérations'],['remb','Remboursements'],['valider','À valider'],['regles','Réglages'],['importer','Importer']];
  $('#tabs').innerHTML=tabs.map(([k,l])=>`<button data-tab="${k}" aria-current="${view===k}">${l}${k==='valider'&&n?`<span class="badge">${n}</span>`:''}${k==='remb'&&nw?`<span class="badge">${nw}</span>`:''}</button>`).join('');
  $('#demoBar').innerHTML=demo?`<div class="demo-bar"><span>Vous regardez des données fictives.</span><button data-act="exitdemo">Quitter l’exemple</button></div>`:'';
  if(!P) P=defaultPeriod();
  const v=$('#view');
  if(!S.ops.length&&view!=='importer'&&view!=='regles'){ v.innerHTML=emptyAll(); icons(); setStatus(); return }
  const FOOT=`<div class="foot"><i data-lucide="lock"></i><span>Vos comptes restent privés : personne d’autre ne peut les voir.</span></div>`;
  v.innerHTML={synthese:vSynth,economies:vEco,objectifs:vGoals,operations:vOps,remb:vRefunds,valider:vQueue,regles:vRules,importer:vImport}[view]()+(view==='importer'?'':FOOT);
  icons(); setStatus();
}
function privacyText(){return mode==='db'
  ?'Vos comptes sont privés. Ils sont enregistrés dans votre espace personnel, et personne d’autre ne peut les voir, pas même la personne qui vous a transmis l’application.'
  :'Vos comptes sont privés. Vos relevés sont lus et enregistrés uniquement sur cet appareil, et rien n’est envoyé ailleurs. Personne d’autre ne peut les voir, pas même la personne qui vous a transmis l’application.'}
function privacyBox(){return `<div class="privacy" role="note"><i data-lucide="lock"></i><span>${privacyText()}</span></div>`}
function emptyAll(){
  return privacyBox()+`<div class="empty"><p>Aucun relevé pour l’instant</p>
  <div style="margin-bottom:26px">Importez vos relevés PDF ou CSV pour voir où part votre argent.</div>
  <div class="btn-row" style="justify-content:center"><button class="btn" data-tab="importer">Importer un relevé</button><button class="btn gold" data-act="demo">Voir un exemple</button></div></div>`;
}
function periodBar(){
  const ac=accounts();
  return `<div class="levels">${[['M','Mois'],['Q','Trimestre'],['Y','Année']].map(([k,l])=>`<button data-lvl="${k}" aria-pressed="${P.lvl===k}">${l}</button>`).join('')}
  ${ac.length>1?`<label class="acct"><select class="quiet" data-accfilter="1" aria-label="Compte affiché"><option value="">Tous les comptes</option>${ac.map(a=>`<option value="${esc(a)}"${a===ACC?' selected':''}>${esc(a)}</option>`).join('')}</select></label>`:''}</div>
  <div class="period"><button class="arrow" data-shift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button>
  <h2>${plabel(P)}</h2><button class="arrow" data-shift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>`;
}
function alertFor(cid,net,months){
  const c=catById(cid);
  if(c&&c.budget>0){const b=c.budget*months; if(net>b) return ['🔥',`budget dépassé de ${eur0(net-b)}`]; if(net>b*.9) return ['⚠️','budget presque atteint']; return null}
  let sum=0,k=0; for(let i=1;i<=3;i++){const a=agg(shift(P,-i)); if(a.any){sum+=(a.by[cid]?.net||0);k++}}
  if(!k||net<=0) return null; const avg=sum/k; if(avg<20) return null;
  const r=net/avg;
  if(r>1.5) return ['🔥',`+${Math.round((r-1)*100)} % sur la moyenne`];
  if(r>1.15) return ['⚠️',`+${Math.round((r-1)*100)} % sur la moyenne`];
  if(r<.8) return ['🎉',`${Math.round((r-1)*100)} % sous la moyenne`];
  return null;
}
function trend(){
  let pts=[];
  if(P.lvl==='M'){for(let i=5;i>=0;i--){const p={lvl:'M',...shift(P,-i)};pts.push({l:MOIS[p.m-1].slice(0,3)+'.',v:agg(p).net,cur:i===0})}}
  else{const [a]=bounds(P);const y=+a.slice(0,4),m0=+a.slice(5,7);const n=P.lvl==='Q'?3:12;for(let i=0;i<n;i++){const p={lvl:'M',y,m:m0+i};pts.push({l:MOIS[p.m-1].slice(0,P.lvl==='Y'?1:3)+(P.lvl==='Y'?'':'.'),v:agg(p).net,cur:false})}}
  const max=Math.max(1,...pts.map(p=>p.v)); const W=600,H=160,bh=118,gap=W/pts.length,bw=Math.min(46,gap*.42);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des dépenses">
  <line x1="0" x2="${W}" y1="${bh}" y2="${bh}" stroke="var(--line)"/>
  ${pts.map((p,i)=>{const h=Math.max(p.v>0?2:0,p.v/max*(bh-18));const x=i*gap+gap/2;return `
    <rect x="${x-bw/2}" y="${bh-h}" width="${bw}" height="${h}" fill="${p.cur?'var(--gold)':'var(--ink)'}" opacity="${p.cur?1:.82}"/>
    ${p.v>0&&pts.length<=6?`<text x="${x}" y="${bh-h-7}" text-anchor="middle" font-size="17" fill="var(--muted)" font-family="Jost, sans-serif">${esc(eur0(p.v))}</text>`:''}
    <text x="${x}" y="${bh+22}" text-anchor="middle" font-size="18" fill="var(--muted)" font-family="Jost, sans-serif">${esc(p.l)}</text>`}).join('')}
  </svg>`;
}
function donut(rows,total){
  const pos=rows.filter(([,e])=>e.net>0); const sum=pos.reduce((s,[,e])=>s+e.net,0);
  if(!pos.length||sum<=0) return '';
  let items=pos.map(([cid,e])=>({cid,v:e.net,name:cid==='_pending'?'À classer':(catById(cid)?.name||cid)}));
  if(items.length>7){const rest=items.slice(6);items=items.slice(0,6);items.push({cid:null,v:rest.reduce((s,x)=>s+x.v,0),name:`Autres postes (${rest.length})`})}
  const COLS=[['var(--gold)',1],['var(--ink)',1],['var(--gold)',.62],['var(--ink)',.55],['var(--gold)',.34],['var(--ink)',.28],['var(--muted)',.35]];
  const R=80,C=2*Math.PI*R,GAP=items.length>1?2.2:0; let off=0;
  const arcs=items.map((x,i)=>{const len=x.v/sum*C;const [col,op]=COLS[i%COLS.length];
    const s=`<circle ${x.cid?`data-cat="${x.cid}"`:''} cx="100" cy="100" r="${R}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="12" stroke-dasharray="${Math.max(0.5,len-GAP)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${esc(x.name)}</title></circle>`;
    off+=len; return s}).join('');
  return `<h3 class="sec">Répartition des postes</h3>
  <div class="split">
    <svg viewBox="0 0 200 200" role="img" aria-label="Répartition des dépenses par poste">
      ${arcs}
      <text x="100" y="100" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="34" fill="var(--ink)">${Math.round(items[0].v/sum*100)} %</text>
      <text x="100" y="121" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="var(--muted)">${esc(items[0].name.length>22?items[0].name.split(' ')[0]:items[0].name)}</text>
    </svg>
    <div class="legend">${items.map((x,i)=>{const [col,op]=COLS[i%COLS.length];return `<button ${x.cid?`data-cat="${x.cid}"`:'disabled'}><i style="background:${col};opacity:${op}"></i><span>${esc(x.name)}</span><span class="pc">${Math.round(x.v/sum*100)} %</span><span class="am">${eur0(x.v)}</span></button>`}).join('')}</div>
  </div>`;
}
function vSynth(){
  const A=agg(P), B=agg(shift(P,-1));
  const eurs=Math.floor(Math.abs(A.net)), cts=Math.round((Math.abs(A.net)-eurs)*100);
  let cmp='';
  if(B.any&&B.net>0){const d=A.net-B.net,pc=Math.round(d/B.net*100);
    cmp=`<strong>${d>=0?'+':'−'}${eur0(Math.abs(d))}</strong> (${pc>=0?'+':''}${pc} %) par rapport ${prevLabel(P)}${pc<=-10?' 🎉':pc>=25?' ⚠️':''}`}
  const rows=Object.entries(A.by).filter(([,e])=>e.spent||e.ref).sort((a,b)=>b[1].net-a[1].net);
  const max=Math.max(1,...rows.map(([,e])=>e.net));
  const solde=A.income-A.net-A.pro;
  const st=stats(P), ret=retenir(A,st);
  return periodBar()+`
  <section class="hero">
    <div class="big">${A.net<0?'−':''}${new Intl.NumberFormat('fr-FR').format(eurs)} €<span class="cts">${pad(cts)}</span></div>
    <div class="hero-sub">${A.any?'Dépenses personnelles de la période, remboursements déduits.':'Aucune opération sur cette période.'}${cmp?'<br>'+cmp:''}</div>
  </section>
  <div class="trio">
    <div><span>Rentrées</span><b>${eur0(A.income)}</b></div>
    <div><span>Dépenses${A.pro?' perso':''}</span><b>${eur0(A.net)}</b></div>
    <div><span>Solde</span><b style="color:${solde<0?'var(--alert)':'inherit'}">${solde<0?'−':''}${eur0(Math.abs(solde))}</b></div>
  </div>
  ${ret.length?`<div class="retenir" aria-label="À retenir">${ret.map(x=>`<button data-tab="${x.go}"><span class="e" aria-hidden="true">${x.e||'<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--gold);vertical-align:middle;margin-left:4px"></span>'}</span><span>${esc(x.t)}</span><i data-lucide="chevron-right"></i></button>`).join('')}</div>`:''}
  ${P.lvl==='Y'&&A.any?`<button class="wrapped-card" data-act="review"><span><span class="t">Votre année ${P.y} en revue</span><br><span class="s">Vos meilleurs et vos pires moments, en quelques écrans.</span></span><i data-lucide="sparkles"></i></button>`:''}
  ${donut(rows,A.net)}
  <div class="chart"><h3 class="sec">Évolution</h3>${trend()}</div>
  <h3 class="sec">Par catégorie</h3>
  <div class="cats">${rows.length?rows.map(([cid,e])=>{
    const c=catById(cid), pend=cid==='_pending';
    const al=pend?null:alertFor(cid,e.net,A.months);
    const bud=c&&c.budget>0?c.budget*A.months:0;
    const meta=[A.months>1?`${eur0(e.net/A.months)} par mois en moyenne`:'',e.ref>0?`dont ${eur0(e.ref)} remboursés`:'',al?al[1]:'',pend?'à classer dans l’onglet À valider':''].filter(Boolean).join(', ');
    const open=openCat===cid;
    return `<div class="cat${pend?' pending':''}">
      <button class="cat-row" data-cat="${cid}" aria-expanded="${open}">
        <i data-lucide="${pend?'circle-help':c?.icon||'circle'}"></i>
        <div><div class="cat-name">${esc(pend?'À classer':c?.name||cid)}${al?`<span class="cat-emoji" aria-hidden="true">${al[0]}</span>`:''}</div>${meta?`<div class="cat-meta">${esc(meta)}</div>`:''}</div>
        <div class="cat-amt">${eur0(e.net)}</div>
        <div class="meter"><span style="width:${Math.max(0,e.net/max*100)}%"></span>${bud?`<em style="left:${Math.min(100,bud/max*100)}%" title="Budget"></em>`:''}</div>
      </button>
      ${open?`<div class="cat-ops">${e.ops.sort((a,b)=>a.date<b.date?1:-1).map(opRow).join('')}</div>`:''}
    </div>`}).join(''):`<div class="empty" style="padding:30px 0">Rien à afficher sur cette période.</div>`}</div>
  ${(()=>{const ir=Object.entries(A.inc).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);if(!ir.length)return '';
    return `<h3 class="sec" style="margin-top:46px">Rentrées</h3><div class="cats">${ir.map(([cid,v])=>{const c=catById(cid);return `<div class="cat"><div class="cat-row" style="cursor:default">
      <i data-lucide="${c?.icon||'circle'}"></i><div><div class="cat-name">${esc(c?.name||cid)}</div>${cid==='revenus'&&S.incomeSource==='file'?'<div class="cat-meta">depuis votre fichier de revenus</div>':''}</div>
      <div class="cat-amt" style="color:var(--gold)">${v<0?'−':'+'}${eur0(Math.abs(v))}</div></div></div>`}).join('')}</div>`})()}
  ${(()=>{const pr=Object.entries(A.proBy).filter(([,e])=>e.net).sort((a,b)=>b[1].net-a[1].net);if(!pr.length)return '';
    return `<h3 class="sec" style="margin-top:46px">Frais professionnels</h3><p class="note" style="margin:-8px 0 12px">Hors dépenses personnelles.</p><div class="cats">${pr.map(([cid,e])=>{const c=catById(cid);const open=openCat===cid;return `<div class="cat"><button class="cat-row" data-cat="${cid}" aria-expanded="${open}">
      <i data-lucide="${c?.icon||'briefcase'}"></i><div><div class="cat-name">${esc(c?.name||cid)}</div></div><div class="cat-amt">${eur0(e.net)}</div></button>
      ${open?`<div class="cat-ops">${e.ops.sort((a,b)=>a.date<b.date?1:-1).map(opRow).join('')}</div>`:''}</div>`}).join('')}</div>`})()}`;
}
function opRow(o){
  const c=catOf(o);
  return `<div class="op">
    <div class="op-date">${o.date.slice(8,10)}/${o.date.slice(5,7)}/${o.date.slice(2,4)}</div>
    <div><div class="op-m">${esc(o.merchant)}</div><div class="op-l">${o.src==='rev'?'Fichier de revenus':esc(o.label)}${o.src!=='rev'&&ACCN>1?` <span style="color:var(--ink);opacity:.55">— ${esc(acctOf(o))}</span>`:''}</div>${(x=>x?`<div class="op-x">${esc(x)}</div>`:'')(o.src==='rev'?'':opExtra(o))}</div>
    <div class="op-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</div>
    <div class="op-tools">${o.src==='rev'?'':`
      <select class="quiet" data-override="${o.id}" aria-label="Catégorie de cette opération">
        ${o.cat?'':`<option value="" selected>${c?'Selon la règle : '+esc(catById(c)?.name||c):'Non classée'}</option>`}
        ${o.cat?`<option value="">Revenir à la règle</option>`:''}
        ${S.categories.map(k=>`<option value="${k.id}"${o.cat===k.id?' selected':''}>${esc(k.name)}${o.cat===k.id?' (cette opération seulement)':''}</option>`).join('')}
      </select>`}
      ${o.src!=='rev'&&o.amount<0&&!LINKED[o.id]&&!INTERNAL[o.id]?`<button class="link" data-await="${o.id}">${o.awaiting?'Annuler le retour':'Signaler un retour'}</button>`:''}
      <button class="link" data-delop="${o.id}">Supprimer</button>
    </div>
  </div>`;
}
function vOps(){
  const [a,b]=bounds(P);
  const t=norm(q.trim());
  let list=t?S.ops.filter(o=>norm(o.label+' '+o.merchant).includes(t)):S.ops.filter(o=>{const k=o.date.slice(0,7);return k>=a&&k<=b});
  if(ACC) list=list.filter(o=>o.src!=='rev'&&acctOf(o)===ACC);
  const total=list.reduce((s,o)=>s+o.amount,0);
  return (t?'':periodBar())+`<input class="search" id="search" type="search" placeholder="Rechercher un marchand ou un libellé, sur toutes les périodes" value="${esc(q)}">
  <p class="count">${list.length} opération${list.length>1?'s':''}, solde ${total<0?'−':'+'}${eur(Math.abs(total))}${list.length>300?'. Seules les 300 plus récentes sont affichées.':''}</p>
  <div>${list.slice(0,300).map(opRow).join('')||'<div class="empty" style="padding:30px 0">Aucune opération.</div>'}</div>`;
}
function vRefunds(){
  const [a,b]=bounds(P);
  const refs=S.ops.filter(o=>{const k=o.date.slice(0,7);return k>=a&&k<=b&&isRefund(o)});
  const tot=refs.reduce((s,o)=>s+o.amount,0);
  const w=waitingReturns();
  return periodBar()+`
  <section class="hero" style="padding-bottom:24px;margin-bottom:34px">
    <div class="big" style="font-size:clamp(44px,12vw,76px)">${eur0(tot)}</div>
    <div class="hero-sub">Remboursés sur la période, en ${refs.length} opération${refs.length>1?'s':''}. Chaque remboursement est déduit de la catégorie de l’achat d’origine, jamais compté comme un revenu.</div>
  </section>
  <section class="block"><h3 class="sec">Retours en attente</h3>
    ${w.length?w.map(opRow).join(''):'<p class="note">Aucun retour en attente. Quand vous renvoyez un achat, touchez « Signaler un retour » sous l’opération : le remboursement y sera rattaché dès son arrivée, et un ⚠️ apparaît s’il tarde plus de 30 jours.</p>'}
  </section>
  <section class="block"><h3 class="sec">Remboursements reçus</h3>
    ${refs.length?refs.map(opRow).join(''):'<p class="note">Aucun remboursement sur cette période.</p>'}
  </section>`;
}
function vQueue(){
  const g=pendingGroups();
  if(!g.length) return `<div class="empty"><p>Tout est classé ✅</p><div>Les prochaines opérations de ces marchands seront rangées automatiquement.</div></div>`;
  const withS=g.filter(x=>S.sugg[x.m]).length, without=g.length-withS;
  return `<p class="lead">Une seule question par marchand. Votre choix devient une règle, appliquée à toutes ses opérations passées et futures.</p>
  <div class="btn-row">
    ${withS?`<button class="btn" data-act="acceptall">Valider les ${withS} suggestions</button>`:''}
    ${without?`<button class="btn gold" data-act="askclaude" id="askBtn">Demander à Claude pour ${without} marchand${without>1?'s':''}</button>`:''}
  </div>
  <p class="note" id="askNote" style="margin:-16px 0 24px">${without?'Seuls les noms de marchands sont envoyés, jamais les montants ni les libellés complets.':''}</p>
  <div>${g.map(x=>{const s=S.sugg[x.m];return `<div class="q">
    <div><div class="q-m">${esc(ruleName(x.m))}</div>
      <div class="q-sub">${x.n} opération${x.n>1?'s':''}, ${x.total<0?'−':'+'}${eur(Math.abs(x.total))}. Exemple : ${esc(x.label)}</div>${x.refunds?`<div class="q-hint">Dont ${x.refunds} remboursement${x.refunds>1?'s':''}, rangé${x.refunds>1?'s':''} avec les achats</div>`:''}
      ${s?`<div class="q-hint">${s.src==='claude'?`Suggestion de Claude${s.conf!=null?', confiance '+Math.round(s.conf*100)+' %':''}`:'Suggestion automatique'}</div>`:''}</div>
    <div class="q-act"><select class="quiet" data-qsel="${esc(x.m)}" aria-label="Catégorie pour ${esc(x.m)}">${s?'':'<option value="">Choisir une catégorie</option>'}${catOptions(s?.c)}</select>
    <button class="link" data-qok="${esc(x.m)}">Valider</button></div></div>`}).join('')}</div>`;
}
function vRules(){
  const r=Object.entries(S.rules).sort((a,b)=>a[0].localeCompare(b[0]));
  const s=S.settings;
  return `<section class="block"><h3 class="sec">Votre situation</h3>
  <p class="lead">Ces chiffres servent au matelas de sécurité, à la part à mettre de côté et au vrai prix de vos dépenses.</p>
  <div class="fields">
    <label>Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${s.epargne||''}" placeholder="0"></label>
    <label>Part des revenus à mettre de côté (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="selon votre statut"></label>
    <label>Heures travaillées par mois<input type="number" inputmode="numeric" min="1" step="5" data-set="heures" value="${s.heures||''}" placeholder="140"></label>
    <label>Matelas visé (mois)<input type="number" inputmode="numeric" min="1" max="36" step="1" data-set="objectif" value="${s.objectif||''}" placeholder="6"></label>
  </div>
  <p class="note">La part à mettre de côté pour les cotisations et les impôts dépend de votre statut et de votre régime : vérifiez-la avec votre comptable ou sur le site de l’URSSAF.</p></section>
  ${accounts().length?`<section class="block"><h3 class="sec">Comptes</h3><p class="lead">Un compte par banque ou par usage. Renommez-les comme vous voulez, par exemple « Perso » et « Pro ».</p>
  ${accounts().map(a=>`<div class="rule"><span>${esc(a)}</span><span style="font-size:12.5px;color:var(--muted)">${S.ops.filter(o=>o.src!=='rev'&&acctOf(o)===a).length} opérations</span><button class="link" data-renacct="${esc(a)}">Renommer</button></div>`).join('')}</section>`:''}
  <section class="block"><h3 class="sec">Budgets mensuels</h3>
  <p class="lead">Facultatif. Sans budget, les alertes comparent chaque catégorie à la moyenne des trois périodes précédentes.</p>
  ${S.categories.filter(c=>c.type==='expense').map(c=>`<label class="budget"><i data-lucide="${c.icon}"></i><span>${esc(c.name)}</span><input type="number" min="0" step="10" inputmode="numeric" placeholder="—" value="${c.budget||''}" data-budget="${c.id}" aria-label="Budget mensuel ${esc(c.name)}"></label>`).join('')}
  </section>
  <section class="block"><h3 class="sec">Rubriques</h3>
  <p class="lead">Ajoutez vos propres rubriques. Une rentrée d’argent s’additionne à vos revenus, une dépense entre dans la synthèse des postes, un frais professionnel reste à part. Touchez « Variable » ou « Charge fixe » pour dire ce qui compte dans votre point mort.</p>
  ${S.categories.map(c=>`<div class="rule"><span style="display:flex;gap:12px;align-items:center"><i data-lucide="${c.icon}" style="width:17px;height:17px;color:var(--gold)"></i>${esc(c.name)}</span><span style="display:flex;gap:14px;align-items:baseline;font-size:12.5px;color:var(--muted)">${c.type==='expense'?`<button class="link" data-fixed="${c.id}" aria-pressed="${!!c.fixed}" style="${c.fixed?'color:var(--gold);text-decoration-color:var(--gold)':''}">${c.fixed?'Charge fixe':'Variable'}</button>`:''}${{expense:'Dépense',income:'Rentrée d’argent',transfer:'Neutre',pro:'Professionnel'}[c.type]}</span>${c.custom?`<button class="link" data-delcat="${c.id}">Supprimer</button>`:'<span></span>'}</div>`).join('')}
  <div class="rule" style="border-bottom:0;padding-top:18px">
    <input id="newcat" class="search" style="margin:0;padding:6px 0;font-size:14px" placeholder="Nom de la nouvelle rubrique" maxlength="40">
    <select class="quiet" id="newcattype"><option value="expense">Dépense</option><option value="income">Rentrée d’argent</option><option value="pro">Frais professionnel</option></select>
    <button class="link" data-act="addcat" style="color:var(--ink)">Ajouter</button>
  </div></section>
  <section class="block"><h3 class="sec">Règles apprises</h3>
  ${r.length?r.map(([m,c])=>`<div class="rule"><span>${esc(ruleName(m))}</span><select class="quiet" data-rule="${esc(m)}">${catOptions(c)}</select><button class="link" data-delrule="${esc(m)}">Supprimer</button></div>`).join(''):'<p class="note">Aucune règle pour l’instant. Elles se créent quand vous validez un marchand.</p>'}
  </section>
  <section class="block"><h3 class="sec">Données</h3>
  <p class="note">${mode==='db'?'Vos données sont enregistrées dans votre espace privé de cet artefact : personne d’autre ne peut les lire, même si vous partagez le lien.':'Vos données sont enregistrées dans ce navigateur uniquement.'}</p>
  <div class="btn-row" style="margin:18px 0 22px"><button class="btn" data-act="backup">Sauvegarder mes données</button><label class="btn gold" style="cursor:pointer">Restaurer une sauvegarde<input type="file" id="restorefile" accept=".json,application/json" style="display:none"></label></div>
  <p class="note" style="margin-bottom:18px">La sauvegarde est un petit fichier à garder en lieu sûr. Pour changer d’appareil, sauvegardez sur l’ancien, puis restaurez sur le nouveau.${backupMsg?`<br><span style="color:var(--gold)">${esc(backupMsg)}</span>`:''}</p>
  <button class="link danger" data-act="wipe">Tout effacer</button></section>`;
}
function vImport(){
  const nRev=S.ops.filter(o=>o.src==='rev').length;
  return privacyBox()+`<section class="block"><h3 class="sec">Relevés bancaires</h3>
  <label class="drop" data-drop="bank"><input type="file" id="file" accept=".pdf,.csv,application/pdf,text/csv" multiple>
    <p>Déposer des relevés</p><span>PDF ou CSV, plusieurs à la fois. Les opérations déjà importées sont ignorées.</span></label>
  <p class="note">Vous pouvez déposer plusieurs relevés d’un coup, même de banques différentes, par exemple une année complète. Chaque relevé est rattaché à un compte, que vous pouvez renommer.</p>
  <div style="margin-top:26px">${reports.map(r=>`<div class="report"><h4>${esc(r.name)}</h4>
    ${r.error?`<p class="count danger">${esc(r.error)}</p>`:`<p class="count">${r.found} opération${r.found>1?'s':''} trouvée${r.found>1?'s':''}${r.reader?` avec le lecteur « ${esc(r.reader)} »`:''}, ${r.added} ajoutée${r.added>1?'s':''}, ${r.dups} déjà connue${r.dups>1?'s':''}.${!r.found?' Aucune ligne n’a été reconnue : voir ci-dessous.':''}</p>`}
    ${!r.error&&r.found?`<div class="acct">Compte :<select class="quiet" data-repacct="${r.imp}">${[...new Set([...accounts(),r.acct])].map(a=>`<option${a===r.acct?' selected':''}>${esc(a)}</option>`).join('')}<option value="__new">Autre compte…</option></select></div>`:''}
    ${r.sample.slice(0,6).map(opRow).join('')}
    ${r.raw&&!r.found?`<div class="privacy" style="border-color:var(--line);background:transparent;margin-top:12px"><i data-lucide="file-question"></i><span><b style="font-weight:400">Relevé mal reconnu ?</b> Voici le texte lu dans le PDF, déjà anonymisé : IBAN, numéros et noms sont masqués. Relisez-le, puis envoyez-le à la personne qui vous a transmis l’application : elle pourra faire adapter le lecteur à votre banque.
      <textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="link" data-copy="${r.imp}" style="color:var(--ink)">Copier le texte</button>
      <br><br>Vous avez Claude ? Faites-le vous-même en deux minutes : <button class="link" data-prompt="${r.imp}" style="color:var(--ink)">Copier la demande pour Claude</button>, puis suivez la marche à suivre plus bas, dans « Lecteurs de relevés ».</span></div>`:''}
    ${r.raw&&r.found?`<details><summary>Des opérations manquent ? Voir le texte lu, anonymisé</summary><div class="privacy" style="border-color:var(--line);background:transparent;margin-top:10px"><span>IBAN, numéros et noms sont masqués. Relisez ce texte, puis envoyez-le à la personne qui vous a transmis l’application pour faire adapter le lecteur à votre banque.<textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="link" data-copy="${r.imp}" style="color:var(--ink)">Copier le texte</button> <button class="link" data-prompt="${r.imp}" style="color:var(--ink);margin-left:14px">Copier la demande pour Claude</button></span></div></details>`:''}</div>`).join('')}</div></section>
  <section class="block" id="lecteurs"><h3 class="sec">Lecteurs de relevés</h3>
  <p class="lead">Si les relevés de votre banque sont mal lus, vous pouvez apprendre à l’application à les lire, avec l’aide de Claude. Aucune ligne de code à toucher, et vos données restent où elles sont.</p>
  <ol class="steps">
    <li>Importez un relevé de cette banque. Sous le relevé mal lu, touchez « Copier la demande pour Claude ». Le texte copié est déjà anonymisé.</li>
    <li>Ouvrez Claude (claude.ai ou l’application, un compte gratuit suffit), collez la demande dans une nouvelle conversation et envoyez-la.</li>
    <li>Claude répond par un petit bloc de texte entre accolades { }. Copiez-le en entier.</li>
    <li>Collez-le ci-dessous, puis touchez « Ajouter ce lecteur ».</li>
    <li>Réimportez le relevé : les opérations sont lues. Les relevés suivants de cette banque le seront aussi, automatiquement.</li>
  </ol>
  <p class="note">Si le résultat n’est pas bon, dites-le simplement à Claude dans la même conversation (« il manque les crédits », « les montants sont faux ») et recommencez l’étape 4 avec sa nouvelle réponse.</p>
  <textarea id="readerIn" class="anon" style="min-height:120px" placeholder='Collez ici la réponse de Claude, qui commence par { et finit par }'></textarea>
  <div class="btn-row" style="align-items:center;margin-bottom:10px"><button class="btn" data-act="addreader">Ajouter ce lecteur</button></div>
  ${readerMsg?`<p class="count ${readerErr?'danger':''}" style="color:${readerErr?'':'var(--gold)'}">${esc(readerMsg)}</p>`:''}
  ${(S.readers||[]).map((r,i)=>`<div class="rule"><span>${esc(r.nom)}</span><span style="font-size:12.5px;color:var(--muted)">lecteur personnalisé</span><button class="link" data-delreader="${i}">Supprimer</button></div>`).join('')}
  </section>
  <section class="block"><h3 class="sec">Revenus</h3>
  <p class="lead">Choisissez sur votre Mac le fichier où vous suivez vos revenus, au format Excel, Numbers ou CSV. Vous indiquez les colonnes à lire, l’application fait le reste.</p>
  ${revMsg?`<p class="ok">${esc(revMsg)}</p>`:''}
  ${revError?`<p class="count danger">${esc(revError)}</p>`:''}
  ${revDraft?revPanel():`<label class="drop" data-drop="rev"><input type="file" id="revfile" accept=".xlsx,.xls,.numbers,.ods,.csv">
    <p>Choisir mon fichier de revenus</p><span>${nRev?`${nRev} revenu${nRev>1?'s':''} déjà importé${nRev>1?'s':''}. Un nouveau fichier les remplace, pour rester à jour.`:'Réimportez-le quand il change : il remplace la version précédente.'}</span></label>`}
  <div class="choice"><span>Compter les revenus depuis</span>
    <button data-inc="bank" aria-pressed="${S.incomeSource!=='file'}">mes relevés bancaires</button>
    <button data-inc="file" aria-pressed="${S.incomeSource==='file'}">mon fichier de revenus</button></div>
  <p class="note">Un seul des deux est compté, pour ne jamais additionner deux fois le même paiement reçu.</p></section>`;
}

