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

/* ---------- Défi du mois : deux blocs, le mois précédent (résultat) et le mois en cours ---------- */
const defiDe=ym=>S.challenges.find(c=>c.id==='auto'&&c.month===ym);
const moisCourant=()=>{const d=new Date();return {lvl:'M',y:d.getFullYear(),m:d.getMonth()+1}};
const dizaine=n=>Math.max(10,Math.round(n/10)*10);
function depCat(cid,ym){const [y,m]=ym.split('-').map(Number);return agg({lvl:'M',y,m},'perso').by[cid]?.net||0}
/* Limite du défi : fixée à l'acceptation ; les anciens défis la déduisent de leur base */
const limiteDe=c=>c.limite!=null?+c.limite:+c.base*(1-(c.pct||0));
function evalDefi(c){
  if(!c||c.id!=='auto') return null;
  const k=catById(c.cat), limite=limiteDe(c), v=depCat(c.cat,c.month), fini=couvert(c.month);
  const status=!fini?'en cours':v<=limite+0.005?'réussi':'manqué';
  return {name:k?k.name:'',month:c.month,status,v,limite,marge:Math.max(0,limite-v),trop:Math.max(0,v-limite),economie:Math.max(0,(c.habitude||c.base||limite)-v)};
}
/* Proposition pour un mois : la rubrique variable la plus lourde d'habitude ; limite = habitude × 0,75, arrondie à la dizaine */
function propositionDefi(ym){
  const p={lvl:'M',y:+ym.slice(0,4),m:+ym.slice(5,7)};
  const cs=S.categories.filter(c=>variable(c.id)).map(c=>({cid:c.id,h:habitude(c.id,p)})).filter(x=>x.h&&x.h>=40).sort((a,b)=>b.h-a.h);
  if(!cs.length) return null;
  const x=cs[0]; return {cat:x.cid,hab:x.h,limite:dizaine(x.h*.75),month:ym};
}
function blocsDefi(){
  if(ymOf(P)<lastOpDate().slice(0,7)) return '';
  const cur=moisCourant(), prev=shift(cur,-1), cym=ymOf(cur), pym=ymOf(prev), nomC=MOIS[cur.m-1], nomP=MOIS[prev.m-1];
  let h='';
  const r=evalDefi(defiDe(pym));
  if(r){
    const phrase=`${esc(r.name)} : vous vous étiez fixé ${eur0(r.limite)} maximum, vous avez dépensé ${eur0(r.v)}`;
    h+=`<section class="carte defi"><h3><i data-lucide="flag"></i>Défi ${/^[aeiou]/.test(nomP)?'d’':'de '}${nomP}</h3>
      ${r.status==='réussi'?`<p class="d-res ok">Réussi ✓</p><p class="phrase">${phrase}.${r.marge>=1?` ${eur0(r.marge)} de marge.`:''}</p>`
       :r.status==='manqué'?`<p class="d-res presque">Pas tout à fait</p><p class="phrase">${phrase}, soit ${eur0(r.trop)} de trop.</p>`
       :`<p class="phrase">${esc(r.name)} : ${eur0(r.v)} dépensés pour l’instant, sur ${eur0(r.limite)} maximum.</p><p class="aide">Le résultat s’affichera avec votre relevé complet de ${nomP}.</p>`}</section>`;
  }
  const c=defiDe(cym);
  if(c){const e=evalDefi(c), k=catById(c.cat), pc=e.limite>0?Math.min(100,e.v/e.limite*100):0;
    h+=`<section class="carte defi"><h3><i data-lucide="target"></i>Défi pour ${nomC}</h3>
      <p class="phrase">${esc(k?k.name:'')} : ne pas dépasser ${eur0(e.limite)} ce mois-ci.</p>
      <p class="d-prog">${eur0(e.v)} dépensés sur ${eur0(e.limite)}</p><div class="barre-defi${e.v>e.limite?' trop':''}"><span style="width:${pc}%"></span></div>
      ${aDesDonnees(cym)?'':`<p class="aide">Vos dépenses de ${nomC} apparaîtront quand vous ajouterez ce relevé.</p>`}
      <button class="lien" data-undefi="${c.key}">Annuler le défi</button></section>`}
  else{const pr=propositionDefi(cym);
    if(pr){const k=catById(pr.cat);h+=`<section class="carte defi"><h3><i data-lucide="target"></i>Défi pour ${nomC}</h3>
      <p class="phrase">${esc(k.name)} : ne pas dépasser ${eur0(pr.limite)} ce mois-ci. D’habitude, vous dépensez environ ${eur0(dizaine(pr.hab))}.</p>
      <button class="btn" data-defiok="${pr.cat}" data-limite="${pr.limite}" data-hab="${pr.hab.toFixed(2)}" data-month="${cym}">Je relève le défi</button></section>`}}
  return h;
}

