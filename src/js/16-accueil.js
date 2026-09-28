/* ============ Accueil ============ */
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const monthEnd=ym=>{const [y,m]=ym.split('-').map(Number);return ym+'-'+pad(new Date(y,m,0).getDate())};
const ymOf=p=>p.y+'-'+pad(p.m);
const moisDe=ym=>MOIS[+ym.slice(5,7)-1];
const couvert=ym=>lastOpDate()>=monthEnd(ym).slice(0,8)+pad(+monthEnd(ym).slice(8)-3);
const eurH=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:Math.abs(n-Math.round(n))<.005?0:2,maximumFractionDigits:2}).format(n);
const aDesDonnees=ym=>(BYMONTH[ym]||[]).some(o=>o.src!=='rev');
/* Rubriques perso variables : ni charge fixe, ni rubrique de l'activité */
const variable=cid=>{const c=catById(cid);return c&&c.type==='expense'&&!c.fixed&&c.univers!=='pro'&&!['remb'].includes(cid)};

/* « D'habitude » : moyenne des 3 mois précédents qui ont des données (au moins 2 mois requis) */
function habitude(cid,p){
  const v=[]; for(let i=1;i<=12&&v.length<3;i++){const q=shift(p,-i);if(aDesDonnees(ymOf(q)))v.push(Math.max(0,agg(q,'perso').by[cid]?.net||0))}
  return v.length>=2?v.reduce((a,b)=>a+b,0)/v.length:null;
}
/* Une rubrique dérape : +25 % et +30 € au-dessus d'habitude, ou au-dessus du budget s'il existe */
function derapage(cid,net,p){
  const c=catById(cid); if(!c||cid==='_pending') return null;
  if(c.budget>0) return net>c.budget?{txt:`${eur0(net-c.budget)} au-dessus de votre budget`,ecart:net-c.budget,pct:Math.round((net/c.budget-1)*100)}:null;
  const h=habitude(cid,p); if(!h) return null;
  if(net>h*1.25&&net-h>30) return {txt:`+${Math.round((net/h-1)*100)} % par rapport à d’habitude`,ecart:net-h,pct:Math.round((net/h-1)*100),h};
  return null;
}

/* ---------- Défi du mois ---------- */
const defiDe=ym=>S.challenges.find(c=>c.id==='auto'&&c.month===ym);
function depCat(cid,ym){const [y,m]=ym.split('-').map(Number);return agg({lvl:'M',y,m},'perso').by[cid]?.net||0}
function evalDefi(c){
  if(!c||c.id!=='auto') return null;
  const k=catById(c.cat), target=c.base*(1-c.pct), v=depCat(c.cat,c.month), fini=couvert(c.month);
  const status=!fini?'en cours':v<=target?'réussi':'manqué';
  return {name:k?k.name:'',month:c.month,status,v,target,economie:Math.max(0,c.base-v),trop:Math.max(0,v-target)};
}
function propositionDefi(p){
  const A=agg(p,'perso'), rows=Object.entries(A.by).filter(([cid,e])=>variable(cid)&&e.net>0);
  const der=rows.map(([cid,e])=>({cid,net:e.net,d:derapage(cid,e.net,p)})).filter(x=>x.d).sort((a,b)=>b.d.ecart-a.d.ecart)[0];
  const x=der||rows.map(([cid,e])=>({cid,net:e.net})).sort((a,b)=>b.net-a.net)[0];
  if(!x||x.net<40) return null;
  const nx=shift(p,1), nom=catById(x.cid).name.toLowerCase(), eco=x.net*.25;
  const debut=der&&catById(x.cid).budget>0?`Vos dépenses en ${nom} ont dépassé votre budget.`:der?`Vos dépenses en ${nom} ont augmenté de ${der.d.pct} %.`:`Les ${nom} sont votre plus grosse dépense variable : ${eur0(x.net)} ce mois-ci.`;
  return {cat:x.cid,pct:.25,base:x.net,month:ymOf(nx),texte:`${debut} Essayez d’en dépenser un quart de moins en ${MOIS[nx.m-1]} : ${eur0(eco)} d’économie.`};
}
function blocDefi(){
  const ym=ymOf(P), cur=evalDefi(defiDe(ym)), nx=shift(P,1), nym=ymOf(nx), nxt=defiDe(nym);
  const dernier=ym>=lastOpDate().slice(0,7);
  let h='';
  if(cur){const nom=cur.name.toLowerCase();
    h+=cur.status==='réussi'?`<p class="d-res ok">Défi réussi, vous avez économisé ${eur0(cur.economie)}.</p><p class="aide">Objectif : ${eur0(cur.target)} au plus en ${nom}. Dépensé : ${eur0(cur.v)}.</p>`
      :cur.status==='manqué'?`<p class="d-res">${cur.trop<=Math.max(15,cur.target*.25)?`Presque ! ${eur0(cur.trop)} de trop.`:`Pas cette fois : ${eur0(cur.trop)} de trop.`}</p><p class="aide">Objectif : ${eur0(cur.target)} au plus en ${nom}. Dépensé : ${eur0(cur.v)}.</p>`
      :`<p class="d-res">Défi en cours : ${eur0(cur.v)} dépensés en ${nom}, pour ${eur0(cur.target)} au plus.</p><p class="aide">Le résultat s’affichera quand le relevé de ${MOIS[P.m-1]} sera complet.</p>`}
  if(dernier){
    if(nxt){const k=catById(nxt.cat);h+=`<p class="d-t${cur?' sep':''}">Défi accepté pour ${MOIS[nx.m-1]} : dépenser au plus ${eur0(nxt.base*(1-nxt.pct))} en ${esc((k?k.name:'').toLowerCase())}.</p><p class="aide">Le résultat s’affichera avec votre relevé de ${MOIS[nx.m-1]}. <button class="lien" data-undefi="${nxt.key}">Annuler le défi</button></p>`}
    else{const pr=propositionDefi(P);if(pr)h+=`<p class="d-t${cur?' sep':''}">${esc(pr.texte)}</p><button class="btn" data-defiok="${pr.cat}" data-base="${pr.base.toFixed(2)}" data-month="${pr.month}">Je relève le défi</button>`}
  }
  return h?`<section class="carte defi"><h3><i data-lucide="target"></i>Défi du mois</h3>${h}</section>`:'';
}

