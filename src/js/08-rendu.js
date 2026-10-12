/* ============ Rendu : structure commune ============ */
function pendingGroups(){
  const g={}, sens={};
  /* Un marchand qui a à la fois des dépenses et des rentrées (achats et remboursements, ventes…) : deux questions séparées */
  for(const o of S.ops){ if(catOf(o)) continue; sens[o.merchant]=(sens[o.merchant]||0)|(o.amount>0?2:1) }
  for(const o of S.ops){ if(catOf(o)) continue;
    const key=S.rules[o.merchant]||sens[o.merchant]===3?o.merchant+(o.amount>0?'|+':'|-'):o.merchant;
    const e=g[key]||(g[key]={m:key,n:0,total:0,label:o.label,refunds:0,accts:[],ops:[],credit:o.amount>0});
    e.ops.push(o);
    if(o.amount>0&&(LINK[o.id]||REFUND_RE.test(norm(o.label)))) e.refunds++;
    e.accts.push(o.acct); e.n++; e.total+=o.amount; }
  return Object.values(g).sort((a,b)=>b.n-a.n||Math.abs(b.total)-Math.abs(a.total));
}
const nbAVerifier=()=>pendingGroups().length+douteuxValides().length;
function icons(){ if(window.lucide&&lucide.createIcons) lucide.createIcons({icons:lucide.icons,attrs:{'stroke-width':1.5}}) }
const CAT_GROUPS=[['perso','Rubriques du foyer'],['auto','Rubriques communes'],['pro','Rubriques de l’activité'],['in','Rentrées et virements']];
const catGroup=c=>c.type==='expense'?(c.univers||'perso'):'in';
/* Rubriques de dépenses du foyer seulement : pour faire passer une dépense côté perso */
function optionsPerso(){return S.categories.filter(c=>c.type==='expense'&&c.univers==='perso').map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
function catOptions(sel,withAuto,mark,nouvelle){
  return (withAuto?`<option value="">Selon la règle</option>`:'')+CAT_GROUPS.map(([g,l])=>{const cs=S.categories.filter(c=>catGroup(c)===g);return cs.length?`<optgroup label="${l}">${cs.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}${mark&&c.id===sel?mark:''}</option>`).join('')}</optgroup>`:''}).join('')+(nouvelle?'<option value="__new">+ Nouvelle rubrique…</option>':'');
}
function opUniv(o){if(o.src==='rev')return 'pro';if(INTERNAL[o.id]&&!o.cat)return acctType(o)==='pro'?'pro':'perso';const c=catOf(o);if(c&&typeOf(c)==='remu')return o.amount<0?'pro':'perso';return univOf(o,c)}
const inUniv=o=>UNIV==='all'||opUniv(o)===UNIV;
const moisNom=p=>{const s=MOIS[p.m-1]+' '+p.y;return s[0].toUpperCase()+s.slice(1)};

let ACCN=0;
const TABS=[['accueil','Accueil','house'],['bilan','Bilan','chart-bar'],['operations','Mes opérations','list'],['importer','Importer','upload'],['objectifs','Mes objectifs','target'],['reglages','Réglages','settings']];
function render(){
  AGG={}; RAW={}; relink(); ACCN=S.accounts.length;
  if(!P||P.lvl!=='M') P=defaultPeriod(); P.lvl='M';
  const onb=!S.onboarded&&!demo;
  document.body.classList.toggle('onb',onb);
  const nv=onb?0:nbAVerifier();
  $('#tabs').innerHTML=onb?'':TABS.map(([k,l,ic])=>`<button data-tab="${k}" aria-current="${view===k}"${k==='operations'&&nv?` data-tip="${nv} opération${nv>1?'s':''} à vérifier. Touchez Mes opérations pour les ranger, une par une."`:''}><i data-lucide="${ic}"></i><span>${l}${k==='operations'&&nv?`<span class="badge" aria-label="${nv} à vérifier">${nv}</span>`:''}</span></button>`).join('');
  $('#demoBar').innerHTML=demo?`<div class="demo-bar"><span>Vous regardez un exemple.</span><button data-act="exitdemo">Quitter l’exemple</button></div>`:'';
  const v=$('#view');
  if(onb&&view!=='aide') v.innerHTML=vDemarrage();
  else if(!S.ops.length&&['accueil','bilan','operations'].includes(view)) v.innerHTML=libBanner()+vide(view);
  else v.innerHTML=libBanner()+{accueil:vAccueil,bilan:vBilan,operations:vOps,importer:vImport,objectifs:vObjectifs,reglages:vReglages,aide:vAide}[view]();
  if(view!=='bilan') BCAT=null;
  v.insertAdjacentHTML('beforeend',(FICHE?fiche(FICHE):BCAT?ficheRub(BCAT):'')+(NEWCAT?fenetreRubrique():'')+(MODAL?fenetreModal():''));
  document.body.classList.toggle('fige',!!(FICHE||BCAT||NEWCAT||MODAL));
  icons(); setStatus();
  if(document.getElementById('camPage')&&typeof majCam==='function') majCam();
}
function libBanner(){return window.pdfjsLib&&window.XLSX?'':`<div class="note-box alerte-box" role="alert"><i data-lucide="wifi-off"></i><p>${MSG_RESEAU}</p></div>`}
function privacyText(){return mode==='db'
  ?'Vos comptes sont privés : personne d’autre ne peut les voir, pas même la personne qui vous a transmis l’application.'
  :'Vos comptes restent sur cet appareil : rien n’est envoyé ailleurs, et personne d’autre ne peut les voir. Ils ne se retrouvent pas tout seuls sur un autre appareil (téléphone, ordinateur) : voir Réglages, « Vos données », pour les emporter avec vous.'}
function privacyBox(){return `<div class="note-box" role="note"><i data-lucide="lock"></i><p>${privacyText()}</p></div>`}
/* Écran sans aucune opération : chaque onglet dit ce qu'il montrera, avec les mêmes façons de démarrer */
function vide(v){
  const t={accueil:['Ajoutez vos relevés pour commencer','Téléchargez vos relevés de compte en PDF sur le site de votre banque, puis ajoutez-les ici.'],
    bilan:['Votre bilan apparaîtra ici','Il se calcule à partir de vos relevés : ce qui est entré, ce qui est parti, et où part votre argent.'],
    operations:['Vos opérations apparaîtront ici','Chaque ligne de vos relevés sera listée ici, et vous pourrez la ranger dans une rubrique.']}[v]||[];
  return `<div class="vide"><h2>${t[0]}</h2><p>${t[1]}</p>
  <div class="boutons"><button class="btn" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
  <p class="aide">Vous avez déjà utilisé l’application sur un autre appareil ? Vos comptes ne passent pas d’un appareil à l’autre tout seuls : sauvegardez-les sur l’autre appareil, puis retrouvez-les ici.</p>
  <div class="boutons"><button class="btn secondaire" data-act="choisirsauv"><i data-lucide="folder-down"></i>Retrouver mes comptes (fichier de sauvegarde)</button></div></div>`;
}
function moisBar(){
  return `<div class="mois"><button class="fleche" data-shift="-1" aria-label="Mois précédent"><i data-lucide="chevron-left"></i></button>
  <h2>${moisNom(P)}</h2><button class="fleche" data-shift="1" aria-label="Mois suivant"><i data-lucide="chevron-right"></i></button></div>`;
}
/* Question sur le type d'un compte nouvellement ajouté */
const TYPES_LONG={pro:'Professionnel',perso:'Personnel',mixte:'Je n’ai pas de compte pro : ce compte sert à tout'};
function acctAsk(a){
  return `<div class="question compte-q"><p class="q-t">Ce compte est-il professionnel, personnel, ou sert-il à tout ?</p>
  <p class="q-s">${esc(a.name)}${a.no?` (n° se terminant par ${esc(a.no.slice(-4))})`:''}. Nous avons supposé : ${TYPES_LONG[a.type].toLowerCase()}.</p>
  <div class="choix gros">${Object.entries(TYPES_LONG).map(([k,l])=>`<button class="choix-btn${a.type===k?' suggere':''}" data-settype="${a.id}:${k}">${l}</button>`).join('')}</div>
  <p class="q-s">Sans compte pro, l’application vous demandera simplement, pour chaque personne qui vous paie, s’il s’agit d’un client.</p></div>`;
}

/* ============ Mes opérations ============ */
function choixRubriques(x){
  const s=S.sugg[x.m.replace(/\|[+-]$/,'')]?.c, acc=[...new Set(x.accts.map(id=>(acctById(id)||{}).type||'perso'))];
  let ids;
  if(x.credit) ids=SAL?['salaire','rentrees','retraite','remb','epargne']:['revenus','rentrees','retraite','remb','epargne'];
  else if(acc.length===1&&acc[0]==='pro') ids=['logiciels','communication','deplacements','compta','pro','divers'];
  else ids=['courses','resto','transport','sante','shopping','loisirs','voyages','cadeaux','maison','divers'];
  if(acc.includes('mixte')&&!x.credit) ids=['courses','resto','transport','maison','logiciels','pro','divers'];
  if(s) ids=[s,...ids.filter(i=>i!==s)];
  const noms={revenus:'Encaissement de l’activité',rentrees:'Autre rentrée',remb:'Un remboursement',...(x.credit?{epargne:'Retrait d’épargne'}:{})};
  return ids.filter(catById).map(id=>`<button class="choix-btn${id===s?' suggere':''}" data-qcat="${esc(x.m)}" data-c="${id}">${esc(noms[id]||catById(id).name)}</button>`).join('');
}
/* Toutes les lignes regroupées sous un même marchand (prélèvements, chèques…) : chacune peut aller dans sa propre rubrique */
let LIGNES=new Set();
function lignesGroupe(x){
  if(x.n<2) return '';
  return `<details class="autre lignes-groupe"${LIGNES.has(x.m)?' open':''}><summary>Voir les ${x.n} lignes une par une</summary>
    <p class="aide">Choisissez une rubrique pour chaque ligne. Le choix ne vaut que pour cette ligne.</p>
    ${x.ops.slice().sort((a,b)=>a.date<b.date?-1:1).map(o=>`<div class="ligne-grp"><p class="lg-t"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span> ${esc(o.label)} <b class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</b></p>
      <select class="grand" data-opcat="${o.id}" data-gk="${esc(x.m)}" aria-label="Rubrique de cette ligne"><option value="">Choisir une rubrique</option>${catOptions(null,false,'',false)}</select></div>`).join('')}</details>`;
}
/* Questions : une carte à la fois, la suggestion en premier ; puis ce qui a été rangé par supposition */
let WIZ={total:0,later:false}, DEV_OUVERT=false;
function carteQuestion(x){
  const base=x.m.replace(/\|[+-]$/,''), sug=S.sugg[base]&&catById(S.sugg[base].c)?S.sugg[base].c:null;
  const types=[...new Set(x.accts.map(id=>acctById(id)?.type||'perso'))];
  const compact=!x.credit?types.every(t=>t==='perso'||t==='mixte'):types.every(t=>t==='perso');
  const ex=[...new Set(x.ops.map(o=>o.label))].slice(0,2).map(l=>`<p class="q-ex">${esc(l.length>70?l.slice(0,70)+'…':l)}</p>`).join('');
  const tete=`<p class="q-t">${esc(ruleName(x.m).replace(/ \((dépenses|rentrées)\)$/,''))}</p>
    <p class="q-s">${x.n>1?`${x.n} ${x.credit?'rentrées':'dépenses'}, ${eur(Math.abs(x.total))} au total`:`${x.credit?'Rentrée de':'Dépense de'} ${eur(Math.abs(x.total))}`}</p>${ex}${lienRecherche(x.label)}`;
  if(!compact) return `<div class="question">${tete}${lignesGroupe(x)}<div class="choix">${choixRubriques(x)}</div>
    <details class="autre"><summary>Une autre rubrique</summary><select class="grand" data-qsel="${esc(x.m)}" aria-label="Rubrique pour ${esc(x.m)}"><option value="">Choisir une rubrique</option>${catOptions(null,false,'',true)}</select></details>
    ${!x.credit&&x.accts.some(id=>['pro','mixte'].includes(acctById(id)?.type))?`<details class="autre"><summary>Dépense perso</summary><select class="grand" data-qsel="${esc(x.m)}" aria-label="Rubrique perso pour ${esc(x.m)}"><option value="">Dans quelle rubrique perso ?</option>${optionsPerso()}</select></details>`:''}</div>`;
  const ids=[...(sug?[sug]:[]),...rubriquesProbables(x,sug?[sug]:[])].slice(0,3);
  const btn=(c,i)=>`<button class="choix-btn gros-q${c===sug?' suggere':''}" data-qcat="${esc(x.m)}" data-c="${c}">${esc(x.credit&&c==='rentrees'?'Autre rentrée':x.credit&&c==='remb'?'Un remboursement':catById(c).name)}</button>`;
  return `<div class="question">${tete}${lignesGroupe(x)}
    <div class="choix">${ids.map(btn).join('')}
      <details class="autre gros-q-d"><summary class="gros-q">Autre rubrique…</summary><select class="grand" data-qsel="${esc(x.m)}" aria-label="Rubrique pour ${esc(x.m)}"><option value="">Choisir une rubrique</option>${catOptions(null,false,'',true)}</select></details>
      <button class="choix-btn gros-q" data-idk="${esc(x.m)}">Je ne sais pas</button></div></div>`;
}
function aVerifier(){
  const g=pendingGroups(), dv=douteuxValides(), n=g.length+dv.length, dev=devinees();
  if(n===0) WIZ={total:0,later:false}; else WIZ.total=Math.max(WIZ.total,n);
  if(!n&&!dev.length) return '';
  const avecSug=g.filter(x=>S.sugg[x.m.replace(/\|[+-]$/,'')]).length, lc=S.lastClassement;
  let h='';
  if(n){
    if(WIZ.later) h+=`<section class="carte verifier"><p class="phrase">${n} question${n>1?'s':''} en attente.</p><button class="btn" data-act="wizresume">Reprendre</button></section>`;
    else {
      const fait=WIZ.total-n+1;
      h+=`<section class="carte verifier"><div class="wiz-tete"><h3>À vérifier <span class="compte">(${n})</span></h3><button class="lien" data-act="wizlater">Terminer plus tard</button></div>
      <div class="wiz-barre" role="progressbar" aria-valuemin="0" aria-valuemax="${WIZ.total}" aria-valuenow="${fait}"><span style="width:${Math.round((fait-1)/WIZ.total*100)}%"></span></div>
      <p class="aide">Question ${fait} sur ${WIZ.total}. Votre réponse vaut pour toutes les opérations de ce marchand, passées et futures.${lc&&lc.questions&&lc.part<100?` Ces marchands couvrent ${lc.part} % des montants : le reste est classé automatiquement.`:''}</p>
      ${dv.length?dv.slice(0,1).map((d,i)=>{const a=BYID[d.a],b=BYID[d.b],L=o=>`<span class="pv"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}${o.src==='paste'?' <em>copier-coller</em>':' <em>relevé</em>'}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></span>`;
        return `<div class="question"><p class="q-question">Ces 2 opérations sont-elles les mêmes ?</p><div class="apercu">${L(a)}${L(b)}</div>
        <div class="choix gros"><button class="choix-btn" data-dout="${i}:1">Oui, c’est la même : n’en garder qu’une</button><button class="choix-btn" data-dout="${i}:0">Non, ce sont deux opérations</button></div></div>`}).join('')
      :g.slice(0,1).map(x=>x.credit&&x.accts.some(id=>acctById(id)?.type==='mixte')?`<div class="question client-q"><p class="q-t">${esc(ruleName(x.m).replace(/ \((dépenses|rentrées)\)$/,''))}</p>
        <p class="q-s">${x.n>1?`${x.n} rentrées, ${eur(x.total)} au total`:`Rentrée de ${eur(x.total)}`}. ${esc(x.label)}</p>
        ${lienRecherche(x.label)}
        <p class="q-question">Cet argent vient-il d’un client ?</p>
        ${lignesGroupe(x)}
        <div class="choix gros"><button class="choix-btn" data-qcat="${esc(x.m)}" data-c="revenus">Oui, c’est un client</button><button class="choix-btn" data-qcat="${esc(x.m)}" data-c="rentrees">Non (CAF, vente, remboursement, virement perso…)</button><button class="choix-btn" data-qcat="${esc(x.m)}" data-c="epargne">Retrait d’épargne</button></div></div>`:carteQuestion(x)).join('')}
      ${avecSug>1?`<button class="btn secondaire" data-act="validall">Tout valider (${avecSug} suggestion${avecSug>1?'s':''})</button>`:''}</section>`;
    }
  }
  if(dev.length){
    const tot=dev.reduce((t,d)=>t+Math.abs(d.total),0);
    h+=`<details class="carte repli devinees"${DEV_OUVERT?' open':''}><summary>Classé automatiquement : ${dev.length} marchand${dev.length>1?'s':''}, ${eur0(tot)}</summary>
    <p class="aide">Ces marchands n’étaient pas reconnus : ils sont rangés d’après la meilleure hypothèse. Corrigez seulement ce qui est faux.</p>
    ${dev.slice(0,40).map(d=>`<div class="ligne-grp"><p class="lg-t"><span>${esc(ruleName(d.k).replace(/ \((dépenses|rentrées)\)$/,''))}</span> <b class="${d.total>0?'cr':''}">${d.total>0?'+':'−'}${eur(Math.abs(d.total))}</b></p>
      <select class="grand" data-devsel="${esc(d.k)}" aria-label="Rubrique de ${esc(d.k)}">${catOptions(d.c,false,'',false)}</select>${lienRecherche(d.label)}</div>`).join('')}
    <button class="btn" data-act="valdev">Tout valider</button></details>`;
  }
  return h;
}
let HEURES=null, RELEVE=false;
/* Ce qui est écrit sur le relevé autour de l'opération (3 lignes avant, 3 après), à la demande */
function blocReleve(o){
  if(o.src!=='pdf'&&o.src!=='csv') return '';
  const im=(S.imports||{})[o.imp], lg=im&&im.lg;
  if(!lg) return o.src==='pdf'?`<p class="aide">Ce détail n’est pas gardé pour ce relevé. Pour le voir, ajoutez de nouveau ce relevé dans Importer : rien ne sera en double.</p>`:'';
  if(o.lg==null) return `<p class="aide">Cette ligne n’a pas pu être retrouvée sur le relevé.</p>`;
  if(!RELEVE) return `<button class="lien" data-act="releve"><i data-lucide="file-search"></i>Voir ce qui est écrit sur le relevé</button>`;
  const l=[];for(let j=o.lg-3;j<=o.lg+3;j++) if(lg[j]!=null) l.push(`<p class="ex-l${j===o.lg?' cible':''}">${esc(lg[j])}</p>`);
  return `<div class="extrait"><p class="aide">Relevé « ${esc(im.nom)} ». La ligne en gras est celle d’où vient cette opération.</p>${l.join('')}<button class="lien" data-act="releve">Masquer</button></div>`;
}
/* Sous un encaissement de l'activité : son équivalent en heures au prix minimum, et le temps réellement passé */
function heuresBloc(o,statique){
  const px=heuresPrix(); if(!px||!estEncaissementPro(o)) return '';
  const eq=Math.round(o.amount/px);
  let h=`<span class="h-eq">= environ ${nb(eq)} h de travail à votre prix</span>`;
  if(o.heures>0){const t=o.amount/o.heures;h+=`<span class="h-reel ${t<px?'rouge':'or'}">Vous avez passé ${fmt1(o.heures)} h : ce travail vous a rapporté ${eur0(t)} de l’heure</span>`}
  if(statique) return `<div class="op-heures">${h}</div>`;
  if(HEURES===o.id) h+=`<span class="heures-saisie"><label class="champ">Heures réellement passées<input id="heuresIn" type="number" inputmode="decimal" min="0" step="0.5" value="${o.heures||''}"></label><button class="btn secondaire" data-heuresok="${o.id}">Enregistrer</button></span>`;
  else h+=`<button class="lien discret" data-heures="${o.id}">${o.heures>0?'Modifier le temps passé':'Temps réellement passé ?'}</button>`;
  return `<div class="op-heures">${h}</div>`;
}
function opLine(o,statique){
  statique=statique===true; /* attention : .map(opLine) passe le rang en second paramètre */
  const c=catOf(o), x=o.src==='rev'?'Fichier de revenus':opExtra(o);
  const auto=sourceAuto(o), nom=(INTERNAL[o.id]&&!o.cat?'Virement entre vos comptes':c?catById(c)?.name||'':'À vérifier')+(auto?' · classé automatiquement':'');
  const tag=statique?'div':'button', hb=heuresBloc(o,statique);
  const ligne=`<${tag} class="op"${statique?'':` data-op="${o.id}"`}><span class="op-l1"><span class="op-m">${esc(o.merchant)}</span><span class="op-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></span>
    <span class="op-l2">${o.date.slice(8,10)}/${o.date.slice(5,7)} · ${esc(nom)}${ACCN>1&&o.src!=='rev'?` · ${esc(acctName(o.acct))}`:''}</span>${x?`<span class="op-x">${esc(x)}</span>`:''}</${tag}>`;
  return hb?`<div class="op-bloc">${ligne}${hb}</div>`:ligne;
}
/* Somme de ce qui a été trouvé : dépensé, reçu, et le net si les deux existent. Les virements entre vos comptes ne comptent pas. */
function totalRecherche(list){
  const l=list.filter(o=>!(INTERNAL[o.id]&&!o.cat)); if(!l.length) return '';
  const dep=l.filter(o=>o.amount<0).reduce((s,o)=>s-o.amount,0), rec=l.filter(o=>o.amount>0).reduce((s,o)=>s+o.amount,0), net=rec-dep;
  return `<div class="total-recherche" id="total-recherche">
    <div class="ligne"><span>${rec>0.005?'Dépensé':'Total dépensé'}</span><b>${dep>0.005?'−'+eur(dep):eur(0)}</b></div>
    ${rec>0.005?`<div class="ligne"><span>Reçu ou remboursé</span><b>+${eur(rec)}</b></div>
    <div class="ligne total"><span>Au final</span><b>${net<0?'−':'+'}${eur(Math.abs(net))}</b></div>`:''}</div>`;
}
/* Filtre de Mes opérations : période (mois, trimestre, année, dates précises) et rubrique */
let FIL={lvl:'M',cat:'',du:'',au:''};
const filActif=()=>FIL.cat!==''||FIL.lvl!=='M';
function filBornes(){
  if(FIL.lvl==='D'){
    const ds=S.ops.map(o=>o.date).sort(), min=ds[0]||'', max=ds[ds.length-1]||'';
    let du=FIL.du||min, au=FIL.au||max;
    if(du>au) [du,au]=[au,du];
    return [du,au];
  }
  const [a,b]=bounds({...P,lvl:FIL.lvl}); return [a+'-01',b+'-31'];
}
function opsFiltrees(){
  let l;
  if(FIL.lvl==='M') l=(BYMONTH[P.y+'-'+pad(P.m)]||[]).slice();
  else{
    const [du,au]=filBornes();
    l=du?monthKeys(du.slice(0,7),au.slice(0,7)).flatMap(k=>BYMONTH[k]||[]).filter(o=>o.date>=du&&o.date<=au):[];
  }
  return filtreRubrique(l);
}
function filtreRubrique(l){
  if(!FIL.cat) return l;
  if(FIL.cat==='_aver') return l.filter(o=>!catOf(o)&&!(INTERNAL[o.id]&&!o.cat));
  return l.filter(o=>catOf(o)===FIL.cat);
}
function periodeTexte(){
  if(FIL.lvl==='D'){const [du,au]=filBornes();return du?`Du ${dfmt(du).replace(/(\d\d)$/,'20$1')} au ${dfmt(au).replace(/(\d\d)$/,'20$1')}`:''}
  const t=plabel({...P,lvl:FIL.lvl});return t[0].toUpperCase()+t.slice(1);
}
function filtreBar(t){
  const lv=[['M','Mois'],['Q','Trimestre'],['Y','Année'],['D','Dates']];
  const nav=t?'':FIL.lvl==='M'?moisBar()
    :FIL.lvl==='D'?`<div class="dates"><label class="champ">Du<input id="filtreDu" type="date" value="${esc(FIL.du)}"></label><label class="champ">Au<input id="filtreAu" type="date" value="${esc(FIL.au)}"></label></div>`
    :`<div class="mois"><button class="fleche" data-oshift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button><h2>${esc(periodeTexte())}</h2><button class="fleche" data-oshift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>`;
  return `<details class="carte repli filtre"${filActif()?' open':''}><summary>Filtrer par période et par rubrique${filActif()?' <span class="compte">(actif)</span>':''}</summary>
    ${t?'<p class="aide">La recherche porte sur toutes les périodes ; seule la rubrique choisie s’applique.</p>':`<div class="seg" role="group" aria-label="Période">${lv.map(([k,l])=>`<button data-flvl="${k}" aria-pressed="${FIL.lvl===k}">${l}</button>`).join('')}</div>`}
    <label class="champ">Rubrique<select class="grand" id="filtreCat"><option value="">Toutes les rubriques</option><option value="_aver"${FIL.cat==='_aver'?' selected':''}>À vérifier (sans rubrique)</option>${catOptions(FIL.cat,false,'',false)}</select></label>
    ${filActif()?'<button class="lien" data-act="filreset">Tout afficher</button>':''}</details>${nav}`;
}
function vOps(){
  const t=norm(q.trim());
  /* Recherche : marchand, libellé, rubrique, ou somme (« 45,80 », « 45.8 », « 45 ») */
  const som=/^[+\-−]?\d+([.,]\d{1,2})?\s*(€|eur|euros?)?$/i.test(q.trim())?q.trim().replace(/^[+\-−]/,'').replace(/\s*(€|eur|euros?)$/i,'').replace('.',','):'';
  const okSom=o=>{if(!som) return false; const a=Math.abs(o.amount).toFixed(2).replace('.',','); return som.includes(',')?a.startsWith(som):a.split(',')[0]===som};
  const list=(t?filtreRubrique(S.ops.filter(o=>norm(o.label+' '+o.merchant+' '+((catById(catOf(o))||{}).name||'')).includes(t)||okSom(o))):opsFiltrees()).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  const resume=t?`${list.length} opération${list.length>1?'s':''} trouvée${list.length>1?'s':''}, tous mois confondus.`
    :filActif()?`${list.length} opération${list.length>1?'s':''}${FIL.cat?' dans '+(FIL.cat==='_aver'?'« À vérifier »':'« '+esc(catById(FIL.cat)?.name||'')+' »'):''}${FIL.lvl!=='M'?', '+esc(periodeTexte()):''}.`:'';
  return aVerifier()+blocMoisManquants(true)+`<input class="recherche" id="search" type="search" placeholder="Rechercher un marchand ou une somme" value="${esc(q)}" aria-label="Rechercher un marchand ou une somme">
  ${filtreBar(t)}
  ${resume?`<p class="aide">${resume}</p>`:''}${t||filActif()?totalRecherche(list):''}
  <div class="ops">${list.slice(0,300).map(opLine).join('')||'<p class="aide">Aucune opération.</p>'}</div>
  ${list.length>300?'<p class="aide">Seules les 300 plus récentes sont affichées. Réduisez la période pour voir le reste.</p>':''}`;
}
/* Fiche d'une opération : rubrique, retour d'achat, suppression */
function fiche(id){
  const o=BYID[id]; if(!o) return '';
  const c=catOf(o), x=INTERNAL[o.id]&&!o.cat?BYID[INTERNAL[o.id]]:null;
  return `<div class="fiche-fond" data-act="closefiche"></div><div class="fiche" role="dialog" aria-modal="true" aria-label="Opération ${esc(o.merchant)}">
    <button class="fermer" data-act="closefiche" aria-label="Fermer"><i data-lucide="x"></i></button>
    <p class="f-m">${esc(o.merchant)}</p><p class="f-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</p>
    <p class="aide">${esc(o.label)}<br>${dfmt(o.date).replace(/(\d\d)\/(\d\d)\/(\d\d)/,'$1/$2/20$3')}${o.src!=='rev'&&ACCN>1?`, ${esc(acctName(o.acct))}`:''}</p>
    ${o.src==='rev'?'':lienRecherche(o.label)}
    ${opExtra(o)?`<p class="f-x">${esc(opExtra(o))}</p>`:''}
    ${blocReleve(o)}
    ${o.src==='rev'||x?'':`<label class="f-lbl" for="ficheCat">Rubrique</label>
    <select class="grand" id="ficheCat">${c||FICHESEL?'':'<option value="">À vérifier</option>'}${catOptions(FICHESEL||c,false,'',true)}</select>
    <div class="radios"><label><input type="radio" name="portee" value="tout" checked> Pour toutes les opérations de ce marchand</label>
    <label><input type="radio" name="portee" value="une"> Pour cette opération seulement</label></div>
    <button class="btn" data-act="savefiche" data-id="${o.id}">Enregistrer</button>`}
    <div class="f-actions">${o.src!=='rev'&&o.amount<0&&!LINKED[o.id]&&!x?`<button class="lien" data-await="${o.id}">${o.awaiting?'Annuler le retour d’achat':'Signaler un retour d’achat'}</button>`:''}
    <button class="lien danger" data-delop="${o.id}">Supprimer cette opération</button></div></div>`;
}

/* ============ Importer ============ */
function reportLine(r){
  const last=r.lus.reduce((m,o)=>o.date>m?o.date:m,''), mois=last?MOIS[+last.slice(5,7)-1]+(last.slice(0,4)!==thisMonth().slice(0,4)?' '+last.slice(0,4):''):'';
  const qui=esc(r.bank||(r.acctInfo&&r.acctInfo.name)||r.name);
  let txt,cls='';
  if(r.error){txt=`${esc(r.name)} : ${esc(r.error)}`;cls='ko'}
  else if(!r.found){txt=`${esc(r.name)} : aucune opération n’a été reconnue.`;cls='ko'}
  else if(r.test) txt=`${qui}, ${mois} : ${r.found} opération${r.found>1?'s':''} lue${r.found>1?'s':''}. C’est un essai, rien n’a été enregistré.`;
  else if(r.colle) {txt=`Copier-coller${r.bank?', '+esc(r.bank):''} : ${r.added} opération${r.added>1?'s':''} ajoutée${r.added>1?'s':''} ✓${r.dups?`, ${r.dups} déjà présente${r.dups>1?'s':''}`:''}${r.douteux?`, ${r.douteux} à confirmer dans Mes opérations`:''}.`;cls='ok'}
  else if(r.completees) {txt=`${qui}, ${mois} : ${r.found} opérations. ${r.completees} étaient déjà là grâce à votre copier-coller et ont été complétées, ${r.added} ajoutée${r.added>1?'s':''} ✓${r.douteux?` (${r.douteux} à confirmer dans Mes opérations)`:''}`;cls='ok'}
  else if(!r.added) txt=r.detail?`${qui}, ${mois} : déjà importé, rien n’a été ajouté. Le détail du relevé est maintenant disponible pour ${r.detail} opération${r.detail>1?'s':''} ✓`:`${qui}, ${mois} : déjà importé, rien n’a été ajouté.`;
  else {txt=`${qui}, ${mois} : ${r.added} opération${r.added>1?'s':''} ajoutée${r.added>1?'s':''} ✓`;cls='ok'}
  if(r.found&&!r.error&&r.controle&&r.controle.ok) txt+=' Relevé vérifié ✓';
  const a=!r.test&&acctById(r.acct);
  return `<div class="releve ${cls}${r.test?' essai':''}"><p class="r-t">${txt}</p>
    ${r.controle&&!r.controle.ok?`<p class="r-alerte">Attention : il y a un écart de ${eur(Math.abs(r.controle.ecart))} entre les soldes du relevé et les opérations lues.${phraseSuspects(r.controle)||' Vérifiez vos opérations.'}</p>`:''}
    ${a&&!a.confirmed?acctAsk(a):''}
    ${!r.colle&&r.lignes&&(!r.found||(r.controle&&!r.controle.ok))?(ASSIST&&ASSIST.imp===r.imp?panneauAssistant(r):`<div class="boutons"><button class="btn${r.found?' secondaire':''}" data-assist="${r.imp}">${r.found?'La lecture n’est pas juste ? Apprenez-lui en 3 gestes':'Apprendre à lire ce relevé (3 gestes)'}</button></div>`):''}
    ${r.test&&r.found?`<div class="boutons"><button class="btn" data-realimp="${r.imp}">Importer pour de bon</button><button class="lien" data-dropreport="${r.imp}">Fermer</button></div>`:''}
    ${r.found||r.raw?`<details class="detail"${r.test||!r.found?' open':''}><summary>${r.found?'Voir le détail':'Aide à la lecture'}</summary>${reportCard(r)}</details>`:''}</div>`;
}
/* Détail complet de la lecture d'un relevé */
function reportCard(r){
  const nd=r.lus.filter(o=>o.dup).length;
  const info=r.acctInfo?`<p class="aide">Banque : ${esc(r.bank||'non reconnue')}. Compte : ${esc(r.acctInfo.name)}${r.acctInfo.isNew?' (nouveau)':''}.${nd?` ${nd} opération${nd>1?'s':''} déjà importée${nd>1?'s':''}.`:''}</p>`:'';
  const ctl=r.controle?(r.controle.ok?`<p class="verif ok">Relevé vérifié ✓ Les soldes du relevé correspondent aux opérations lues.</p>`
    :`<p class="verif ko">Écart de ${eur(Math.abs(r.controle.ecart))} entre les soldes et les opérations lues.${phraseSuspects(r.controle)||' Une opération a peut-être été oubliée ou mal lue.'}</p>`):'';
  const liste=r.lus.length?`<div class="apercu">${r.lus.slice().sort((a,b)=>a.date<b.date?-1:1).slice(0,200).map(o=>`<div class="pv${o.dup?' dup':''}"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}${o.dup?' <em>déjà importée</em>':''}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></div>`).join('')}${r.lus.length>200?`<p class="aide">Et ${r.lus.length-200} autres.</p>`:''}</div>`:'';
  const aide=r.raw&&!r.found?`<p>Ce relevé n’a pas pu être lu. Voici le texte trouvé dans le fichier, sans vos numéros de compte ni vos noms. Envoyez-le à la personne qui vous a transmis l’application : elle pourra l’adapter à votre banque.</p>
      <textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="lien" data-copy="${r.imp}">Copier le texte</button>
      <details class="autre"><summary>Autre solution, en dernier recours : avec Claude</summary>
        <ol class="etapes-txt">
          <li>Touchez <button class="lien" data-prompt="${r.imp}">Copier la demande pour Claude</button>. Le texte copié ne contient ni vos numéros de compte ni vos noms.</li>
          <li>Ouvrez un nouvel onglet sur claude.ai et connectez-vous (un compte gratuit suffit).</li>
          <li>Collez la demande dans la zone de message (Cmd + V), puis envoyez-la.</li>
          <li>Claude répond par un texte qui commence par { et finit par }. Copiez-le en entier (bouton « Copier » sous sa réponse).</li>
          <li>Revenez ici, collez-le dans la case ci-dessous, puis touchez « Ajouter ce lecteur et relire le relevé ».</li>
          <li>Le résultat doit afficher « Relevé vérifié ✓ ». Sinon, écrivez à Claude, dans la même conversation, l’écart indiqué ici, puis recommencez à l’étape 4.</li>
        </ol>
        <textarea class="anon" id="claude-${r.imp}" placeholder="Collez ici la réponse de Claude"></textarea>
        <button class="btn secondaire" data-lclaude="${r.imp}">Ajouter ce lecteur et relire le relevé</button></details>`:'';
  return info+ctl+liste+aide;
}
/* Relevés déjà ajoutés, regroupés par import : chacun peut être supprimé (ajouté par erreur) */
const SRC_NOM={pdf:'Relevé PDF',csv:'Fichier CSV',paste:'Copier-coller'};
function groupesImport(){
  const g={}; for(const o of S.ops){ if(o.src==='rev'||!o.imp) continue;
    const e=g[o.imp]||(g[o.imp]={imp:o.imp,n:0,min:o.date,max:o.date,accts:new Set(),src:o.src});
    e.n++; if(o.date<e.min)e.min=o.date; if(o.date>e.max)e.max=o.date; e.accts.add(o.acct) }
  return Object.values(g).sort((a,b)=>a.max<b.max?1:a.max>b.max?-1:0);
}
function relevesAjoutes(){
  const g=groupesImport(); if(!g.length) return '';
  const d=x=>x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4);
  return `<details class="carte repli" id="mes-releves"><summary>Mes relevés ajoutés (${g.length})</summary>
    <p class="aide">Un relevé rangé dans le mauvais compte ? Choisissez le bon compte : ses opérations y passent. Un relevé ajouté par erreur ? Supprimez-le : ses opérations disparaissent, les rubriques que vous avez choisies sont gardées.</p>
    ${g.map(e=>{const nom=(S.imports||{})[e.imp]?.nom||SRC_NOM[e.src]||'Relevé';
      return `<div class="releve-ajoute"><p><b>${esc(nom)}</b><br><span class="aide">${[...e.accts].map(a=>esc(acctName(a))).join(', ')} · du ${d(e.min)} au ${d(e.max)} · ${e.n} opération${e.n>1?'s':''}</span></p>
      <label class="aide deplacer">Mauvais compte ? <select class="grand" data-moveimp="${e.imp}" aria-label="Changer le compte de ce relevé"><option value="">Choisir le bon compte…</option>${S.accounts.filter(a=>!(e.accts.size===1&&e.accts.has(a.id))).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}<option value="__new">Un nouveau compte…</option></select></label>
      <button class="lien danger" data-delimp="${e.imp}">Supprimer</button></div>`}).join('')}</details>`;
}
/* Mois sans aucune opération entre le premier et le dernier mois connus d'un compte : un relevé a probablement été sauté */
function moisManquants(acctId){
  const vus=new Set(S.ops.filter(o=>o.acct===acctId&&o.src!=='rev').map(o=>o.date.slice(0,7)));
  if(vus.size<2) return [];
  const t=[...vus].sort(), [y0,m0]=t[0].split('-').map(Number), [y1,m1]=t[t.length-1].split('-').map(Number), out=[];
  for(let y=y0,m=m0;y<y1||(y===y1&&m<=m1);m++){ if(m>12){m=1;y++} const k=y+'-'+String(m).padStart(2,'0'); if(!vus.has(k)&&(y<y1||m<=m1)) out.push(k) }
  return out;
}
function listeMois(mois){
  const lab=(k,an)=>MOIS[+k.slice(5,7)-1]+(an?' '+k.slice(0,4):''), suivant=(a,b)=>{const [y,m]=a.split('-').map(Number);return b===(m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'))};
  const runs=[]; for(const k of mois){const r=runs[runs.length-1]; if(r&&suivant(r[r.length-1],k)) r.push(k); else runs.push([k])}
  const txt=runs.map(r=>{const an=r[0].slice(0,4)!==r[r.length-1].slice(0,4);
    if(r.length===1) return lab(r[0],true);
    if(r.length===2) return lab(r[0],an)+' et '+lab(r[1],true);
    return 'de '+lab(r[0],an)+' à '+lab(r[r.length-1],true)});
  return txt.join(', puis ');
}
function phraseMoisManquants(mois){
  return `${mois.length>1?'Il manque des mois':'Il manque un mois'} : ${listeMois(mois)}.`;
}
/* Importer : où en sont les relevés, banque par banque, à la date du jour. Un relevé par mois et par compte est attendu, jusqu'à celui du mois dernier. */
function etatReleves(){
  if(!S.ops.length) return '';
  const d=new Date(), cle=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'), prev=cle(new Date(d.getFullYear(),d.getMonth()-1,1));
  const nomMois=k=>MOIS[+k.slice(5,7)-1]+' '+k.slice(0,4);
  const L=S.accounts.map(a=>{
    const vus=[...new Set(S.ops.filter(o=>o.acct===a.id&&o.src!=='rev').map(o=>o.date.slice(0,7)))].sort(); if(!vus.length) return null;
    const dernier=vus[vus.length-1], fin=dernier<prev?monthKeys(dernier,prev).slice(1):[];
    return {a,premier:vus[0],dernier,manque:[...moisManquants(a.id),...fin]};
  }).filter(Boolean).sort((x,y)=>(x.a.bank||x.a.name).localeCompare(y.a.bank||y.a.name,'fr'));
  if(!L.length) return '';
  const jour=d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  return `<section class="carte etat-releves"><h3>Vos relevés, à ce jour</h3>
    <p class="aide">Au ${esc(jour)} : un relevé par mois et par compte est attendu, jusqu’à celui de ${esc(nomMois(prev))}.</p>
    ${L.map(({a,premier,dernier,manque})=>`<div class="er ${manque.length?'ko':'ok'}"><i data-lucide="${manque.length?'triangle-alert':'circle-check'}"></i><div>
      <p class="er-t"><b>${esc(a.bank||a.name)}</b>${a.bank&&a.name&&a.name!==a.bank?` · ${esc(a.name)}`:''}</p>
      <p>Relevés ajoutés : ${premier===dernier?esc(nomMois(premier)):`de ${esc(nomMois(premier))} à ${esc(nomMois(dernier))}`}.</p>
      <p class="er-m">${manque.length?`${manque.length>1?'Relevés manquants':'Relevé manquant'} : ${esc(listeMois(manque))}.`:'Aucun relevé ne manque.'}</p></div></div>`).join('')}</section>`;
}
/* Le relevé du mois dernier n'est pas encore ajouté : seulement quand le dernier mois connu du compte est l'avant-dernier mois du calendrier
   (plus ancien, le compte est sans doute délaissé et on ne le répète pas ailleurs que dans Importer). */
function releveRecentManquant(acctId){
  const vus=S.ops.filter(o=>o.acct===acctId&&o.src!=='rev').map(o=>o.date.slice(0,7)).sort(); if(!vus.length) return null;
  const d=new Date(), p=new Date(d.getFullYear(),d.getMonth()-1,1), pp=new Date(d.getFullYear(),d.getMonth()-2,1);
  const cle=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0');
  return vus[vus.length-1]===cle(pp)?cle(p):null;
}
/* Rappel visible : un mois sauté entre deux relevés, ou le relevé du mois dernier pas encore ajouté. avecBouton : renvoie vers Importer. */
function blocMoisManquants(avecBouton){
  const l=S.accounts.map(a=>({a,m:moisManquants(a.id),r:releveRecentManquant(a.id)})).filter(x=>x.m.length||x.r);
  if(!l.length) return '';
  const nomMois=k=>MOIS[+k.slice(5,7)-1]+' '+k.slice(0,4);
  const nom=a=>`<b>${esc(a.name)}</b> : `;
  return `<section class="carte manque" role="status"><div class="manque-t"><i data-lucide="triangle-alert"></i><div>
    ${l.map(({a,m,r})=>`${m.length?`<p>${nom(a)}${phraseMoisManquants(m).replace(/^Il manque un mois/,'Il manque un relevé').replace(/^Il manque des mois/,'Il manque des relevés')} Ajoutez ${m.length>1?'les relevés correspondants':'le relevé correspondant'} pour que vos chiffres soient complets.</p>`:''}${r?`<p>${nom(a)}le relevé de ${esc(nomMois(r))} n’est pas encore ajouté.</p>`:''}`).join('')}
    ${avecBouton?'<button class="btn secondaire" data-tab="importer">Ajouter un relevé</button>':''}</div></div></section>`;
}
function choixTypeImport(){
  if(SAL) return '';
  const t=[['perso','Mon compte perso'],['pro','Mon compte pro'],['mixte','Un compte qui sert à tout']];
  return `<div class="type-import"><p class="f-lbl">Ces relevés viennent de quel compte ?</p>
    <div class="choix gros">${t.map(([k,l])=>`<button class="choix-btn${IMPTYPE===k?' suggere':''}" data-imptype="${k}" aria-pressed="${IMPTYPE===k}">${l}</button>`).join('')}</div>
    <p class="aide">${IMPTYPE?'Ce choix s’applique aux nouveaux comptes ajoutés. Un compte déjà connu garde son type, que vous pouvez changer dans Réglages, « Vos comptes ».':'Choisissez avant d’ajouter vos relevés. Sinon l’application devine, puis vous pose la question.'}</p></div>`;
}
function vImport(){
  const nRev=S.ops.filter(o=>o.src==='rev').length;
  return `<details class="mode-court"><summary><i data-lucide="circle-help"></i>Mode d’emploi</summary>
    ${privacyBox()}<div class="note-box" role="note"><i data-lucide="info"></i><p>Le premier mois est un peu long : l’application vous pose quelques questions. Ensuite, environ 90 % du travail n’est plus à faire : elle retient vos réponses et reconnaît les enseignes toute seule. <button class="lien" data-tab="aide">Voir le mode d’emploi complet</button></p></div></details>
  ${etatReleves()}
  <section class="carte">
  ${choixTypeImport()}
  <label class="gros-bouton" data-drop="bank"><input type="file" id="file"${ACCEPT_RELEVE} multiple><i data-lucide="file-plus-2"></i><span>Ajouter mes relevés</span></label>
  <details class="autre comment-ajouter"><summary><i data-lucide="circle-help"></i>Comment ajouter mes relevés ?</summary>
    <p class="aide">Des relevés PDF, plusieurs à la fois, même de banques différentes. Ce qui est déjà importé est ignoré.</p>
    <p class="aide"><b>Sur ordinateur :</b> téléchargez vos relevés sur le site de votre banque, puis choisissez-les ici (ou glissez-les sur le gros bouton).</p>
    <p class="aide"><b>Sur iPhone ou iPad :</b> l’iPhone ne permet pas de coller un fichier copié dans une page web. Le plus sûr :</p>
    <ol class="aide liste-etapes"><li>Créez une fois un dossier « Relevés » dans l’application Fichiers.</li>
      <li>Pour chaque relevé : bouton Partager, « Enregistrer dans Fichiers », puis ce dossier (l’iPhone retient le dernier dossier choisi).</li>
      <li>Ici, touchez « Ajouter mes relevés », « Sélectionner des fichiers », ouvrez le dossier, touchez « Sélectionner » en haut à droite puis chaque relevé : ils sont tous lus d’un seul coup.</li></ol>
    <p class="aide">Un lien copié ne peut pas être ouvert par l’application, car vos données ne quittent jamais votre appareil : il faut le fichier PDF lui-même.</p></details>
  <label class="btn secondaire">Tester un relevé<input type="file" id="testfile"${ACCEPT_RELEVE} hidden></label>
  <p class="aide">Pour voir comment un relevé est lu, sans rien enregistrer.</p>
  <button class="btn secondaire" data-act="coller"><i data-lucide="clipboard-paste"></i>Coller mes opérations</button>
  <p class="aide">Copiez les opérations sur le site de votre banque et collez-les ici. Celles qui sont déjà là ne sont pas ajoutées deux fois, même si vous importez le relevé PDF ensuite.</p></section>
  ${COLLE?panneauColler():''}
  ${reports.length?`<section class="releves">${reports.map(reportLine).join('')}</section>`:''}
  ${relevesAjoutes()}
  ${SAL?'':`<details class="carte repli"${revDraft||revMsg||revError?' open':''}><summary>Vous suivez vos revenus dans un tableau ?</summary>
  <p class="aide">Choisissez le fichier Excel, Numbers ou CSV où vous notez ce que vous encaissez. L’application le lit à la place de vos relevés pour vos encaissements.</p>
  ${revMsg?`<p class="ok-txt">${esc(revMsg)}</p>`:''}${revError?`<p class="ko-txt">${esc(revError)}</p>`:''}
  ${revDraft?revPanel():`<label class="btn secondaire" data-drop="rev"><input type="file" id="revfile" accept=".xlsx,.xls,.numbers,.ods,.csv" hidden>Choisir mon fichier</label>
  <p class="aide">${nRev?`${nRev} ligne${nRev>1?'s':''} déjà importée${nRev>1?'s':''}. Un nouveau fichier les remplace.`:'Réimportez-le quand il change : il remplace le précédent.'}</p>`}
  <div class="radios"><p class="f-lbl">Compter vos encaissements depuis</p>
    <label><input type="radio" name="incsrc" data-inc="bank"${S.incomeSource!=='file'?' checked':''}> mes relevés bancaires</label>
    <label><input type="radio" name="incsrc" data-inc="file"${S.incomeSource==='file'?' checked':''}> mon tableau</label></div></details>`}`;
}