/* ---------- Budgets de l'année ---------- */
function blocBudgets(){
  const cs=S.categories.filter(c=>c.budgetAn>0&&c.type==='expense');
  if(!cs.length){const v=catById('voyages');return v?`<section class="carte budgets-propose"><h3><i data-lucide="luggage"></i>Fixez-vous un budget vacances pour l’année</h3>
    <p class="aide">Un budget pour l’année vous montre, mois après mois, si vous êtes dans les clous.</p>
    <div class="ajout-budget"><label class="champ">Budget vacances pour l’année (€)<input id="budgetAnRapide" type="number" inputmode="numeric" min="0" step="50" placeholder="2000"></label>
    <button class="btn" data-budgetan="voyages">Enregistrer</button></div>
    <button class="lien" data-tab="reglages" data-ancre="rubriques">Fixer d’autres budgets dans les réglages</button></section>`:''}
  return `<section class="carte budgets"><h3>Vos budgets de l’année</h3>${cs.map(c=>{
    let dep=0; for(let m=1;m<=P.m;m++) dep+=agg({lvl:'M',y:P.y,m},'perso').by[c.id]?.net||0;
    const b=c.budgetAn, prorata=b*P.m/12, etat=dep>b?'rouge':dep>prorata+0.005?'orange':'or';
    return `<div class="budget-an ${etat}"><p class="phrase">${esc(c.name)} : ${eur0(dep)} dépensés sur ${eur0(b)} prévus cette année.${dep<=b?` Il vous reste ${eur0(b-dep)}.`:''}</p>
      <div class="barre-an"><span style="width:${Math.min(100,dep/b*100)}%"></span><em style="left:${Math.min(100,P.m/12*100)}%" title="Prorata des mois écoulés"></em></div>
      ${etat==='rouge'?`<p class="ba-msg">Budget dépassé de ${eur0(dep-b)}</p>`:etat==='orange'?'<p class="ba-msg">Vous dépensez plus vite que prévu</p>':''}</div>`}).join('')}</section>`;
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
  const lignes=Object.entries(Pe.by).filter(([,e])=>e.net>0.005||e.surplus>0.005).sort((a,b)=>b[1].net-a[1].net), max=Math.max(1,...lignes.map(([,e])=>e.net));
  const cs=conseils(), revue=(P.m===12||P.m===1)&&S.ops.some(o=>o.date.startsWith((P.m===12?P.y:P.y-1)+'-'));
  let gagne='';
  if(X.any){const n=X.revenuNet, d=n-V, t=n/H;
    gagne=`<section class="carte gagne"><h3>Ce que vous avez gagné ${P.m===new Date().getMonth()+1&&P.y===new Date().getFullYear()?'ce mois-ci':'en '+MOIS[P.m-1]}</h3>
      <p class="grand-chiffre">${signed(n)}</p>
      <p class="etiquette ${d>=0?'ok':'ko'}">${d>=0?`${eur0(d)} de plus que votre objectif de ${eur0(V)}`:`Il manque ${eur0(-d)} pour atteindre votre objectif de ${eur0(V)}`}</p>
      ${salaireBloc(P,'accueil')}
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
        <span class="rub-nom">${esc(pend?'À vérifier':c?.name||cid)}${d?`<span class="rub-mention">${esc(d.txt)}</span>`:''}${e.surplus>0.005?`<span class="rub-sous">dont ${eur0(e.ref)} de remboursements</span>`:''}</span>
        <span class="rub-amt">${eur0(e.net)}</span><span class="barre"><span style="width:${Math.max(1.5,e.net/max*100)}%"></span></span></button>
        ${open?`<div class="rub-ops">${e.ops.slice().sort((a,b)=>a.date<b.date?1:-1).map(opLine).join('')}</div>`:''}`}).join('')}</div>
    <button class="lien ajout-rub" data-act="nouvrub"><i data-lucide="plus"></i>Ajouter une rubrique</button></section>`:''}
  ${S.ops.length?blocBudgets():''}
  ${blocsDefi()}
  ${cs.length?`<section class="conseils">${cs.map(c=>`<button class="conseil ${c.lvl}" ${c.go}><i data-lucide="${c.lvl==='ko'?'triangle-alert':'lightbulb'}"></i><span>${esc(c.t)}</span><i data-lucide="chevron-right"></i></button>`).join('')}</section>`:''}
  ${revue?`<button class="carte revue" data-act="review" data-year="${P.m===12?P.y:P.y-1}"><span><span class="r-t">Votre année ${P.m===12?P.y:P.y-1} en revue</span><span class="aide">Vos meilleurs et vos pires moments, en quelques écrans.</span></span><i data-lucide="sparkles"></i></button>`:''}`;
}