/* ---------- Conseils : deux au plus, par ordre d'importance ---------- */
function conseils(){
  const out=[], X=agg(P,'pro'), st=stats(P,'all');
  if(st.autonomie!=null&&st.autonomie<1) out.push({lvl:'ko',t:'Votre réserve couvre moins d’un mois de dépenses.',go:'data-tab="reglages" data-ancre="reserve"'});
  const tr=tresoPro(), du=resteAProvisionner();
  if(tr&&tr.t!=null&&du.du>0&&tr.t<du.du) out.push({lvl:'ko',t:`Votre compte pro ne contient pas assez pour ce qui doit être mis de côté : il manque ${eur0(du.du-tr.t)}.`,go:'data-tab="reglages" data-ancre="avances"'});
  if(X.provision>0) out.push({lvl:'',t:`Pensez à mettre ${eur0(X.provision)} de côté ce mois-ci.`,go:'data-scroll="activite"'});
  const n=nbAVerifier(); if(n) out.push({lvl:'',t:`${n} opération${n>1?'s':''} à vérifier.`,go:'data-tab="operations"'});
  const w=waitingReturns().filter(o=>(Date.now()-new Date(o.date))/864e5>30);
  if(w.length) out.push({lvl:'',t:`${w.length>1?`${w.length} remboursements attendus`:'Un remboursement attendu'} depuis plus de 30 jours : ${eur0(-w.reduce((s,o)=>s+o.amount,0))}.`,go:`data-op="${w[0].id}"`});
  if(!demo&&S.ops.length){const j=Math.floor((Date.now()-(S.lastBackup||S.since||Date.now()))/864e5);if(j>=30)out.push({lvl:'',t:'Pensez à sauvegarder vos données.',go:'data-tab="reglages" data-ancre="donnees"'})}
  if(st.autonomie==null&&!(+S.settings.epargne)) out.push({lvl:'',t:'Indiquez votre épargne pour savoir combien de temps votre réserve vous tient.',go:'data-tab="reglages" data-ancre="reserve"'});
  return out.slice(0,2);
}

