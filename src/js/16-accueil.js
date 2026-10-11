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
  if(c.limite&&c.limite.per==='M'&&c.limite.montant>0){const l=c.limite.montant;return net>l?{txt:`${eur0(net-l)} au-dessus de votre limite`,ecart:net-l,pct:Math.round((net/l-1)*100)}:null}
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
/* Propositions pour un mois : les plus grosses dépenses variables du mois dernier (jusqu'à 3, au moins 40 €).
   Vacances et cadeaux, trop occasionnels, sont laissés de côté. Limite = dépense du mois dernier × 0,75, arrondie à la dizaine.
   Sans relevé du mois dernier : la rubrique la plus lourde d'habitude. */
const OCCASIONNEL=new Set(['voyages','cadeaux']);
function propositionsDefi(ym){
  const p={lvl:'M',y:+ym.slice(0,4),m:+ym.slice(5,7)}, q=shift(p,-1), qym=ymOf(q);
  const ok=c=>variable(c.id)&&!OCCASIONNEL.has(c.id);
  if(aDesDonnees(qym)){
    const by=agg(q,'perso').by;
    return S.categories.filter(ok).map(c=>({cat:c.id,dernier:by[c.id]?.net||0})).filter(x=>x.dernier>=40).sort((a,b)=>b.dernier-a.dernier).slice(0,3)
      .map(x=>({...x,hab:x.dernier,limite:dizaine(x.dernier*.75),month:ym}));
  }
  const cs=S.categories.filter(ok).map(c=>({cid:c.id,h:habitude(c.id,p)})).filter(x=>x.h&&x.h>=40).sort((a,b)=>b.h-a.h);
  return cs.length?[{cat:cs[0].cid,hab:cs[0].h,limite:dizaine(cs[0].h*.75),month:ym}]:[];
}
const propositionDefi=ym=>propositionsDefi(ym)[0]||null;

/* ---------- Trophées : un par défi réussi ; paliers bronze, argent, or, platine ---------- */
const PALIERS=[[1,'bronze'],[3,'argent'],[6,'or'],[12,'platine']];
function trophees(){return S.challenges.filter(c=>c.id==='auto').map(c=>({c,e:evalDefi(c)})).filter(x=>x.e&&x.e.status==='réussi').sort((a,b)=>a.c.month<b.c.month?1:-1)}
function palier(n){let p=null;for(const [k,nom] of PALIERS) if(n>=k) p=nom;return p}
function prochainPalier(n){const x=PALIERS.find(([k])=>k>n);return x?{reste:x[0]-n,nom:x[1]}:null}
const deTrophee=nom=>'trophée '+(/^[aeiou]/.test(nom)?'d’':'de ')+nom;
function blocTrophees(){
  const t=trophees(), n=t.length, pal=palier(n), pro=prochainPalier(n), eco=t.reduce((s,x)=>s+x.e.economie,0);
  return `<section class="carte" id="trophees"><h3><i data-lucide="trophy"></i>Mes trophées</h3>
    ${n?`<p class="phrase">${n} défi${n>1?'s':''} réussi${n>1?'s':''}${pal?` : ${deTrophee(pal)}`:''}.${eco>=1?` ${eur0(eco)} dépensés en moins au total.`:''}</p>
      ${pro?`<p class="aide">Encore ${pro.reste} défi${pro.reste>1?'s':''} réussi${pro.reste>1?'s':''} pour le ${deTrophee(pro.nom)}.</p>`:''}
      <ul class="trophees">${t.map(({c,e})=>`<li><i data-lucide="trophy"></i><span><b>${esc(e.name)}</b> en ${moisDe(c.month)} ${c.month.slice(0,4)} : ${eur0(e.v)} dépensés sur ${eur0(e.limite)} maximum</span></li>`).join('')}</ul>`
     :`<p class="aide">Relevez un défi sur l’Accueil : chaque défi réussi vous rapporte un trophée. Bronze au premier, puis argent, or et platine.</p>`}</section>`;
}

