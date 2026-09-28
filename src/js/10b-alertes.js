/* ============ Alertes : critique, attention, bonne nouvelle ============ */
let ALERTS={};
const NIV={crit:0,warn:1,good:2};
const periodeKey=()=>P.lvl+P.y+'-'+P.m;
const quandP=()=>P.lvl==='M'?'Ce mois-ci':P.lvl==='Q'?'Ce trimestre':'Cette année';
const btn=(label,attr)=>`<button ${attr}>${label}</button>`;
const SUBS=new Set(['abonnements','logiciels']);

/* Revenu net et taux horaire (étape B), sous forme d'alerte */
function alerteRevenuObj(){
  const X=activite(P); if(!X.any) return null;
  const quand=quandP(), moy=P.lvl==='M'?'':' en moyenne par mois';
  const part=moisPartiel(P), note=part?` Le mois n’est pas terminé : votre dernier relevé s’arrête au ${part}.`:'';
  const lis=X.tauxLisse!=null&&X.nLisse>=3?`<p class="d">Sur les ${X.nLisse} derniers mois, en moyenne : ${eur(X.tauxLisse)} de l’heure, soit ${eur0(X.lisse)} nets par mois${X.lisse>=X.V?', au-dessus de votre objectif : ce mois plus faible n’est pas une tendance':''}.</p>`:'';
  if(X.ok) return {id:'revenu-ok',level:'good',icon:'sparkles',tab:'synthese',score:0,
    title:`${quand}, votre travail vous a rapporté <b>${eur(X.taux)} de l’heure</b>${moy}, pour ${eur(X.cible)} visés.`,
    detail:`Objectif de ${eur0(X.V)} nets atteint, avec ${eur0(X.net-X.V)} d’avance.${note}`,extra:lis};
  const ps=pistes(X);
  return {id:'revenu',level:'crit',icon:'triangle-alert',tab:'synthese',score:X.manque,
    title:X.net<=0?`${quand}, votre travail ne vous a rien rapporté : le revenu net est de <b>${signed(X.net)}</b>${moy}.`:`${quand}, votre travail vous a rapporté <b>${eur(X.taux)} de l’heure</b>${moy}, pour ${eur(X.cible)} visés.`,
    detail:`Il manque <b>${eur0(X.manque)}</b>${moy} pour atteindre ${eur0(X.V)} nets, pour ${X.H} heures travaillées.${note}`,
    extra:lis+(ps.length?`<ul class="pistes">${ps.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''),
    acts:[UNIV!=='pro'?btn('Voir mes chiffres pro','data-univ="pro"'):'',btn('Ajuster mon objectif ou mes heures','data-tab="regles"')]};
}

function computeAlerts(U){
  if(ALERTS[U]) return ALERTS[U];
  const out=[], add=a=>{if(a)out.push(a)};
  const quand=quandP(), mois=P.lvl==='M', part=moisPartiel(P);
  const A=agg(P,U), Pe=agg(P,'perso'), All=agg(P,'all');
  const prev=[1,2,3].map(i=>agg(shift(P,-i),U)).filter(a=>a.any);
  const st=stats(P,'all');

  /* Critique */
  if(U!=='perso') add(alerteRevenuObj());
  const base=U==='perso'?Pe:U==='all'?All:null;
  if(base&&base.any&&base.income-base.net<0) add({id:'solde',level:'crit',icon:'trending-down',tab:'synthese',score:base.net-base.income,
    title:`${quand}, ${U==='perso'?'vos dépenses personnelles dépassent vos rentrées':'il est sorti plus d’argent qu’il n’en est entré'} de <b>${eur0(base.net-base.income)}</b>.`,
    detail:U==='perso'&&hasPro()&&!Pe.inc.remu?'Aucune rémunération n’a été versée depuis votre compte pro sur la période : ce n’est peut-être qu’un décalage.':part?`Le mois n’est pas terminé : votre dernier relevé s’arrête au ${part}.`:'Regardez les postes qui pèsent le plus, juste en dessous.'});
  if(U!=='pro'&&st.autonomie!=null&&st.autonomie<3){const crit=st.autonomie<1;
    add({id:'matelas',level:crit?'crit':'warn',icon:crit?'shield-alert':'shield',tab:'objectifs',score:3-st.autonomie,
      title:`Votre matelas de sécurité ne couvre que <b>${fmt1(st.autonomie)} mois</b> de dépenses.`,
      detail:`${eur0(+S.settings.epargne)} d’épargne pour ${eur0(st.depMoy)} de dépenses par mois. ${crit?'Un mois sans encaissement suffirait à le vider : mettre de côté, même un peu, chaque mois, change beaucoup.':'Trois mois d’avance permettent de traverser un creux d’activité sereinement.'}`,
      acts:[btn('Voir mon matelas','data-tab="objectifs"')]})}
  if(U!=='perso'){const tr=tresoPro(), du=resteAProvisionner();
    if(tr&&tr.t!=null&&du.du>0&&tr.t<du.du) add({id:'tresorerie',level:'crit',icon:'landmark',tab:'synthese',score:du.du-tr.t,
      title:`Votre compte pro contient ${eur0(tr.t)}, mais <b>${eur0(du.du)}</b> sont à garder pour les cotisations et les impôts.`,
      detail:`Il manque ${eur0(du.du-tr.t)} : vous risquez de ne pas pouvoir payer l’URSSAF à la prochaine échéance. Évitez de vous verser une rémunération tant que l’écart n’est pas comblé.`,
      acts:[U!=='pro'?btn('Voir ma trésorerie','data-univ="pro"'):'']})}
  for(const [cid,e] of Object.entries(A.by)){const c=catById(cid); if(!c||!c.budget) continue;
    const b=c.budget*A.months, r=e.net/b; if(r<=1) continue;
    add({id:'budget:'+cid,level:r>1.2?'crit':'warn',icon:'gauge',tab:'synthese',score:r,
      title:`Budget ${esc(c.name)} dépassé de <b>${Math.round((r-1)*100)} %</b> : ${eur0(e.net)} pour ${eur0(b)} prévus.`,
      detail:r>1.2?'Au-delà de 20 %, ce n’est plus un écart ponctuel : ajustez le budget ou ce poste.':'',acts:[btn('Voir le détail',`data-cat="${cid}"`)]})}

  /* Attention */
  const moyennes=Object.entries(A.by).filter(([cid])=>cid!=='_pending'&&!(catById(cid)?.budget)).map(([cid,e])=>{
    const avg=prev.length?prev.reduce((s,a)=>s+(a.by[cid]?.net||0),0)/prev.length:0;return {cid,net:e.net,avg}}).filter(x=>x.avg>=50);
  moyennes.filter(x=>x.net>x.avg*1.2&&x.net-x.avg>=30).sort((a,b)=>(b.net-b.avg)-(a.net-a.avg)).slice(0,2).forEach(x=>
    add({id:'hausse:'+x.cid,level:'warn',icon:'trending-up',tab:'synthese',score:x.net/x.avg,
      title:`${esc(catById(x.cid).name)} en hausse de <b>${Math.round((x.net/x.avg-1)*100)} %</b> : ${eur0(x.net)}, pour ${eur0(x.avg)} en moyenne.`,
      acts:[btn('Voir le détail',`data-cat="${x.cid}"`)]}));
  if(mois){
    const k=P.y+'-'+pad(P.m), debut=k+'-01';
    const seen=new Set();
    for(const o of (BYMONTH[k]||[])){ if(o.amount>=0||o.src==='rev'||seen.has(o.merchant)) continue;
      const c=catOf(o); if(!SUBS.has(c)||(U!=='all'&&opUniv(o)!==U)) continue; seen.add(o.merchant);
      const avant=S.ops.filter(x=>x.merchant===o.merchant&&x.amount<0&&x.date<debut).sort((a,b)=>a.date<b.date?1:-1);
      if(!avant.length){ add({id:'abo-nouveau:'+o.merchant,level:'warn',icon:'repeat',tab:'economies',score:0,
        title:`Nouvel abonnement : <b>${esc(o.merchant)}</b>, ${eur(-o.amount)} par mois.`,detail:`Soit ${eur0(-o.amount*12)} par an. Vérifiez qu’il vous est vraiment utile.`,acts:[btn('Voir les abonnements','data-tab="economies"')]}); continue }
      const avantP=avant[0], d=-o.amount-(-avantP.amount);
      if(d>=1&&d>(-avantP.amount)*.05) add({id:'abo-hausse:'+o.merchant,level:'warn',icon:'badge-euro',tab:'economies',score:-o.amount,
        title:`Le prélèvement <b>${esc(o.merchant)}</b> passe de ${eur(-avantP.amount)} à ${eur(-o.amount)}.`,detail:`Soit ${eur0(d*12)} de plus par an.`,acts:[btn('Voir les abonnements','data-tab="economies"')]});
    }
  }
  if(U!=='pro'){const w=waitingReturns().filter(o=>(Date.now()-new Date(o.date))/864e5>30);
    if(w.length) add({id:'retours',level:'warn',icon:'package-open',tab:'remb',score:w.length,
      title:`${w.length>1?`${w.length} retours attendent`:'Un retour attend'} leur remboursement depuis plus de 30 jours : <b>${eur0(-w.reduce((s,o)=>s+o.amount,0))}</b>.`,
      detail:'Relancez le vendeur : passé un certain délai, le remboursement devient plus difficile à obtenir.',acts:[btn('Voir les retours','data-tab="remb"')]})}
  if(U!=='perso'&&mois&&!part){const ca=[0,1,2,3].map(i=>agg(shift(P,-i),'pro'));
    if(ca.every(a=>a.any&&a.ca>0)&&ca[0].ca<ca[1].ca&&ca[1].ca<ca[2].ca&&ca[2].ca<ca[3].ca) add({id:'ca-baisse',level:'warn',icon:'chart-no-axes-column-decreasing',tab:'synthese',score:ca[3].ca-ca[0].ca,
      title:`Votre chiffre d’affaires baisse depuis trois mois : <b>${ca.slice().reverse().map(a=>eur0(a.ca)).join(', puis ')}</b>.`,
      detail:'C’est le bon moment pour relancer vos clients ou prospecter, avant que la baisse ne pèse sur votre trésorerie.'})}
  const pg=pendingGroups();
  if(pg.length){const n=pg.reduce((s,g)=>s+g.n,0);
    add({id:'non-classees',level:'warn',icon:'circle-help',tab:'valider',score:n,
      title:`${n} opération${n>1?'s ne sont':' n’est'} pas encore classée${n>1?'s':''}, chez ${pg.length} marchand${pg.length>1?'s':''}.`,
      detail:'Vos chiffres sont incomplets tant qu’elles ne sont pas rangées. Une seule question par marchand suffit.',acts:[btn('Les classer','data-tab="valider"')]})}
  if(S.ops.length&&!demo){const ref=S.lastBackup||S.since||Date.now(), j=Math.floor((Date.now()-ref)/864e5);
    if(j>=30) add({id:'sauvegarde',level:'warn',icon:'hard-drive-download',tab:'regles',score:j,
      title:S.lastBackup?`Aucune sauvegarde depuis <b>${j} jours</b>.`:'Vous n’avez encore jamais sauvegardé vos données.',
      detail:'Elles ne sont enregistrées que dans ce navigateur : une sauvegarde les protège si vous changez d’appareil ou videz votre navigateur.',acts:[btn('Sauvegarder maintenant','data-act="backup"')]})}

  /* Bonnes nouvelles */
  if(!part) moyennes.filter(x=>x.net<x.avg*.75).sort((a,b)=>(b.avg-b.net)-(a.avg-a.net)).slice(0,2).forEach(x=>
    add({id:'baisse:'+x.cid,level:'good',icon:'trending-down',tab:'synthese',score:0,
      title:`${esc(catById(x.cid).name)} : <b>${Math.round((x.net/x.avg-1)*100)} %</b> par rapport à votre moyenne.`,detail:`Soit ${eur0(x.avg-x.net)} de moins que d’habitude. Bien joué.`}));
  if(U!=='perso'&&mois&&!part){const X=agg(P,'pro');
    const an=Array.from({length:P.m},(_,i)=>agg({lvl:'M',y:P.y,m:i+1},'pro')).filter(a=>a.any);
    if(an.length>=3&&X.revenuNet>0&&an.every(a=>a.revenuNet<=X.revenuNet)) add({id:'record',level:'good',icon:'trophy',tab:'synthese',score:0,
      title:`Meilleur mois de l’année : <b>${eur0(X.revenuNet)} nets</b>, votre record de ${P.y}.`});
    const lis=st.ms.map(x=>agg(x.q,'pro')).filter(a=>a.any), moyCA=lis.length?lis.reduce((s,a)=>s+a.ca,0)/lis.length:0;
    if(lis.length>=3&&X.ca>moyCA*1.5) add({id:'gros-mois',level:'good',icon:'hand-coins',tab:'synthese',score:0,
      title:`Mois exceptionnel : <b>${eur0(X.ca)} encaissés</b>, ${Math.round((X.ca/moyCA-1)*100)} % de plus que votre moyenne.`,
      detail:X.provision>0?`Pensez à garder ${eur0(X.provision)} pour les cotisations et les impôts, et à renforcer votre matelas.`:'Pensez à mettre une partie de côté pour les mois plus calmes.'})}
  const pp=shift(P,-1), pk=pp.y+'-'+pad(pp.m);
  S.challenges.filter(c=>c.month===pk||c.month===P.y+'-'+pad(P.m)).map(evalDefi).filter(x=>x.status==='réussi').forEach(x=>
    add({id:'defi:'+x.id+':'+x.month,level:'good',icon:'target',tab:'objectifs',score:0,title:`Défi réussi : <b>${esc(x.name)}</b>. Bravo.`,acts:[btn('Voir mes défis','data-tab="objectifs"')]}));
  if(U!=='pro'&&st.autonomie!=null){const avant=stats(shift(P,-1),'all').autonomie, obj=+S.settings.objectif||6;
    const pal=[...new Set([1,3,6,obj])].sort((a,b)=>b-a).find(x=>st.autonomie>=x&&avant!=null&&avant<x);
    if(pal) add({id:'palier:'+pal,level:'good',icon:'shield-check',tab:'objectifs',score:0,title:`Votre matelas dépasse désormais <b>${pal} mois</b> d’autonomie.`,detail:pal>=obj?'Objectif atteint : vous pouvez traverser un creux d’activité sereinement.':`Prochaine étape : ${obj} mois.`})}

  out.sort((a,b)=>NIV[a.level]-NIV[b.level]||(b.score||0)-(a.score||0));
  return ALERTS[U]=out;
}
/* Une alerte masquée reste cachée pour la période, sauf si la situation s'aggrave */
function visibleAlerts(U){
  const m=S.masked||{}, k=periodeKey();
  return computeAlerts(U).filter(a=>{const x=m[a.id];return !(x&&x.k===k&&(a.score||0)<=x.s+1e-6)});
}
function alerteCard(a){
  return `<div class="alerte ${a.level}" data-alert="${esc(a.id)}"><i data-lucide="${a.icon}"></i><div>
    <p class="t">${a.title}</p>${a.detail?`<p class="d">${a.detail}</p>`:''}${a.extra||''}
    <div class="acts">${(a.acts||[]).join('')}<button class="mask" data-mask="${esc(a.id)}">Ne plus afficher pour ${P.lvl==='M'?'ce mois':'cette période'}</button></div></div></div>`;
}
function bandeau(U){
  const al=visibleAlerts(U); if(!al.length) return '';
  return `<div class="alertes" role="region" aria-label="Alertes">${al.slice(0,3).map(alerteCard).join('')}
    ${al.length>3?`<details class="plus"><summary>Voir ${al.length-3>1?`les ${al.length-3} autres`:'l’autre alerte'}</summary>${al.slice(3).map(alerteCard).join('')}</details>`:''}</div>`;
}
/* Onglets qui portent une alerte critique */
function ongletsCritiques(){
  const t=new Set(); for(const U of ['all','pro','perso']) visibleAlerts(U).forEach(a=>{if(a.level==='crit')t.add(a.tab)}); return t;
}