/* ---------- Page d'accueil ---------- */
function vAccueil(){
  const X=agg(P,'pro'), Pe=agg(P,'perso'), part=moisPartiel(P), V=netVise(), H=heures();
  const lignes=Object.entries(Pe.by).filter(([,e])=>e.net>0.005).sort((a,b)=>b[1].net-a[1].net), max=Math.max(1,...lignes.map(([,e])=>e.net));
  const cs=conseils(), revue=(P.m===12||P.m===1)&&S.ops.some(o=>o.date.startsWith((P.m===12?P.y:P.y-1)+'-'));
  let gagne='';
  if(X.any){const n=X.revenuNet, d=n-V, t=n/H;
    gagne=`<section class="carte gagne"><h3>Ce que vous avez gagné ${P.m===new Date().getMonth()+1&&P.y===new Date().getFullYear()?'ce mois-ci':'en '+MOIS[P.m-1]}</h3>
      <p class="grand-chiffre">${signed(n)}</p>
      <p class="etiquette ${d>=0?'ok':'ko'}">${d>=0?`${eur0(d)} de plus que votre objectif de ${eur0(V)}`:`Il manque ${eur0(-d)} pour atteindre votre objectif de ${eur0(V)}`}</p>
      <p class="phrase${t<tauxCible()?' rouge':''}">${n>0?`Une heure de travail vous a rapporté ${eurH(t)}.`:'Ce mois-ci, votre activité ne vous a rien rapporté.'}</p>
      ${part?`<p class="aide">Votre dernier relevé s’arrête au ${part} ${MOIS[P.m-1]}.</p>`:''}</section>
    <section class="carte" id="activite"><h3>Mon activité</h3>
      <div class="ligne"><span>Encaissé</span><b>${eur0(X.ca)}</b></div>
      <div class="ligne"><span>Frais de l’activité</span><b>${eur0(X.fraisExpl)}</b></div>
      <div class="ligne"><span>À mettre de côté</span><b>${eur0(X.provision)}</b></div>
      ${+S.settings.taux?'':`<p class="aide">Indiquez le pourcentage à mettre de côté dans les <button class="lien" data-tab="reglages" data-ancre="objectif">réglages</button>.</p>`}
      <div class="ligne total"><span>Il vous reste</span><b>${signed(X.revenuNet)}</b></div></section>`}
  else if(Pe.any) gagne=`<section class="carte"><h3>Ce que vous avez gagné</h3><p class="aide">Aucun encaissement de votre activité ce mois-ci.${S.accounts.some(a=>a.type!=='perso')?'':' Indiquez dans les réglages quel compte sert à votre activité.'}</p></section>`;
  const q=S.accounts.filter(a=>!a.confirmed);
  return (q.length?`<section class="carte verifier">${q.map(acctAsk).join('')}</section>`:'')+moisBar()+(!X.any&&!Pe.any?`<p class="aide centre">Aucune opération ce mois-ci.</p>`:'')+gagne+`
  ${Pe.any?`<section class="carte argent"><h3>Où part votre argent</h3>
    <p class="phrase">${eur0(Pe.net)} dépensés côté perso</p>
    <div class="rubriques">${lignes.map(([cid,e])=>{const c=catById(cid), pend=cid==='_pending', d=pend?null:derapage(cid,e.net,P), open=openCat===cid;
      return `<button class="rub${d?' derape':''}" data-cat="${cid}" aria-expanded="${open}"><i data-lucide="${pend?'circle-help':c?.icon||'circle'}"></i>
        <span class="rub-nom">${esc(pend?'À vérifier':c?.name||cid)}${d?`<span class="rub-mention">${esc(d.txt)}</span>`:''}</span>
        <span class="rub-amt">${eur0(e.net)}</span><span class="barre"><span style="width:${Math.max(1.5,e.net/max*100)}%"></span></span></button>
        ${open?`<div class="rub-ops">${e.ops.slice().sort((a,b)=>a.date<b.date?1:-1).map(opLine).join('')}</div>`:''}`}).join('')}</div></section>`:''}
  ${blocDefi()}
  ${cs.length?`<section class="conseils">${cs.map(c=>`<button class="conseil ${c.lvl}" ${c.go}><i data-lucide="${c.lvl==='ko'?'triangle-alert':'lightbulb'}"></i><span>${esc(c.t)}</span><i data-lucide="chevron-right"></i></button>`).join('')}</section>`:''}
  ${revue?`<button class="carte revue" data-act="review" data-year="${P.m===12?P.y:P.y-1}"><span><span class="r-t">Votre année ${P.m===12?P.y:P.y-1} en revue</span><span class="aide">Vos meilleurs et vos pires moments, en quelques écrans.</span></span><i data-lucide="sparkles"></i></button>`:''}`;
}
