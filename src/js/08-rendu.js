/* ============ Rendu ============ */
function pendingGroups(){
  const g={};
  for(const o of S.ops){ if(catOf(o)) continue;
    const key=S.rules[o.merchant]?o.merchant+(o.amount>0?'|+':'|-'):o.merchant;
    const e=g[key]||(g[key]={m:key,n:0,total:0,label:o.label,refunds:0,accts:[]});e.accts.push(o.acct);
    if(o.amount>0&&(LINK[o.id]||REFUND_RE.test(norm(o.label)))) e.refunds++;
    e.n++; e.total+=o.amount; }
  return Object.values(g).sort((a,b)=>b.n-a.n||Math.abs(b.total)-Math.abs(a.total));
}
function icons(){ if(window.lucide&&lucide.createIcons) lucide.createIcons({icons:lucide.icons,attrs:{'stroke-width':1.25}}) }
const CAT_GROUPS=[['perso','Dépenses personnelles'],['pro','Dépenses professionnelles'],['auto','Dépenses communes, selon le compte'],['in','Rentrées et virements']];
const catGroup=c=>c.type==='expense'?(c.univers||'perso'):'in';
function catOptions(sel,withAuto,mark){
  return (withAuto?`<option value="">Selon la règle</option>`:'')+CAT_GROUPS.map(([g,l])=>{const cs=S.categories.filter(c=>catGroup(c)===g);return cs.length?`<optgroup label="${l}">${cs.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}${mark&&c.id===sel?mark:''}</option>`).join('')}</optgroup>`:''}).join('');
}
/* Univers d'une opération pour les listes (les virements internes suivent leur compte) */
function opUniv(o){if(o.src==='rev')return 'pro';if(INTERNAL[o.id]&&!o.cat)return acctType(o)==='pro'?'pro':'perso';const c=catOf(o);if(c&&typeOf(c)==='remu')return o.amount<0?'pro':'perso';return univOf(o,c)}
const inUniv=o=>UNIV==='all'||opUniv(o)===UNIV;

let ACCN=0;
const UNIVS=[['all','Vue d’ensemble'],['pro','Pro'],['perso','Perso']];
function render(){
  AGG={}; RAW={}; ALERTS={}; relink(); ACCN=S.accounts.length;
  if(!P) P=defaultPeriod();
  const crit=S.ops.length?ongletsCritiques():new Set();
  const n=pendingGroups().length, nw=waitingReturns().length;
  const tabs=[['synthese','Synthèse'],['economies','Économies'],['objectifs','Objectifs'],['operations','Opérations'],['remb','Remboursements'],['valider','À valider'],['regles','Réglages'],['importer','Importer']];
  $('#univ').innerHTML=S.ops.length&&!['regles','importer','valider'].includes(view)?`<div class="univ" role="group" aria-label="Univers affiché">${UNIVS.map(([k,l])=>`<button data-univ="${k}" aria-pressed="${UNIV===k}">${l}</button>`).join('')}</div>`:'';
  $('#tabs').innerHTML=tabs.map(([k,l])=>`<button data-tab="${k}" aria-current="${view===k}">${l}${k==='valider'&&n?`<span class="badge">${n}</span>`:''}${k==='remb'&&nw?`<span class="badge">${nw}</span>`:''}${crit.has(k)?'<span class="dot" title="Alerte importante"></span>':''}</button>`).join('');
  $('#demoBar').innerHTML=demo?`<div class="demo-bar"><span>Vous regardez des données fictives.</span><button data-act="exitdemo">Quitter l’exemple</button></div>`:'';
  if(!P) P=defaultPeriod();
  const v=$('#view');
  if(!S.ops.length&&view!=='importer'&&view!=='regles'){ v.innerHTML=libBanner()+emptyAll(); icons(); setStatus(); return }
  const FOOT=`<div class="foot"><i data-lucide="lock"></i><span>Vos comptes restent privés : personne d’autre ne peut les voir.</span></div>`;
  v.innerHTML=libBanner()+{synthese:vSynth,economies:vEco,objectifs:vGoals,operations:vOps,remb:vRefunds,valider:vQueue,regles:vRules,importer:vImport}[view]()+(view==='importer'?'':FOOT);
  icons(); setStatus();
}
/* Bibliothèques chargées depuis internet : message simple si l'une manque */
function libBanner(){return window.pdfjsLib&&window.XLSX?'':`<div class="privacy" role="alert" style="border-color:var(--alert)"><i data-lucide="wifi-off"></i><span>${MSG_RESEAU}</span></div>`}
/* Question posée pour chaque compte dont le type n'a pas encore été confirmé */
function acctAsk(a,guessNote){
  return `<div class="ask"><p>${guessNote?'Nouveau compte : ':'Votre compte '}<b>${esc(a.name)}</b>${guessNote?'. ':' '}${guessNote?'De quel type de compte s’agit-il ?':'est-il professionnel ou personnel ?'}</p>
  <div class="ask-btns">${Object.entries(ACCT_TYPES).map(([k,l])=>`<button class="pill" data-settype="${a.id}:${k}" aria-pressed="${a.type===k}">${l}</button>`).join('')}</div>
  <p class="note">Nous avons supposé : ${ACCT_TYPES[a.type].toLowerCase()}. Choisissez « Pro et perso mélangés » si vous utilisez un seul compte pour tout : chaque dépense sera alors rangée côté pro ou perso selon sa rubrique.</p></div>`;
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
  return `<div class="levels">${[['M','Mois'],['Q','Trimestre'],['Y','Année']].map(([k,l])=>`<button data-lvl="${k}" aria-pressed="${P.lvl===k}">${l}</button>`).join('')}</div>
  <div class="period"><button class="arrow" data-shift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button>
  <h2>${plabel(P)}</h2><button class="arrow" data-shift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>`;
}
function opRow(o){
  const c=catOf(o);
  return `<div class="op">
    <div class="op-date">${o.date.slice(8,10)}/${o.date.slice(5,7)}/${o.date.slice(2,4)}</div>
    <div><div class="op-m">${esc(o.merchant)}</div><div class="op-l">${o.src==='rev'?'Fichier de revenus':esc(o.label)}${o.src!=='rev'&&ACCN>1?` <span style="color:var(--ink);opacity:.55">— ${esc(acctName(o.acct))}</span>`:''}</div>${(x=>x?`<div class="op-x">${esc(x)}</div>`:'')(o.src==='rev'?'':opExtra(o))}</div>
    <div class="op-amt${o.amount>0?' cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</div>
    <div class="op-tools">${o.src==='rev'?'':`
      <select class="quiet" data-override="${o.id}" aria-label="Catégorie de cette opération">
        ${o.cat?'':`<option value="" selected>${c?'Selon la règle : '+esc(catById(c)?.name||c):'Non classée'}</option>`}
        ${o.cat?`<option value="">Revenir à la règle</option>`:''}
        ${catOptions(o.cat,false,' (cette opération seulement)')}
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
  list=list.filter(inUniv);
  if(OPACC) list=list.filter(o=>o.src!=='rev'&&o.acct===OPACC);
  const total=list.reduce((s,o)=>s+o.amount,0);
  const accs=S.accounts.filter(a=>UNIV==='all'||(UNIV==='pro'?a.type!=='perso':a.type!=='pro'));
  return (t?'':periodBar())+`${accs.length>1?`<label class="acct"><select class="quiet" data-opacc="1" aria-label="Compte affiché"><option value="">Tous les comptes</option>${accs.map(a=>`<option value="${a.id}"${a.id===OPACC?' selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`:''}<input class="search" id="search" type="search" placeholder="Rechercher un marchand ou un libellé, sur toutes les périodes" value="${esc(q)}">
  <p class="count">${list.length} opération${list.length>1?'s':''}, solde ${total<0?'−':'+'}${eur(Math.abs(total))}${list.length>300?'. Seules les 300 plus récentes sont affichées.':''}</p>
  <div>${list.slice(0,300).map(opRow).join('')||'<div class="empty" style="padding:30px 0">Aucune opération.</div>'}</div>`;
}
function vRefunds(){
  const [a,b]=bounds(P);
  const refs=S.ops.filter(o=>{const k=o.date.slice(0,7);return k>=a&&k<=b&&isRefund(o)&&inUniv(o)});
  const tot=refs.reduce((s,o)=>s+o.amount,0);
  const w=waitingReturns().filter(inUniv);
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
function acctsOfGroup(x){if(S.accounts.length<2)return '';const n=[...new Set(x.accts)].map(acctName);return esc(n.join(', '))+'. '}
function vQueue(){
  const g=pendingGroups();
  if(!g.length) return `<div class="empty"><p>Tout est classé ✅</p><div>Les prochaines opérations de ces marchands seront rangées automatiquement.</div></div>`;
  const withS=g.filter(x=>S.sugg[x.m]).length, without=HAS_CLAUDE?g.length-withS:0;
  return `<p class="lead">Une seule question par marchand. Votre choix devient une règle, appliquée à toutes ses opérations passées et futures.</p>
  <div class="btn-row">
    ${withS?`<button class="btn" data-act="acceptall">Valider les ${withS} suggestions</button>`:''}
    ${without?`<button class="btn gold" data-act="askclaude" id="askBtn">Demander à Claude pour ${without} marchand${without>1?'s':''}</button>`:''}
  </div>
  <p class="note" id="askNote" style="margin:-16px 0 24px">${without?'Seuls les noms de marchands sont envoyés, jamais les montants ni les libellés complets.':''}</p>
  <div>${g.map(x=>{const s=S.sugg[x.m];return `<div class="q">
    <div><div class="q-m">${esc(ruleName(x.m))}</div>
      <div class="q-sub">${acctsOfGroup(x)}${x.n} opération${x.n>1?'s':''}, ${x.total<0?'−':'+'}${eur(Math.abs(x.total))}. Exemple : ${esc(x.label)}</div>${x.refunds?`<div class="q-hint">Dont ${x.refunds} remboursement${x.refunds>1?'s':''}, rangé${x.refunds>1?'s':''} avec les achats</div>`:''}
      ${s?`<div class="q-hint">${s.src==='claude'?`Suggestion de Claude${s.conf!=null?', confiance '+Math.round(s.conf*100)+' %':''}`:'Suggestion automatique'}</div>`:''}</div>
    <div class="q-act"><select class="quiet" data-qsel="${esc(x.m)}" aria-label="Catégorie pour ${esc(x.m)}">${s?'':'<option value="">Choisir une catégorie</option>'}${catOptions(s?.c)}</select>
    <button class="link" data-qok="${esc(x.m)}">Valider</button></div></div>`}).join('')}</div>`;
}
function vRules(){
  const r=Object.entries(S.rules).sort((a,b)=>a[0].localeCompare(b[0]));
  const s=S.settings;
  return `<section class="block" id="activite"><h3 class="sec">Votre activité</h3>
  <p class="lead">Le revenu net que vous visez chaque mois, une fois payés vos frais, vos cotisations et vos impôts, et le temps que vous y passez. L’application en déduit le taux horaire à atteindre.</p>
  <div class="fields">
    <label>Revenu net visé par mois (€)<input type="number" inputmode="numeric" min="0" step="50" data-set="netVise" value="${s.netVise||''}" placeholder="2000"></label>
    <label>Heures travaillées par mois<input type="number" inputmode="numeric" min="1" step="5" data-set="heures" value="${s.heures||''}" placeholder="160"></label>
    <div class="calc"><span>Taux horaire visé</span><b id="cibleLive">${eur(tauxCible())}</b></div>
  </div>
  <div class="fields">
    <label>Part à mettre de côté pour les cotisations et impôts (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="selon votre statut"></label>
    <label>Calculée sur<select class="quiet" data-assiette="1"><option value="ca"${s.assiette!=='resultat'?' selected':''}>le chiffre d’affaires encaissé</option><option value="resultat"${s.assiette==='resultat'?' selected':''}>le résultat, après les frais</option></select></label>
  </div>
  <p class="note">La part à mettre de côté dépend de votre statut et de votre régime : vérifiez-la avec votre comptable ou sur le site de l’URSSAF. En micro-entreprise, elle se calcule sur le chiffre d’affaires encaissé ; dans les autres cas, le plus souvent sur le résultat.</p></section>
  <section class="block"><h3 class="sec">Votre épargne</h3>
  <p class="lead">Elle sert à calculer votre matelas de sécurité : le nombre de mois que vous tiendriez sans rien encaisser.</p>
  <div class="fields">
    <label>Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${s.epargne||''}" placeholder="0"></label>
    <label>Matelas visé (mois)<input type="number" inputmode="numeric" min="1" max="36" step="1" data-set="objectif" value="${s.objectif||''}" placeholder="6"></label>
  </div></section>
  ${S.accounts.length?`<section class="block"><h3 class="sec">Comptes</h3><p class="lead">Dites pour chaque compte s’il est professionnel ou personnel. Un compte pro alimente l’univers Pro, un compte perso l’univers Perso. Si vous n’avez qu’un seul compte pour tout, choisissez « Pro et perso mélangés » : chaque dépense est alors rangée selon sa rubrique.</p>
  ${S.accounts.map(a=>{const n=S.ops.filter(o=>o.acct===a.id).length;return `<div class="acct-card">
    <div class="acct-head"><span class="acct-name">${esc(a.name)}</span><span class="note">${a.no?'n° ····'+esc(a.no.slice(-4))+', ':''}${n} opération${n>1?'s':''}</span><button class="link" data-renacct="${a.id}">Renommer</button></div>
    <div class="fields">
      <label>Type de compte<select class="quiet" data-accttype="${a.id}">${Object.entries(ACCT_TYPES).map(([k,l])=>`<option value="${k}"${a.type===k?' selected':''}>${l}</option>`).join('')}</select></label>
      ${a.type==='pro'?`<label>Solde du compte (€)<input type="number" inputmode="decimal" step="0.01" data-solde="${a.id}" value="${a.solde!=null?a.solde:''}" placeholder="tel qu’affiché par la banque"></label>
      <label>À la date du<input type="date" data-soldedate="${a.id}" value="${esc(a.soldeDate||'')}"></label>`:''}
    </div>
    ${a.type==='pro'?`<p class="note">${a.soldeSrc==='releve'?'Solde lu sur votre dernier relevé. ':''}Le solde sert à calculer votre trésorerie disponible, une fois mise de côté la provision pour les cotisations et les impôts.</p>`:''}
  </div>`}).join('')}</section>`:''}
  <section class="block"><h3 class="sec">Budgets mensuels</h3>
  <p class="lead">Facultatif. Sans budget, les alertes comparent chaque catégorie à la moyenne des trois périodes précédentes.</p>
  ${S.categories.filter(c=>c.type==='expense').map(c=>`<label class="budget"><i data-lucide="${c.icon}"></i><span>${esc(c.name)}</span><input type="number" min="0" step="10" inputmode="numeric" placeholder="—" value="${c.budget||''}" data-budget="${c.id}" aria-label="Budget mensuel ${esc(c.name)}"></label>`).join('')}
  </section>
  <section class="block"><h3 class="sec">Rubriques</h3>
  <p class="lead">Chaque rubrique appartient à un univers : perso, pro, ou « selon le compte », qui suit le type du compte de l’opération. Touchez « Variable » ou « Charge fixe » pour dire ce qui compte dans votre point mort. Vous pouvez ajouter vos propres rubriques.</p>
  ${S.categories.map(c=>`<div class="rule rule-cat"><span style="display:flex;gap:12px;align-items:center"><i data-lucide="${c.icon}" style="width:17px;height:17px;color:var(--gold)"></i>${esc(c.name)}</span><span class="rule-tools">${c.type==='expense'?`<button class="link" data-fixed="${c.id}" aria-pressed="${!!c.fixed}" style="${c.fixed?'color:var(--gold);text-decoration-color:var(--gold)':''}">${c.fixed?'Charge fixe':'Variable'}</button>`:''}${c.type==='expense'||c.type==='income'?`<select class="quiet" data-catuniv="${c.id}" aria-label="Univers de ${esc(c.name)}"><option value="perso"${c.univers==='perso'?' selected':''}>${c.type==='income'?'Rentrée perso':'Perso'}</option><option value="pro"${c.univers==='pro'?' selected':''}>${c.type==='income'?'Rentrée pro':'Pro'}</option><option value="auto"${c.univers==='auto'?' selected':''}>Selon le compte</option></select>`:`<span>${c.type==='remu'?'Virement de rémunération':'Neutre'}</span>`}</span>${c.custom?`<button class="link" data-delcat="${c.id}">Supprimer</button>`:'<span></span>'}</div>`).join('')}
  <div class="rule" style="border-bottom:0;padding-top:18px">
    <input id="newcat" class="search" style="margin:0;padding:6px 0;font-size:14px" placeholder="Nom de la nouvelle rubrique" maxlength="40">
    <select class="quiet" id="newcattype"><option value="perso">Dépense perso</option><option value="pro">Dépense pro</option><option value="income">Rentrée d’argent</option></select>
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
/* Résultat complet de la lecture d'un relevé : essai ou import réel */
function reportCard(r){
  const nd=r.lus.filter(o=>o.dup).length, pl=(n,a,b)=>n>1?b:a;
  const head=r.test?`<p class="test-flag">Essai de lecture : rien n’a été enregistré.</p>`:'';
  if(r.error) return `<div class="report${r.test?' test':''}"><h4>${esc(r.name)}</h4>${head}<p class="count danger">${esc(r.error)}</p></div>`;
  const info=r.acctInfo?`<div class="lecture">
      <div><span>Banque</span><b>${esc(r.bank||'non reconnue')}</b></div>
      <div><span>Compte</span><b>${esc(r.acctInfo.name)}</b><em>${r.acctInfo.isNew?'nouveau compte, ':'déjà connu, '}${ACCT_TYPES[r.acctInfo.type].toLowerCase()}${r.acctInfo.isNew?' (supposé)':''}</em></div>
      <div><span>Opérations</span><b>${r.found}</b><em>${r.lus.length?`du ${dfmt(r.lus.reduce((m,o)=>o.date<m?o.date:m,'9'))} au ${dfmt(r.lus.reduce((m,o)=>o.date>m?o.date:m,''))}`:''}</em></div>
    </div>`:'';
  const ctl=r.controle?(r.controle.ok?`<p class="verif ok">Relevé vérifié ✓ L’ancien solde (${eur(r.controle.ancien)}) plus les opérations lues donnent bien le nouveau solde (${eur(r.controle.nouveau)}).</p>`
    :`<p class="verif ko">Attention : il y a un écart de ${eur(Math.abs(r.controle.ecart))} entre les soldes du relevé et les opérations lues. Une opération a peut-être été oubliée ou mal lue : vérifiez la liste ci-dessous.</p>`)
    :r.found?`<p class="verif">Ce relevé n’indique pas clairement ses soldes : la lecture n’a pas pu être vérifiée automatiquement.</p>`:'';
  const bilan=r.test?(r.found?`${r.found} ${pl(r.found,'opération lue','opérations lues')}${nd?`, dont ${nd} déjà ${pl(nd,'importée','importées')}`:''}.`:'')
    :r.found&&!r.added?`${r.found} ${pl(r.found,'opération lue','opérations lues')}, toutes déjà importées : rien n’a été ajouté.`
    :`${r.found} ${pl(r.found,'opération trouvée','opérations trouvées')}${r.reader?` avec le lecteur « ${esc(r.reader)} »`:''}, ${r.added} ${pl(r.added,'ajoutée','ajoutées')}, ${r.dups} déjà ${pl(r.dups,'connue','connues')}.`;
  const liste=r.lus.length?`<details class="apercu"${r.test||!r.added?' open':''}><summary>${r.test||!r.added?'Opérations lues':'Voir toutes les opérations lues'} (${r.lus.length})</summary>
    ${r.lus.slice().sort((a,b)=>a.date<b.date?-1:1).slice(0,200).map(o=>`<div class="pv${o.dup?' dup':''}"><span>${dfmt(o.date)}</span><span>${esc(o.label)}${o.dup?' <em>déjà importée</em>':''}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></div>`).join('')}
    ${r.lus.length>200?`<p class="note">Et ${r.lus.length-200} autres.</p>`:''}</details>`:'';
  return `<div class="report${r.test?' test':''}"><h4>${esc(r.name)}</h4>${head}
    <p class="count">${bilan}${!r.found?' Aucune ligne n’a été reconnue : voir ci-dessous.':''}</p>
    ${info}${ctl}
    ${r.test&&r.found?`<div class="btn-row" style="margin:14px 0 6px"><button class="btn" data-realimp="${r.imp}">Importer pour de bon</button><button class="link" data-dropreport="${r.imp}">Fermer</button></div>`:''}
    ${!r.test&&r.found?`<div class="acct">Compte :<select class="quiet" data-repacct="${r.imp}">${S.accounts.map(a=>`<option value="${a.id}"${a.id===r.acct?' selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new">Autre compte…</option></select></div>
    ${(a=>a&&!a.confirmed?acctAsk(a,r.isNew):'')(acctById(r.acct))}`:''}
    ${r.test?'':r.sample.slice(0,6).map(opRow).join('')}
    ${liste}
    ${r.raw&&!r.found?`<div class="privacy" style="border-color:var(--line);background:transparent;margin-top:12px"><i data-lucide="file-question"></i><span><b style="font-weight:400">Relevé mal reconnu ?</b> Voici le texte lu dans le PDF, déjà anonymisé : IBAN, numéros et noms sont masqués. Relisez-le, puis envoyez-le à la personne qui vous a transmis l’application : elle pourra faire adapter le lecteur à votre banque.
      <textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="link" data-copy="${r.imp}" style="color:var(--ink)">Copier le texte</button>
      <br><br>Vous avez Claude ? Faites-le vous-même en deux minutes : <button class="link" data-prompt="${r.imp}" style="color:var(--ink)">Copier la demande pour Claude</button>, puis suivez la marche à suivre plus bas, dans « Lecteurs de relevés ».</span></div>`:''}
    ${r.raw&&r.found?`<details><summary>Des opérations manquent ? Voir le texte lu, anonymisé</summary><div class="privacy" style="border-color:var(--line);background:transparent;margin-top:10px"><span>IBAN, numéros et noms sont masqués. Relisez ce texte, puis envoyez-le à la personne qui vous a transmis l’application pour faire adapter le lecteur à votre banque.<textarea class="anon" readonly>${esc(anonymize(r.raw))}</textarea><button class="link" data-copy="${r.imp}" style="color:var(--ink)">Copier le texte</button> <button class="link" data-prompt="${r.imp}" style="color:var(--ink);margin-left:14px">Copier la demande pour Claude</button></span></div></details>`:''}</div>`;
}
function vImport(){
  const nRev=S.ops.filter(o=>o.src==='rev').length;
  return privacyBox()+`<section class="block"><h3 class="sec">Relevés bancaires</h3>
  <label class="drop" data-drop="bank"><input type="file" id="file" accept=".pdf,.csv,application/pdf,text/csv" multiple>
    <p>Déposer des relevés</p><span>PDF ou CSV, plusieurs à la fois. Les opérations déjà importées sont ignorées.</span></label>
  <div class="test-row"><label class="btn gold">Tester un relevé<input type="file" id="testfile" accept=".pdf,.csv,application/pdf,text/csv" style="display:none"></label>
    <span class="note">Pour voir comment un relevé est lu, sans rien enregistrer.</span></div>
  <p class="note">Vous pouvez déposer plusieurs relevés d’un coup, même de banques différentes, par exemple une année complète. Chaque relevé est rattaché à un compte, que vous pouvez renommer.</p>
  <div style="margin-top:26px">${reports.map(reportCard).join('')}</div></section>
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