function blocsDefi(){
  if(ymOf(P)<lastOpDate().slice(0,7)) return '';
  const cur=moisCourant(), prev=shift(cur,-1), cym=ymOf(cur), pym=ymOf(prev), nomC=MOIS[cur.m-1], nomP=MOIS[prev.m-1];
  let h='';
  const r=evalDefi(defiDe(pym));
  if(r){
    const phrase=`${esc(r.name)} : vous vous étiez fixé ${eur0(r.limite)} maximum, vous avez dépensé ${eur0(r.v)}`, n=trophees().length;
    h+=`<section class="carte defi"><h3><i data-lucide="flag"></i>Défi ${/^[aeiou]/.test(nomP)?'d’':'de '}${nomP}</h3>
      ${r.status==='réussi'?`<p class="d-res ok">Réussi ✓</p><p class="phrase">${phrase}.${r.marge>=1?` ${eur0(r.marge)} de marge.`:''}</p>
        <button class="trophee-gagne" data-tab="objectifs" data-ancre="trophees"><i data-lucide="trophy"></i><span>Trophée gagné ! Vous en avez ${n}.</span><i data-lucide="chevron-right"></i></button>`
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
  else{const prs=propositionsDefi(cym), dernier=aDesDonnees(pym);
    if(prs.length){h+=`<section class="carte defi"><h3><i data-lucide="target"></i>Défi pour ${nomC}</h3>
      ${prs.length>1?`<p class="aide">Vos plus grosses dépenses ${/^[aeiou]/.test(nomP)?'d’':'de '}${nomP}. Choisissez celle que vous voulez réduire :</p>`:''}
      ${prs.map(pr=>{const k=catById(pr.cat);return `<div class="defi-choix"><p class="phrase">${esc(k.name)} : ne pas dépasser ${eur0(pr.limite)} ce mois-ci. ${dernier?`En ${nomP}, vous avez dépensé ${eur0(pr.dernier)}.`:`D’habitude, vous dépensez environ ${eur0(dizaine(pr.hab))}.`}</p>
      <button class="btn${prs.length>1?' secondaire':''}" data-defiok="${pr.cat}" data-limite="${pr.limite}" data-hab="${pr.hab.toFixed(2)}" data-month="${cym}">${prs.length>1?'Je choisis ce défi':'Je relève le défi'}</button></div>`}).join('')}</section>`}}
  return h;
}

/* ---------- Limites de dépenses : par mois, par trimestre ou par an ---------- */
const PER_MOTS={M:'ce mois-ci',Q:'ce trimestre',Y:'cette année'};
/* État d'une limite pour le mois p : dépensé depuis le début de sa période, doré, orange ou rouge */
function etatLimite(c,p){
  const L=c&&c.limite; if(!L||!(+L.montant>0)) return null;
  const m0=L.per==='Y'?1:L.per==='Q'?(Math.ceil(p.m/3)-1)*3+1:p.m;
  let dep=0; for(let m=m0;m<=p.m;m++) dep+=agg({lvl:'M',y:p.y,m},'perso').by[c.id]?.net||0;
  const lim=+L.montant, frac=L.per==='Y'?p.m/12:L.per==='Q'?(p.m-m0+1)/3:1;
  const etat=dep>lim+0.005?'rouge':(L.per==='M'?dep>lim*.8:dep>lim*frac+0.005)?'orange':'or';
  return {dep,lim,frac,etat,per:L.per,mot:PER_MOTS[L.per],reste:Math.max(0,lim-dep),
    msg:etat==='rouge'?`Limite dépassée de ${eur0(dep-lim)}`:etat==='orange'?'Attention, vous approchez de votre limite':''};
}
const avecLimite=()=>S.categories.filter(c=>c.type==='expense'&&c.limite&&+c.limite.montant>0);
function barreLimite(e){return `<span class="barre-an ${e.etat}"><span style="width:${Math.min(100,e.dep/e.lim*100)}%"></span>${e.per!=='M'?`<em style="left:${Math.min(100,e.frac*100)}%" title="Temps écoulé"></em>`:''}</span>`}
function blocLimites(p){
  const cs=avecLimite();
  if(!cs.length) return `<section class="carte limites-propose"><h3><i data-lucide="gauge"></i>Fixez-vous des limites pour le shopping, les sorties ou les vacances</h3>
    <p class="aide">Une limite vous montre, au fil des semaines, si vous êtes dans les clous.</p>
    <button class="btn secondaire" data-tab="objectifs" data-ancre="limites">Fixer mes limites</button></section>`;
  return `<section class="carte budgets"><h3>Vos limites</h3>${cs.map(c=>{const e=etatLimite(c,p);
    return `<div class="budget-an ${e.etat}"><p class="phrase">${esc(c.name)} : ${eur0(e.dep)} sur ${eur0(e.lim)} ${e.mot}</p>${barreLimite(e)}
      ${e.msg?`<p class="ba-msg">${esc(e.msg)}</p>`:`<p class="aide">Il reste : ${eur0(e.reste)}.</p>`}</div>`}).join('')}</section>`;
}

/* ---------- Conseils : deux au plus, par ordre d'importance ---------- */
function conseils(){
  const out=[], X=agg(P,'pro'), st=stats(P,'all');
  for(const c of avecLimite()){const e=etatLimite(c,P);if(e&&e.etat==='rouge')out.push({lvl:'ko',t:`Limite dépassée pour ${c.name} : ${eur0(e.dep-e.lim)} de trop ${e.mot}.`,go:'data-tab="objectifs" data-ancre="limites"'})}
  if(st.autonomie!=null&&st.autonomie<1) out.push({lvl:'ko',t:'Votre réserve couvre moins d’un mois de dépenses.',go:'data-tab="reglages" data-ancre="reserve"'});
  const tr=tresoPro(), du=resteAProvisionner();
  if(tr&&tr.t!=null&&du.du>0&&tr.t<du.du) out.push({lvl:'ko',t:`Votre compte pro ne contient pas assez pour ce qui doit être mis de côté : il manque ${eur0(du.du-tr.t)}.`,go:'data-tab="reglages" data-ancre="avances"'});
  if(X.provision>0) out.push({lvl:'',t:`Pensez à garder ${eur0(X.provision)} de côté pour vos cotisations et impôts ce mois-ci.`,go:'data-scroll="activite"'});
  const w=waitingReturns().filter(o=>(Date.now()-new Date(o.date))/864e5>30);
  if(w.length) out.push({lvl:'',t:`${w.length>1?`${w.length} remboursements attendus`:'Un remboursement attendu'} depuis plus de 30 jours : ${eur0(-w.reduce((s,o)=>s+o.amount,0))}.`,go:`data-op="${w[0].id}"`});
  if(!demo&&S.ops.length){const j=Math.floor((Date.now()-(S.lastBackup||S.since||Date.now()))/864e5);if(j>=30)out.push({lvl:'',t:'Pensez à sauvegarder vos données.',go:'data-tab="reglages" data-ancre="donnees"'})}
  if(st.autonomie==null&&!(+S.settings.epargne)) out.push({lvl:'',t:'Indiquez votre épargne pour savoir combien de temps votre réserve vous tient.',go:'data-tab="reglages" data-ancre="reserve"'});
  return out.slice(0,2);
}

/* ---------- Page d'accueil ---------- */
/* Balance du mois : ce qui est entré (gagné par l'activité et autres rentrées) moins ce qui est parti côté perso.
   L'épargne et les virements entre comptes ne comptent ni d'un côté ni de l'autre. */
function balanceBloc(n,Pe,p){
  if(SAL) return balanceSalarie(Pe,p);
  const R=aggRaw(p), autres=R.perso.income, dep=Pe.net, b=n+autres-dep;
  const [a,z]=bounds(p); let ep=0; for(const k of monthKeys(a,z)) for(const o of (BYMONTH[k]||[])) if(catOf(o)==='epargne') ep-=o.amount;
  return `<div class="balance" id="balance">
    <div class="ligne"><span>Gagné par votre activité</span><b>${signed(n)}</b></div>
    ${autres>0.005?`<div class="ligne"><span>Autres rentrées</span><b>+${eur0(autres)}</b></div>`:''}
    <div class="ligne"><span>Ce que vous avez dépensé</span><b>${dep>0.005?'−'+eur0(dep):eur0(0)}</b></div>
    <div class="ligne total ${b>=0?'ok':'ko'}"><span>Balance ${TERME_PER[p.lvl]}</span><b>${signed(b)}</b></div>
    <p class="aide">${b>=0?`Vous avez dépensé moins que ce qui est entré : ${eur0(b)} de côté.`:`Vous avez dépensé ${eur0(-b)} de plus que ce qui est entré.`}${ep>0.005?` À part, ${eur0(ep)} versés sur votre épargne.`:ep<-0.005?` À part, ${eur0(-ep)} repris sur votre épargne.`:''}</p></div>`;
}
/* Salarié : ce qui est entré (salaire et autres rentrées), ce qui est parti, la balance de la période */
function balanceSalarie(Pe,p){
  const R=aggRaw(p), recu=R.perso.income, dep=Pe.net, b=recu-dep;
  const [a,z]=bounds(p); let ep=0; for(const k of monthKeys(a,z)) for(const o of (BYMONTH[k]||[])) if(catOf(o)==='epargne') ep-=o.amount;
  return `<div class="balance" id="balance">
    <div class="ligne"><span>Ce que vous avez reçu</span><b>+${eur0(recu)}</b></div>
    <div class="ligne"><span>Ce que vous avez dépensé</span><b>${dep>0.005?'−'+eur0(dep):eur0(0)}</b></div>
    <div class="ligne total ${b>=0?'ok':'ko'}"><span>Balance ${TERME_PER[p.lvl]}</span><b>${signed(b)}</b></div>
    <p class="aide">${b>=0?`Vous avez dépensé moins que ce qui est entré : ${eur0(b)} de côté.`:`Vous avez dépensé ${eur0(-b)} de plus que ce qui est entré.`}${ep>0.005?` À part, ${eur0(ep)} versés sur votre épargne.`:ep<-0.005?` À part, ${eur0(-ep)} repris sur votre épargne.`:''}</p></div>`;
}
/* Ce qui est classé : une phrase rassurante, et ce qu'il reste à faire s'il reste des questions */
function lienAide(){return `<p class="lien-aide"><button class="lien" data-tab="aide"><i data-lucide="circle-help"></i>Comment ça marche ? Voir le mode d’emploi</button></p>`}
function blocClassement(PA){
  const pc=partClassee(PA), nq=pendingGroups().length; if(!pc&&!nq) return '';
  const min=Math.max(1,Math.ceil(nq/2));
  return `<section class="carte classement">${pc?`<p class="phrase">Vos dépenses sont classées à ${pc.classe} %.${pc.devine>=5?` ${pc.devine} % sont des suppositions, à vérifier si vous voulez.`:''}</p>`:''}
    ${nq?`<p class="aide">${nq} marchand${nq>1?'s':''} à classer (${min} minute${min>1?'s':''}).</p><button class="btn" data-tab="operations">Classer maintenant</button>`:''}</section>`;
}
/* Période affichée sur l'Accueil : mois, trimestre ou année (le mois P sert de repère) */
let AL='M';
const TERME_PER={M:'du mois',Q:'du trimestre',Y:'de l’année'};
function periodeBarAccueil(PA){
  const lvl=[['M','Mois'],['Q','Trimestre'],['Y','Année']];
  return `<div class="seg" role="group" aria-label="Période">${lvl.map(([k,l])=>`<button data-alvl="${k}" aria-pressed="${AL===k}">${l}</button>`).join('')}</div>
  <div class="mois"><button class="fleche" data-ashift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button>
  <h2>${nomPeriode(PA)}</h2><button class="fleche" data-ashift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>`;
}
function vAccueil(){
  const PA={...P,lvl:AL}, nm=bounds(PA)[2], mens=AL==='M', PF={lvl:'M',...endOf(PA)};
  const X=agg(PA,'pro'), Pe=agg(PA,'perso'), part=moisPartiel(PA), V=netVise()*nm, H=heures()*nm;
  const lignes=Object.entries(Pe.by).filter(([,e])=>e.net>0.005||e.surplus>0.005).sort((a,b)=>b[1].net-a[1].net), max=Math.max(1,...lignes.map(([,e])=>e.net));
  const cs=mens?conseils():[], revue=mens&&(P.m===12||P.m===1)&&S.ops.some(o=>o.date.startsWith((P.m===12?P.y:P.y-1)+'-'));
  let gagne='';
  if(X.any){const n=X.revenuNet, d=n-V, t=n/H;
    gagne=`<section class="carte gagne"><h3>Ce que vous avez gagné ${mens?(P.m===new Date().getMonth()+1&&P.y===new Date().getFullYear()?'ce mois-ci':'en '+MOIS[P.m-1]):AL==='Q'?'au '+plabel(PA):'en '+PA.y}</h3>
      <p class="grand-chiffre">${signed(n)}</p>
      <p class="etiquette ${d>=0?'ok':'ko'}">${d>=0?`${eur0(d)} de plus que votre objectif de ${eur0(V)}`:`Il manque ${eur0(-d)} pour atteindre votre objectif de ${eur0(V)}`}</p>
      ${balanceBloc(n,Pe,PA)}
      ${salaireBloc(PA,'accueil')}
      ${part?`<p class="aide">Votre dernier relevé s’arrête au ${part} ${MOIS[P.m-1]}.</p>`:''}</section>
    <section class="carte" id="activite"><h3>Mon activité</h3>
      <div class="ligne"><span>Encaissé</span><b>${eur0(X.ca)}</b></div>
      <div class="ligne"><span>Frais de l’activité</span><b>${eur0(X.fraisExpl)}</b></div>
      <div class="ligne ligne-cot"><span>Cotisations et impôts à garder de côté (${nb(reglage('taux',0,90))} %)</span><b>${eur0(X.provision)}</b></div>
      <p class="aide sous-ligne">Cet argent n’est pas à vous : il servira à payer vos cotisations sociales et vos impôts.</p>
      ${+S.settings.taux?'':`<p class="aide">Indiquez ce pourcentage dans <button class="lien" data-tab="objectifs" data-ancre="taux-champ">Mes objectifs</button>.</p>`}
      <div class="ligne total"><span>Il vous reste</span><b>${signed(X.revenuNet)}</b></div></section>`}
  else if(Pe.any) gagne=`<section class="carte"><h3>Ce que vous avez gagné</h3><p class="aide">Aucun encaissement de votre activité ${mens?'ce mois-ci':'sur cette période'}.${S.accounts.some(a=>a.type!=='perso')?'':' Indiquez dans les réglages quel compte sert à votre activité.'}</p>${balanceBloc(0,Pe,PA)}</section>`;
  if(SAL) gagne=Pe.any?`<section class="carte gagne"><h3>Votre ${mens?'mois':AL==='Q'?'trimestre':'année'}</h3>${balanceBloc(0,Pe,PA)}</section>`:'';
  const q=S.accounts.filter(a=>!a.confirmed);
  return (q.length?`<section class="carte verifier">${q.map(acctAsk).join('')}</section>`:'')+lienAide()+periodeBarAccueil(PA)+blocClassement(PA)+(!X.any&&!Pe.any?`<p class="aide centre">Aucune opération ${mens?'ce mois-ci':'sur cette période'}.</p>`:'')+gagne+`
  ${Pe.any?`<section class="carte argent"><h3>Où part votre argent</h3>
    <p class="phrase">${eur0(Pe.net)} dépensés côté perso</p>
    <div class="rubriques">${lignes.map(([cid,e])=>{const c=catById(cid), pend=cid==='_pending', d=pend||!mens?null:derapage(cid,e.net,P), open=openCat===cid;
      return `<button class="rub${d?' derape':''}" data-cat="${cid}" aria-expanded="${open}"><i data-lucide="${pend?'circle-help':c?.icon||'circle'}"></i>
        <span class="rub-nom">${esc(pend?'À vérifier':c?.name||cid)}${d?`<span class="rub-mention">${esc(d.txt)}</span>`:''}${e.surplus>0.005?`<span class="rub-sous">dont ${eur0(e.ref)} de remboursements</span>`:''}</span>
        <span class="rub-amt">${eur0(e.net)}</span><span class="barre"><span style="width:${Math.max(1.5,e.net/max*100)}%"></span></span></button>
        ${open?`<div class="rub-ops">${e.ops.slice().sort((a,b)=>a.date<b.date?1:-1).map(opLine).join('')}</div>`:''}`}).join('')}</div>
    <button class="lien ajout-rub" data-act="nouvrub"><i data-lucide="plus"></i>Ajouter une rubrique</button></section>`:''}
  ${S.ops.length?blocLimites(PF):''}
  ${mens?blocsDefi():''}
  ${cs.length?`<section class="conseils">${cs.map(c=>`<button class="conseil ${c.lvl}" ${c.go}><i data-lucide="${c.lvl==='ko'?'triangle-alert':'lightbulb'}"></i><span>${esc(c.t)}</span><i data-lucide="chevron-right"></i></button>`).join('')}</section>`:''}
  ${revue?`<button class="carte revue" data-act="review" data-year="${P.m===12?P.y:P.y-1}"><span><span class="r-t">Votre année ${P.m===12?P.y:P.y-1} en revue</span><span class="aide">Vos meilleurs et vos pires moments, en quelques écrans.</span></span><i data-lucide="sparkles"></i></button>`:''}`;
}
