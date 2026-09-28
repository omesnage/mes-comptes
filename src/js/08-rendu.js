/* ============ Rendu : structure commune ============ */
function pendingGroups(){
  const g={};
  for(const o of S.ops){ if(catOf(o)) continue;
    const key=S.rules[o.merchant]?o.merchant+(o.amount>0?'|+':'|-'):o.merchant;
    const e=g[key]||(g[key]={m:key,n:0,total:0,label:o.label,refunds:0,accts:[],credit:o.amount>0});
    if(o.amount>0&&(LINK[o.id]||REFUND_RE.test(norm(o.label)))) e.refunds++;
    e.accts.push(o.acct); e.n++; e.total+=o.amount; }
  return Object.values(g).sort((a,b)=>b.n-a.n||Math.abs(b.total)-Math.abs(a.total));
}
/* Virements du compte pro vers le perso dont on ne sait pas encore s'ils sont une rémunération ou des frais remboursés */
function virementsInconnus(){
  const g={};
  for(const o of S.ops){ if(o.amount>=0||o.cat) continue; const x=INTERNAL[o.id]?BYID[INTERNAL[o.id]]:null;
    if(!x||remuDir(o,x)<=0||virKind(o,x)) continue;
    const e=g[o.merchant]||(g[o.merchant]={m:o.merchant,n:0,total:0,label:o.label}); e.n++; e.total+=-o.amount }
  return Object.values(g);
}
const nbAVerifier=()=>pendingGroups().length+virementsInconnus().length;
function icons(){ if(window.lucide&&lucide.createIcons) lucide.createIcons({icons:lucide.icons,attrs:{'stroke-width':1.5}}) }
const CAT_GROUPS=[['perso','Rubriques du foyer'],['auto','Rubriques communes'],['pro','Rubriques de l’activité'],['in','Rentrées et virements']];
const catGroup=c=>c.type==='expense'?(c.univers||'perso'):'in';
function catOptions(sel,withAuto,mark,nouvelle){
  return (withAuto?`<option value="">Selon la règle</option>`:'')+CAT_GROUPS.map(([g,l])=>{const cs=S.categories.filter(c=>catGroup(c)===g);return cs.length?`<optgroup label="${l}">${cs.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}${mark&&c.id===sel?mark:''}</option>`).join('')}</optgroup>`:''}).join('')+(nouvelle?'<option value="__new">+ Nouvelle rubrique…</option>':'');
}
function opUniv(o){if(o.src==='rev')return 'pro';if(INTERNAL[o.id]&&!o.cat)return acctType(o)==='pro'?'pro':'perso';const c=catOf(o);if(c&&typeOf(c)==='remu')return o.amount<0?'pro':'perso';return univOf(o,c)}
const inUniv=o=>UNIV==='all'||opUniv(o)===UNIV;
const moisNom=p=>{const s=MOIS[p.m-1]+' '+p.y;return s[0].toUpperCase()+s.slice(1)};

let ACCN=0;
const TABS=[['accueil','Accueil','house'],['bilan','Bilan','chart-pie'],['operations','Mes opérations','list'],['importer','Importer','upload']];
function render(){
  AGG={}; RAW={}; relink(); ACCN=S.accounts.length;
  if(!P||P.lvl!=='M') P=defaultPeriod(); P.lvl='M';
  const onb=!S.onboarded&&!demo;
  document.body.classList.toggle('onb',onb);
  const nv=onb?0:nbAVerifier();
  $('#tabs').innerHTML=onb?'':TABS.map(([k,l,ic])=>`<button data-tab="${k}" aria-current="${view===k}"><i data-lucide="${ic}"></i><span>${l}${k==='operations'&&nv?`<span class="badge" aria-label="${nv} à vérifier">${nv}</span>`:''}</span></button>`).join('');
  $('#gear').hidden=onb; $('#gear').setAttribute('aria-current',view==='reglages');
  $('#demoBar').innerHTML=demo?`<div class="demo-bar"><span>Vous regardez un exemple.</span><button data-act="exitdemo">Quitter l’exemple</button></div>`:'';
  const v=$('#view');
  if(onb) v.innerHTML=vDemarrage();
  else if(!S.ops.length&&['accueil','bilan','operations'].includes(view)) v.innerHTML=libBanner()+vide();
  else v.innerHTML=libBanner()+{accueil:vAccueil,bilan:vBilan,operations:vOps,importer:vImport,reglages:vReglages}[view]();
  if(view!=='bilan') BCAT=null;
  v.insertAdjacentHTML('beforeend',(FICHE?fiche(FICHE):BCAT?ficheRub(BCAT):'')+(NEWCAT?fenetreRubrique():'')+(MODAL?fenetreModal():''));
  document.body.classList.toggle('fige',!!(FICHE||BCAT||NEWCAT||MODAL));
  icons(); setStatus();
}
function libBanner(){return window.pdfjsLib&&window.XLSX?'':`<div class="note-box alerte-box" role="alert"><i data-lucide="wifi-off"></i><p>${MSG_RESEAU}</p></div>`}
function privacyText(){return mode==='db'
  ?'Vos comptes sont privés : personne d’autre ne peut les voir, pas même la personne qui vous a transmis l’application.'
  :'Vos comptes restent sur cet appareil : rien n’est envoyé ailleurs, et personne d’autre ne peut les voir.'}
function privacyBox(){return `<div class="note-box" role="note"><i data-lucide="lock"></i><p>${privacyText()}</p></div>`}
function vide(){
  return `<div class="vide"><h2>Ajoutez vos relevés pour commencer</h2><p>Téléchargez vos relevés de compte en PDF sur le site de votre banque, puis ajoutez-les ici.</p>
  <div class="boutons"><button class="btn" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div></div>`;
}
function moisBar(){
  return `<div class="mois"><button class="fleche" data-shift="-1" aria-label="Mois précédent"><i data-lucide="chevron-left"></i></button>
  <h2>${moisNom(P)}</h2><button class="fleche" data-shift="1" aria-label="Mois suivant"><i data-lucide="chevron-right"></i></button></div>`;
}
/* Question sur le type d'un compte nouvellement ajouté */
const TYPES_LONG={pro:'Professionnel',perso:'Personnel',mixte:'Les deux mélangés'};
function acctAsk(a){
  return `<div class="question compte-q"><p class="q-t">Ce compte est-il professionnel, personnel, ou les deux mélangés ?</p>
  <p class="q-s">${esc(a.name)}${a.no?` (n° se terminant par ${esc(a.no.slice(-4))})`:''}. Nous avons supposé : ${TYPES_LONG[a.type].toLowerCase()}.</p>
  <div class="choix gros">${Object.entries(TYPES_LONG).map(([k,l])=>`<button class="choix-btn${a.type===k?' suggere':''}" data-settype="${a.id}:${k}">${l}</button>`).join('')}</div>
  <p class="q-s">« Les deux mélangés » : un seul compte pour votre activité et votre vie perso. Chaque dépense est alors rangée selon sa rubrique.</p></div>`;
}

/* ============ Mes opérations ============ */
function choixRubriques(x){
  const s=S.sugg[x.m]?.c, acc=[...new Set(x.accts.map(id=>(acctById(id)||{}).type||'perso'))];
  let ids;
  if(x.credit) ids=['revenus','rentrees','remb'];
  else if(acc.length===1&&acc[0]==='pro') ids=['logiciels','materiel','deplacements','comptable','pro'];
  else ids=['courses','resto','transport','shopping','maison','loisirs','sante','divers'];
  if(acc.includes('mixte')&&!x.credit) ids=['courses','resto','transport','shopping','pro','fraisrembourses','divers'];
  if(s) ids=[s,...ids.filter(i=>i!==s)];
  const noms={revenus:'Encaissement de l’activité',rentrees:'Autre rentrée',remb:'Un remboursement'};
  return ids.filter(catById).map(id=>`<button class="choix-btn${id===s?' suggere':''}" data-qcat="${esc(x.m)}" data-c="${id}">${esc(noms[id]||catById(id).name)}</button>`).join('');
}
function aVerifier(){
  const g=pendingGroups(), vi=virementsInconnus(), n=g.length+vi.length; if(!n) return '';
  return `<section class="carte verifier"><h3>À vérifier <span class="compte">(${n})</span></h3>
  <p class="aide">Une seule réponse par marchand : elle vaudra pour toutes ses opérations, passées et futures.</p>
  ${vi.map(x=>`<div class="question"><p class="q-t">Ce virement de votre compte pro, c’est votre rémunération ou un remboursement de frais ?</p>
    <p class="q-s">${esc(x.label)}, ${x.n>1?`${x.n} virements, `:''}${eur(x.total)}</p>
    <div class="choix"><button class="choix-btn" data-vir="${esc(x.m)}" data-k="remu">Ma rémunération</button><button class="choix-btn" data-vir="${esc(x.m)}" data-k="ndf">Un remboursement de frais</button></div></div>`).join('')}
  ${g.map(x=>`<div class="question"><p class="q-t">${esc(ruleName(x.m).replace(/ \((dépenses|rentrées)\)$/,''))}</p>
    <p class="q-s">${x.n>1?`${x.n} opérations, `:''}${x.total<0?'−':'+'}${eur(Math.abs(x.total))}. ${esc(x.label)}</p>
    <div class="choix">${choixRubriques(x)}</div>
    <details class="autre"><summary>Une autre rubrique</summary><select class="grand" data-qsel="${esc(x.m)}" aria-label="Rubrique pour ${esc(x.m)}"><option value="">Choisir une rubrique</option>${catOptions(null,false,'',true)}</select></details></div>`).join('')}
  </section>`;
}
function opLine(o){
  const c=catOf(o), x=o.src==='rev'?'Fichier de revenus':opExtra(o);
  const nom=INTERNAL[o.id]&&!o.cat?'Virement entre vos comptes':c?catById(c)?.name||'':'À vérifier';
  return `<button class="op" data-op="${o.id}"><span class="op-l1"><span class="op-m">${esc(o.merchant)}</span><span class="op-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></span>
    <span class="op-l2">${o.date.slice(8,10)}/${o.date.slice(5,7)} · ${esc(nom)}${ACCN>1&&o.src!=='rev'?` · ${esc(acctName(o.acct))}`:''}</span>${x?`<span class="op-x">${esc(x)}</span>`:''}</button>`;
}
function vOps(){
  const t=norm(q.trim()), k=P.y+'-'+pad(P.m);
  const list=t?S.ops.filter(o=>norm(o.label+' '+o.merchant).includes(t)):(BYMONTH[k]||[]).slice().sort((a,b)=>a.date<b.date?1:-1);
  return aVerifier()+`<input class="recherche" id="search" type="search" placeholder="Rechercher un marchand" value="${esc(q)}" aria-label="Rechercher un marchand">
  ${t?`<p class="aide">${list.length} opération${list.length>1?'s':''} trouvée${list.length>1?'s':''}, tous mois confondus.</p>`:moisBar()}
  <div class="ops">${list.slice(0,300).map(opLine).join('')||'<p class="aide">Aucune opération.</p>'}</div>
  ${list.length>300?'<p class="aide">Seules les 300 plus récentes sont affichées.</p>':''}`;
}
/* Fiche d'une opération : rubrique, retour d'achat, suppression */
function fiche(id){
  const o=BYID[id]; if(!o) return '';
  const c=catOf(o), x=INTERNAL[o.id]&&!o.cat?BYID[INTERNAL[o.id]]:null, deb=o.amount<0?o:x, cre=o.amount<0?x:o;
  const vir=x&&remuDir(deb,cre)>0;
  return `<div class="fiche-fond" data-act="closefiche"></div><div class="fiche" role="dialog" aria-modal="true" aria-label="Opération ${esc(o.merchant)}">
    <button class="fermer" data-act="closefiche" aria-label="Fermer"><i data-lucide="x"></i></button>
    <p class="f-m">${esc(o.merchant)}</p><p class="f-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</p>
    <p class="aide">${esc(o.label)}<br>${dfmt(o.date).replace(/(\d\d)\/(\d\d)\/(\d\d)/,'$1/$2/20$3')}${o.src!=='rev'&&ACCN>1?`, ${esc(acctName(o.acct))}`:''}</p>
    ${opExtra(o)?`<p class="f-x">${esc(opExtra(o))}</p>`:''}
    ${vir?`<p class="f-lbl">Ce virement de votre compte pro, c’est :</p><div class="choix"><button class="choix-btn${virKind(deb,cre)!=='ndf'?' suggere':''}" data-vir="${esc(deb.merchant)}" data-k="remu">Ma rémunération</button><button class="choix-btn${virKind(deb,cre)==='ndf'?' suggere':''}" data-vir="${esc(deb.merchant)}" data-k="ndf">Un remboursement de frais</button></div>`:''}
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
  else if(!r.added) txt=`${qui}, ${mois} : déjà importé, rien n’a été ajouté.`;
  else {txt=`${qui}, ${mois} : ${r.added} opération${r.added>1?'s':''} ajoutée${r.added>1?'s':''} ✓`;cls='ok'}
  const a=!r.test&&acctById(r.acct);
  return `<div class="releve ${cls}${r.test?' essai':''}"><p class="r-t">${txt}</p>
    ${r.controle&&!r.controle.ok?`<p class="r-alerte">Attention : il y a un écart de ${eur(Math.abs(r.controle.ecart))} entre les soldes du relevé et les opérations lues. Vérifiez vos opérations.</p>`:''}
    ${a&&!a.confirmed?acctAsk(a):''}
    ${r.test&&r.found?`<div class="boutons"><button class="btn" data-realimp="${r.imp}">Importer pour de bon</button><button class="lien" data-dropreport="${r.imp}">Fermer</button></div>`:''}
    ${r.found||r.raw?`<details class="detail"${r.test||!r.found?' open':''}><summary>${r.found?'Voir le détail':'Aide à la lecture'}</summary>${reportCard(r)}</details>`:''}</div>`;
}
/* Détail complet de la lecture d'un relevé */
function reportCard(r){
  const nd=r.lus.filter(o=>o.dup).length;
  const info=r.acctInfo?`<p class="aide">Banque : ${esc(r.bank||'non reconnue')}. Compte : ${esc(r.acctInfo.name)}${r.acctInfo.isNew?' (nouveau)':''}.${nd?` ${nd} opération${nd>1?'s':''} déjà importée${nd>1?'s':''}.`:''}</p>`:'';
  const ctl=r.controle?(r.controle.ok?`<p class="verif ok">Relevé vérifié ✓ Les soldes du relevé correspondent aux opérations lues.</p>`
    :`<p class="verif ko">Écart de ${eur(Math.abs(r.controle.ecart))} entre les soldes et les opérations lues : une opération a peut-être été oubliée ou mal lue.</p>`):'';
  const liste=r.lus.length?`<div class="apercu">${r.lus.slice().sort((a,b)=>a.date<b.date?-1:1).slice(0,200).map(o=>`<div class="pv${o.dup?' dup':''}"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}${o.dup?' <em>déjà importée</em>':''}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></div>`).join('')}${r.lus.length>200?`<p class="aide">Et ${r.lus.length-200} autres.</p>`:''}</div>`:'';
  const aide=r.raw&&!r.found?`<p>Ce relevé n’a pas pu être lu. Voici le texte trouvé dans le fichier, sans vos numéros de compte ni vos noms. Envoyez-le à la personne qui vous a transmis l’application : elle pourra l’adapter à votre banque.</p>
      <textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="lien" data-copy="${r.imp}">Copier le texte</button>
      <details class="autre"><summary>Autre solution</summary><p class="aide">Si vous utilisez Claude, il peut vous aider : <button class="lien" data-prompt="${r.imp}">copier la demande pour Claude</button>, puis suivez la marche à suivre dans Réglages, Réglages avancés, « Lecteurs de relevés ».</p></details>`:'';
  return info+ctl+liste+aide;
}
function vImport(){
  const nRev=S.ops.filter(o=>o.src==='rev').length;
  return privacyBox()+`<section class="carte">
  <label class="gros-bouton" data-drop="bank"><input type="file" id="file" accept=".pdf,.csv,application/pdf,text/csv" multiple><i data-lucide="file-plus-2"></i><span>Ajouter mes relevés</span></label>
  <p class="aide">Des relevés PDF, plusieurs à la fois, même de banques différentes. Ce qui est déjà importé est ignoré.</p>
  <label class="btn secondaire">Tester un relevé<input type="file" id="testfile" accept=".pdf,.csv,application/pdf,text/csv" hidden></label>
  <p class="aide">Pour voir comment un relevé est lu, sans rien enregistrer.</p></section>
  ${reports.length?`<section class="releves">${reports.map(reportLine).join('')}</section>`:''}
  <details class="carte repli"${revDraft||revMsg||revError?' open':''}><summary>Vous suivez vos revenus dans un tableau ?</summary>
  <p class="aide">Choisissez le fichier Excel, Numbers ou CSV où vous notez ce que vous encaissez. L’application le lit à la place de vos relevés pour vos encaissements.</p>
  ${revMsg?`<p class="ok-txt">${esc(revMsg)}</p>`:''}${revError?`<p class="ko-txt">${esc(revError)}</p>`:''}
  ${revDraft?revPanel():`<label class="btn secondaire" data-drop="rev"><input type="file" id="revfile" accept=".xlsx,.xls,.numbers,.ods,.csv" hidden>Choisir mon fichier</label>
  <p class="aide">${nRev?`${nRev} ligne${nRev>1?'s':''} déjà importée${nRev>1?'s':''}. Un nouveau fichier les remplace.`:'Réimportez-le quand il change : il remplace le précédent.'}</p>`}
  <div class="radios"><p class="f-lbl">Compter vos encaissements depuis</p>
    <label><input type="radio" name="incsrc" data-inc="bank"${S.incomeSource!=='file'?' checked':''}> mes relevés bancaires</label>
    <label><input type="radio" name="incsrc" data-inc="file"${S.incomeSource==='file'?' checked':''}> mon tableau</label></div></details>`;
}
