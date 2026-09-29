/* ============ Rendu : structure commune ============ */
function pendingGroups(){
  const g={}, sens={};
  /* Un marchand qui a à la fois des dépenses et des rentrées (achats et remboursements, ventes…) : deux questions séparées */
  for(const o of S.ops){ if(catOf(o)) continue; sens[o.merchant]=(sens[o.merchant]||0)|(o.amount>0?2:1) }
  for(const o of S.ops){ if(catOf(o)) continue;
    const key=S.rules[o.merchant]||sens[o.merchant]===3?o.merchant+(o.amount>0?'|+':'|-'):o.merchant;
    const e=g[key]||(g[key]={m:key,n:0,total:0,label:o.label,refunds:0,accts:[],credit:o.amount>0});
    if(o.amount>0&&(LINK[o.id]||REFUND_RE.test(norm(o.label)))) e.refunds++;
    e.accts.push(o.acct); e.n++; e.total+=o.amount; }
  return Object.values(g).sort((a,b)=>b.n-a.n||Math.abs(b.total)-Math.abs(a.total));
}
const nbAVerifier=()=>pendingGroups().length+douteuxValides().length;
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
const TABS=[['accueil','Accueil','house'],['bilan','Bilan','chart-bar'],['operations','Mes opérations','list'],['importer','Importer','upload'],['objectifs','Mes objectifs','target'],['reglages','Réglages','settings']];
function render(){
  AGG={}; RAW={}; relink(); ACCN=S.accounts.length;
  if(!P||P.lvl!=='M') P=defaultPeriod(); P.lvl='M';
  const onb=!S.onboarded&&!demo;
  document.body.classList.toggle('onb',onb);
  const nv=onb?0:nbAVerifier();
  $('#tabs').innerHTML=onb?'':TABS.map(([k,l,ic])=>`<button data-tab="${k}" aria-current="${view===k}"><i data-lucide="${ic}"></i><span>${l}${k==='operations'&&nv?`<span class="badge" aria-label="${nv} à vérifier">${nv}</span>`:''}</span></button>`).join('');
  $('#demoBar').innerHTML=demo?`<div class="demo-bar"><span>Vous regardez un exemple.</span><button data-act="exitdemo">Quitter l’exemple</button></div>`:'';
  const v=$('#view');
  if(onb) v.innerHTML=vDemarrage();
  else if(!S.ops.length&&['accueil','bilan','operations'].includes(view)) v.innerHTML=libBanner()+vide();
  else v.innerHTML=libBanner()+{accueil:vAccueil,bilan:vBilan,operations:vOps,importer:vImport,objectifs:vObjectifs,reglages:vReglages}[view]();
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
  if(x.credit) ids=['revenus','rentrees','retraite','remb','epargne'];
  else if(acc.length===1&&acc[0]==='pro') ids=['logiciels','materiel','deplacements','soustraitance','pro'];
  else ids=['courses','resto','transport','shopping','loisirs','voyages','cadeaux','maison','sante','epargne','divers'];
  if(acc.includes('mixte')&&!x.credit) ids=['courses','resto','transport','shopping','loisirs','voyages','logiciels','materiel','pro','divers'];
  if(s) ids=[s,...ids.filter(i=>i!==s)];
  const noms={revenus:'Encaissement de l’activité',rentrees:'Autre rentrée',remb:'Un remboursement'};
  return ids.filter(catById).map(id=>`<button class="choix-btn${id===s?' suggere':''}" data-qcat="${esc(x.m)}" data-c="${id}">${esc(noms[id]||catById(id).name)}</button>`).join('');
}
function aVerifier(){
  const g=pendingGroups(), dv=douteuxValides(), n=g.length+dv.length; if(!n) return '';
  return `<section class="carte verifier"><h3>À vérifier <span class="compte">(${n})</span></h3>
  <p class="aide">Une seule réponse par marchand : elle vaudra pour toutes ses opérations, passées et futures.</p>
  ${dv.map((d,i)=>{const a=BYID[d.a],b=BYID[d.b],L=o=>`<span class="pv"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}${o.src==='paste'?' <em>copier-coller</em>':' <em>relevé</em>'}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></span>`;
    return `<div class="question"><p class="q-question">Ces 2 opérations sont-elles les mêmes ?</p><div class="apercu">${L(a)}${L(b)}</div>
    <div class="choix gros"><button class="choix-btn" data-dout="${i}:1">Oui, c’est la même : n’en garder qu’une</button><button class="choix-btn" data-dout="${i}:0">Non, ce sont deux opérations</button></div></div>`}).join('')}
  ${g.map(x=>x.credit&&x.accts.some(id=>acctById(id)?.type==='mixte')?`<div class="question client-q"><p class="q-t">${esc(ruleName(x.m).replace(/ \((dépenses|rentrées)\)$/,''))}</p>
    <p class="q-s">${x.n>1?`${x.n} rentrées, ${eur(x.total)} au total`:`Rentrée de ${eur(x.total)}`}. ${esc(x.label)}</p>
    ${lienRecherche(x.label)}
    <p class="q-question">Cet argent vient-il d’un client ?</p>
    <div class="choix gros"><button class="choix-btn" data-qcat="${esc(x.m)}" data-c="revenus">Oui, c’est un client</button><button class="choix-btn" data-qcat="${esc(x.m)}" data-c="rentrees">Non (CAF, vente, remboursement, virement perso…)</button></div></div>`:`<div class="question"><p class="q-t">${esc(ruleName(x.m).replace(/ \((dépenses|rentrées)\)$/,''))}</p>
    <p class="q-s">${x.n>1?`${x.n} ${x.credit?'rentrées':'dépenses'}, ${eur(Math.abs(x.total))} au total`:`${x.credit?'Rentrée de':'Dépense de'} ${eur(Math.abs(x.total))}`}. ${esc(x.label)}</p>
    ${lienRecherche(x.label)}
    <div class="choix">${choixRubriques(x)}</div>
    <details class="autre"><summary>Une autre rubrique</summary><select class="grand" data-qsel="${esc(x.m)}" aria-label="Rubrique pour ${esc(x.m)}"><option value="">Choisir une rubrique</option>${catOptions(null,false,'',true)}</select></details></div>`).join('')}
  </section>`;
}
let HEURES=null;
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
  const nom=INTERNAL[o.id]&&!o.cat?'Virement entre vos comptes':c?catById(c)?.name||'':'À vérifier';
  const tag=statique?'div':'button', hb=heuresBloc(o,statique);
  const ligne=`<${tag} class="op"${statique?'':` data-op="${o.id}"`}><span class="op-l1"><span class="op-m">${esc(o.merchant)}</span><span class="op-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></span>
    <span class="op-l2">${o.date.slice(8,10)}/${o.date.slice(5,7)} · ${esc(nom)}${ACCN>1&&o.src!=='rev'?` · ${esc(acctName(o.acct))}`:''}</span>${x?`<span class="op-x">${esc(x)}</span>`:''}</${tag}>`;
  return hb?`<div class="op-bloc">${ligne}${hb}</div>`:ligne;
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
  const c=catOf(o), x=INTERNAL[o.id]&&!o.cat?BYID[INTERNAL[o.id]]:null;
  return `<div class="fiche-fond" data-act="closefiche"></div><div class="fiche" role="dialog" aria-modal="true" aria-label="Opération ${esc(o.merchant)}">
    <button class="fermer" data-act="closefiche" aria-label="Fermer"><i data-lucide="x"></i></button>
    <p class="f-m">${esc(o.merchant)}</p><p class="f-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</p>
    <p class="aide">${esc(o.label)}<br>${dfmt(o.date).replace(/(\d\d)\/(\d\d)\/(\d\d)/,'$1/$2/20$3')}${o.src!=='rev'&&ACCN>1?`, ${esc(acctName(o.acct))}`:''}</p>
    ${o.src==='rev'?'':lienRecherche(o.label)}
    ${opExtra(o)?`<p class="f-x">${esc(opExtra(o))}</p>`:''}
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
  else if(!r.added) txt=`${qui}, ${mois} : déjà importé, rien n’a été ajouté.`;
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
    <p class="aide">Un relevé ajouté par erreur ? Supprimez-le : ses opérations disparaissent, les rubriques que vous avez choisies sont gardées.</p>
    ${g.map(e=>{const nom=(S.imports||{})[e.imp]?.nom||SRC_NOM[e.src]||'Relevé';
      return `<div class="releve-ajoute"><p><b>${esc(nom)}</b><br><span class="aide">${[...e.accts].map(a=>esc(acctName(a))).join(', ')} · du ${d(e.min)} au ${d(e.max)} · ${e.n} opération${e.n>1?'s':''}</span></p>
      <button class="lien danger" data-delimp="${e.imp}">Supprimer</button></div>`}).join('')}</details>`;
}
function vImport(){
  const nRev=S.ops.filter(o=>o.src==='rev').length;
  return privacyBox()+`<section class="carte">
  <label class="gros-bouton" data-drop="bank"><input type="file" id="file" accept=".pdf,.csv,application/pdf,text/csv" multiple><i data-lucide="file-plus-2"></i><span>Ajouter mes relevés</span></label>
  <p class="aide">Des relevés PDF, plusieurs à la fois, même de banques différentes. Ce qui est déjà importé est ignoré.</p>
  <label class="btn secondaire">Tester un relevé<input type="file" id="testfile" accept=".pdf,.csv,application/pdf,text/csv" hidden></label>
  <p class="aide">Pour voir comment un relevé est lu, sans rien enregistrer.</p>
  <button class="btn secondaire" data-act="coller"><i data-lucide="clipboard-paste"></i>Coller mes opérations</button>
  <p class="aide">Copiez les opérations sur le site de votre banque et collez-les ici. Celles qui sont déjà là ne sont pas ajoutées deux fois, même si vous importez le relevé PDF ensuite.</p></section>
  ${COLLE?panneauColler():''}
  ${reports.length?`<section class="releves">${reports.map(reportLine).join('')}</section>`:''}
  ${relevesAjoutes()}
  <details class="carte repli"${revDraft||revMsg||revError?' open':''}><summary>Vous suivez vos revenus dans un tableau ?</summary>
  <p class="aide">Choisissez le fichier Excel, Numbers ou CSV où vous notez ce que vous encaissez. L’application le lit à la place de vos relevés pour vos encaissements.</p>
  ${revMsg?`<p class="ok-txt">${esc(revMsg)}</p>`:''}${revError?`<p class="ko-txt">${esc(revError)}</p>`:''}
  ${revDraft?revPanel():`<label class="btn secondaire" data-drop="rev"><input type="file" id="revfile" accept=".xlsx,.xls,.numbers,.ods,.csv" hidden>Choisir mon fichier</label>
  <p class="aide">${nRev?`${nRev} ligne${nRev>1?'s':''} déjà importée${nRev>1?'s':''}. Un nouveau fichier les remplace.`:'Réimportez-le quand il change : il remplace le précédent.'}</p>`}
  <div class="radios"><p class="f-lbl">Compter vos encaissements depuis</p>
    <label><input type="radio" name="incsrc" data-inc="bank"${S.incomeSource!=='file'?' checked':''}> mes relevés bancaires</label>
    <label><input type="radio" name="incsrc" data-inc="file"${S.incomeSource==='file'?' checked':''}> mon tableau</label></div></details>`;
}
