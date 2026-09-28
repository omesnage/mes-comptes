/* ============ Synthèses : vue d'ensemble, pro, perso ============ */
function alertFor(cid,net,months,U){
  const c=catById(cid);
  if(c&&c.budget>0){const b=c.budget*months; if(net>b) return ['🔥',`budget dépassé de ${eur0(net-b)}`]; if(net>b*.9) return ['⚠️','budget presque atteint']; return null}
  let sum=0,k=0; for(let i=1;i<=3;i++){const a=agg(shift(P,-i),U); if(a.any){sum+=(a.by[cid]?.net||0);k++}}
  if(!k||net<=0) return null; const avg=sum/k; if(avg<20) return null;
  const r=net/avg;
  if(r>1.5) return ['🔥',`+${Math.round((r-1)*100)} % sur la moyenne`];
  if(r>1.15) return ['⚠️',`+${Math.round((r-1)*100)} % sur la moyenne`];
  if(r<.8) return ['🎉',`${Math.round((r-1)*100)} % sous la moyenne`];
  return null;
}
/* Barres mensuelles : dépenses (perso, vue d'ensemble) ou chiffre d'affaires (pro) */
function trend(U,metric,label){
  metric=metric||(a=>a.net); let pts=[];
  if(P.lvl==='M'){for(let i=5;i>=0;i--){const p={lvl:'M',...shift(P,-i)};pts.push({l:MOIS[p.m-1].slice(0,3)+'.',v:metric(agg(p,U)),cur:i===0})}}
  else{const [a]=bounds(P);const y=+a.slice(0,4),m0=+a.slice(5,7);const n=P.lvl==='Q'?3:12;for(let i=0;i<n;i++){const p={lvl:'M',y,m:m0+i};pts.push({l:MOIS[p.m-1].slice(0,P.lvl==='Y'?1:3)+(P.lvl==='Y'?'':'.'),v:metric(agg(p,U)),cur:false})}}
  const max=Math.max(1,...pts.map(p=>p.v)); const W=600,H=160,bh=118,gap=W/pts.length,bw=Math.min(46,gap*.42);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label||'Évolution des dépenses')}">
  <line x1="0" x2="${W}" y1="${bh}" y2="${bh}" stroke="var(--line)"/>
  ${pts.map((p,i)=>{const h=Math.max(p.v>0?2:0,p.v/max*(bh-18));const x=i*gap+gap/2;return `
    <rect x="${x-bw/2}" y="${bh-h}" width="${bw}" height="${h}" fill="${p.cur?'var(--gold)':'var(--ink)'}" opacity="${p.cur?1:.82}"/>
    ${p.v>0&&pts.length<=6?`<text x="${x}" y="${bh-h-7}" text-anchor="middle" font-size="17" fill="var(--muted)" font-family="Jost, sans-serif">${esc(eur0(p.v))}</text>`:''}
    <text x="${x}" y="${bh+22}" text-anchor="middle" font-size="18" fill="var(--muted)" font-family="Jost, sans-serif">${esc(p.l)}</text>`}).join('')}
  </svg>`;
}
function donut(rows,title){
  const pos=rows.filter(([,e])=>e.net>0); const sum=pos.reduce((s,[,e])=>s+e.net,0);
  if(!pos.length||sum<=0) return '';
  let items=pos.map(([cid,e])=>({cid,v:e.net,name:cid==='_pending'?'À classer':(catById(cid)?.name||cid)}));
  if(items.length>7){const rest=items.slice(6);items=items.slice(0,6);items.push({cid:null,v:rest.reduce((s,x)=>s+x.v,0),name:`Autres postes (${rest.length})`})}
  const COLS=[['var(--gold)',1],['var(--ink)',1],['var(--gold)',.62],['var(--ink)',.55],['var(--gold)',.34],['var(--ink)',.28],['var(--muted)',.35]];
  const R=80,C=2*Math.PI*R,GAP=items.length>1?2.2:0; let off=0;
  const arcs=items.map((x,i)=>{const len=x.v/sum*C;const [col,op]=COLS[i%COLS.length];
    const s=`<circle ${x.cid?`data-cat="${x.cid}"`:''} cx="100" cy="100" r="${R}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="12" stroke-dasharray="${Math.max(0.5,len-GAP)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${esc(x.name)}</title></circle>`;
    off+=len; return s}).join('');
  return `<h3 class="sec">${title||'Répartition des postes'}</h3>
  <div class="split">
    <svg viewBox="0 0 200 200" role="img" aria-label="Répartition par poste">
      ${arcs}
      <text x="100" y="100" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="34" fill="var(--ink)">${Math.round(items[0].v/sum*100)} %</text>
      <text x="100" y="121" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="var(--muted)">${esc(items[0].name.length>22?items[0].name.split(' ')[0]:items[0].name)}</text>
    </svg>
    <div class="legend">${items.map((x,i)=>{const [col,op]=COLS[i%COLS.length];return `<button ${x.cid?`data-cat="${x.cid}"`:'disabled'}><i style="background:${col};opacity:${op}"></i><span>${esc(x.name)}</span><span class="pc">${Math.round(x.v/sum*100)} %</span><span class="am">${eur0(x.v)}</span></button>`}).join('')}</div>
  </div>`;
}
function catList(rows,A,U){
  const max=Math.max(1,...rows.map(([,e])=>e.net));
  return `<div class="cats">${rows.length?rows.map(([cid,e])=>{
    const c=catById(cid), pend=cid==='_pending';
    const al=pend?null:alertFor(cid,e.net,A.months,U);
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
      ${open?`<div class="cat-ops">${e.ops.slice().sort((a,b)=>a.date<b.date?1:-1).map(opRow).join('')}</div>`:''}
    </div>`}).join(''):`<div class="empty" style="padding:30px 0">Rien à afficher sur cette période.</div>`}</div>`;
}
const INC_NAME={remu:'Rémunération reçue de votre compte pro'};
function incList(A,U,title){
  const ir=Object.entries(A.inc).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]); if(!ir.length) return '';
  return `<h3 class="sec" style="margin-top:46px">${title||'Rentrées'}</h3><div class="cats">${ir.map(([cid,v])=>{const c=catById(cid);
    const name=INC_NAME[cid]||(cid==='revenus'&&U==='pro'?'Chiffre d’affaires':c?.name||cid);
    return `<div class="cat"><div class="cat-row" style="cursor:default">
      <i data-lucide="${c?.icon||'circle'}"></i><div><div class="cat-name">${esc(name)}</div>${cid==='revenus'&&S.incomeSource==='file'?'<div class="cat-meta">depuis votre fichier de revenus</div>':cid==='remu'?'<div class="cat-meta">virements de votre compte pro vers votre compte perso</div>':''}</div>
      <div class="cat-amt" style="color:var(--gold)">${v<0?'−':'+'}${eur0(Math.abs(v))}</div></div></div>`}).join('')}</div>`;
}
function bigAmount(n){const eurs=Math.floor(Math.abs(n)), cts=Math.round((Math.abs(n)-eurs)*100);
  return `<div class="big">${n<0?'−':''}${new Intl.NumberFormat('fr-FR').format(eurs)} €<span class="cts">${pad(cts===100?0:cts)}</span></div>`}
const signed=n=>(n<0?'−':'')+eur0(Math.abs(n));
function cmpLine(a,b,any,up){ /* up : true si une hausse est une bonne nouvelle */
  if(!any||!b) return '';
  const d=a-b, pc=Math.round(d/Math.abs(b)*100), good=up?pc>=10:pc<=-10, bad=up?pc<=-25:pc>=25;
  return `<strong>${d>=0?'+':'−'}${eur0(Math.abs(d))}</strong> (${pc>=0?'+':''}${pc} %) par rapport ${prevLabel(P)}${good?' 🎉':bad?' ⚠️':''}`;
}
function retenirBox(ret){return ret.length?`<div class="retenir" aria-label="À retenir">${ret.map(x=>`<button data-tab="${x.go}"><span class="e" aria-hidden="true">${x.e||'<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--gold);vertical-align:middle;margin-left:4px"></span>'}</span><span>${esc(x.t)}</span><i data-lucide="chevron-right"></i></button>`).join('')}</div>`:''}
function askAccounts(){return S.accounts.filter(a=>!a.confirmed).map(a=>acctAsk(a,false)).join('')}
function sortRows(by){return Object.entries(by).filter(([,e])=>e.spent||e.ref).sort((a,b)=>b[1].net-a[1].net)}

function vSynth(){return askAccounts()+periodBar()+({pro:vSynthPro,perso:vSynthPerso}[UNIV]||vSynthAll)()}

function vSynthPerso(){
  const A=agg(P,'perso'), B=agg(shift(P,-1),'perso');
  const rows=sortRows(A.by), solde=A.income-A.net;
  const st=stats(P,'perso'), ret=retenir(A,st,'perso');
  return `
  <section class="hero">
    ${bigAmount(A.net)}
    <div class="hero-sub">${A.any?'Dépenses personnelles de la période, remboursements déduits.':'Aucune opération personnelle sur cette période.'}${B.net>0?'<br>'+cmpLine(A.net,B.net,B.any,false):''}</div>
  </section>
  <div class="trio">
    <div><span>Rentrées</span><b>${eur0(A.income)}</b></div>
    <div><span>Dépenses</span><b>${eur0(A.net)}</b></div>
    <div><span>Solde</span><b style="color:${solde<0?'var(--alert)':'inherit'}">${signed(solde)}</b></div>
  </div>
  ${retenirBox(ret)}
  ${P.lvl==='Y'&&A.any?reviewCard():''}
  ${donut(rows)}
  <div class="chart"><h3 class="sec">Évolution</h3>${trend('perso')}</div>
  <h3 class="sec">Par catégorie</h3>
  ${catList(rows,A,'perso')}
  ${incList(A,'perso')}`;
}

function vSynthPro(){
  const A=agg(P,'pro'), B=agg(shift(P,-1),'pro');
  if(!A.any&&!S.ops.some(o=>opUniv(o)==='pro')) return `<div class="empty"><p>Aucune opération professionnelle</p>
    <div class="lead" style="margin:0 auto 24px">Indiquez dans Réglages quel compte est professionnel. Si vous n’avez qu’un seul compte pour tout, choisissez « Pro et perso mélangés », puis rangez vos dépenses d’activité dans les rubriques pro.</div>
    <button class="btn" data-tab="regles">Ouvrir les réglages</button></div>`;
  const rows=sortRows(A.by), tx=+S.settings.taux||0, surRes=S.settings.assiette==='resultat';
  const tr=tresoPro(), du=resteAProvisionner();
  return `
  <section class="hero">
    ${bigAmount(A.revenuNet)}
    <div class="hero-sub">${A.any?'Revenu net de la période : le chiffre d’affaires, moins les frais professionnels, moins la provision pour les cotisations et les impôts.':'Aucune opération professionnelle sur cette période.'}${B.any?'<br>'+cmpLine(A.revenuNet,B.revenuNet,B.any,true):''}</div>
  </section>
  <div class="trio">
    <div><span>Chiffre d’affaires</span><b>${eur0(A.ca)}</b></div>
    <div><span>Frais pro</span><b>${eur0(A.fraisExpl)}</b></div>
    <div><span>Provision</span><b>${eur0(A.provision)}</b></div>
  </div>
  <section class="block"><h3 class="sec">Votre activité</h3>
    <div class="row"><span>Chiffre d’affaires encaissé</span><b>${eur0(A.ca)}</b></div>
    <div class="row"><span>Frais professionnels</span><b>−${eur0(A.fraisExpl)}</b><span class="sub">Hors cotisations et impôts, qui sont réglés avec la provision.</span></div>
    <div class="row"><span>Résultat</span><b>${signed(A.resultat)}</b></div>
    <div class="row"><span>Provision pour cotisations et impôts</span><b>−${eur0(A.provision)}</b><span class="sub">${tx?`${tx} % ${surRes?'du résultat':'du chiffre d’affaires'}.`:'Indiquez votre taux dans Réglages pour la calculer.'}${A.provPaid?` Payés sur la période : ${eur0(A.provPaid)}.`:''}</span></div>
    <div class="row total"><span>Revenu net</span><b style="color:${A.revenuNet<0?'var(--alert)':'inherit'}">${signed(A.revenuNet)}</b></div>
    ${hasPro()?`<div class="row"><span>Rémunération versée</span><b>${signed(A.remu)}</b><span class="sub">Les virements de votre compte pro vers votre compte perso. Ce n’est ni une dépense ni une rentrée : c’est votre salaire d’indépendant.</span></div>`:''}
  </section>
  ${tr?`<section class="block"><h3 class="sec">Trésorerie</h3>
    ${tr.t==null?`<p class="lead">Indiquez le solde de votre compte pro dans Réglages : l’application en déduit la trésorerie dont vous disposez vraiment, une fois la provision mise de côté.</p><button class="btn" data-tab="regles">Indiquer le solde</button>`:`
    <div class="row"><span>Solde estimé du compte pro</span><b>${signed(tr.t)}</b><span class="sub">Au ${dfmt(tr.date)}, d’après le dernier solde connu et les opérations suivantes.${tr.missing.length?` Solde inconnu pour : ${esc(tr.missing.join(', '))}.`:''}</span></div>
    <div class="row"><span>À garder pour les cotisations et impôts</span><b>−${eur0(du.du)}</b><span class="sub">Provision ${du.y} depuis janvier : ${eur0(du.cumul)}, dont ${eur0(du.paye)} déjà payés.</span></div>
    <div class="row total"><span>Trésorerie disponible</span><b style="color:${tr.t-du.du<0?'var(--alert)':'inherit'}">${signed(tr.t-du.du)}</b></div>`}
  </section>`:''}
  ${donut(rows,'Répartition des frais')}
  <div class="chart"><h3 class="sec">Chiffre d’affaires</h3>${trend('pro',a=>a.ca,'Évolution du chiffre d’affaires')}</div>
  <h3 class="sec">Frais par poste</h3>
  ${catList(rows,A,'pro')}
  ${incList(A,'pro','Encaissements')}`;
}

function vSynthAll(){
  const A=agg(P,'all'), B=agg(shift(P,-1),'all'), Pr=agg(P,'pro'), Pe=agg(P,'perso');
  const rows=sortRows(A.by), solde=A.income-A.net, soldeB=B.income-B.net;
  const st=stats(P,'all'), ret=retenir(A,st,'all');
  return `
  <section class="hero">
    ${bigAmount(solde)}
    <div class="hero-sub">${A.any?'Ce qui vous reste sur la période : tout ce qui est entré, moins tout ce qui est sorti, pro et perso réunis. Les virements entre vos comptes ne comptent pas.':'Aucune opération sur cette période.'}${B.any?'<br>'+cmpLine(solde,soldeB,B.any,true):''}</div>
  </section>
  <div class="trio">
    <div><span>Entrées</span><b>${eur0(A.income)}</b></div>
    <div><span>Sorties</span><b>${eur0(A.net)}</b></div>
    <div><span>Provision</span><b>${eur0(A.provision)}</b></div>
  </div>
  <div class="duo">
    <button class="duo-card" data-univ="pro"><span class="duo-t">Côté pro</span>
      <span class="duo-r"><span>Chiffre d’affaires</span><b>${eur0(Pr.ca)}</b></span>
      <span class="duo-r"><span>Frais</span><b>${eur0(Pr.fraisExpl)}</b></span>
      <span class="duo-r"><span>Revenu net</span><b>${signed(Pr.revenuNet)}</b></span>
      <span class="duo-go">Voir le détail pro <i data-lucide="chevron-right"></i></span></button>
    <button class="duo-card" data-univ="perso"><span class="duo-t">Côté perso</span>
      <span class="duo-r"><span>Rentrées</span><b>${eur0(Pe.income)}</b></span>
      <span class="duo-r"><span>Dépenses</span><b>${eur0(Pe.net)}</b></span>
      <span class="duo-r"><span>Solde</span><b>${signed(Pe.income-Pe.net)}</b></span>
      <span class="duo-go">Voir le détail perso <i data-lucide="chevron-right"></i></span></button>
  </div>
  ${retenirBox(ret)}
  ${P.lvl==='Y'&&A.any?reviewCard():''}
  ${donut(rows)}
  <div class="chart"><h3 class="sec">Évolution des sorties</h3>${trend('all')}</div>
  <h3 class="sec">Par catégorie</h3>
  ${catList(rows,A,'all')}
  ${incList(A,'all','Entrées')}`;
}
function reviewCard(){return `<button class="wrapped-card" data-act="review"><span><span class="t">Votre année ${P.y} en revue</span><br><span class="s">Vos meilleurs et vos pires moments, en quelques écrans.</span></span><i data-lucide="sparkles"></i></button>`}
