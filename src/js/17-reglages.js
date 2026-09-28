/* ============ Réglages ============ */
const CONSEIL_TAUX='Souvent entre 25 et 45 % selon votre statut. En cas de doute, renseignez-vous auprès de votre centre de formalités ou d’un conseiller.';
function vReglages(){
  const s=S.settings, st=S.ops.length?stats({lvl:'M',...endOf(defaultPeriod())},'all'):null;
  const r=Object.entries(S.rules).sort((a,b)=>a[0].localeCompare(b[0]));
  const annees=[...new Set(S.ops.map(o=>o.date.slice(0,4)))].sort().reverse();
  const perso=S.categories.filter(c=>c.type==='expense'&&c.univers!=='pro'), act=S.categories.filter(c=>c.type==='expense'&&c.univers==='pro');
  const rub=c=>`<div class="rub-reg"><i data-lucide="${c.icon}"></i><span class="rr-nom">${esc(c.name)}</span>
    <button class="lien" data-rencat="${c.id}">Renommer</button>${c.custom?`<button class="lien danger" data-delcat="${c.id}">Supprimer</button>`:''}</div>`;
  return `<h2 class="titre-page">Réglages</h2>
  <button class="carte lien-objectifs" data-tab="objectifs"><span><span class="r-t">Votre objectif, votre temps de travail et vos limites</span><span class="aide">Ils se règlent dans l’onglet Mes objectifs.</span></span><i data-lucide="chevron-right"></i></button>
  <section class="carte" id="reserve"><h3>Votre réserve</h3>
    <label class="champ">Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${s.epargne||''}" placeholder="0"></label>
    ${st&&st.autonomie!=null?`<p class="phrase">Votre réserve couvre ${fmt1(st.autonomie)} mois de dépenses.</p>`:'<p class="aide">Elle indique combien de mois vous tiendriez sans rien encaisser.</p>'}</section>
  ${S.accounts.length?`<section class="carte" id="comptes"><h3>Vos comptes</h3>
    ${S.accounts.map(a=>`<div class="compte-reg"><p class="cr-nom">${esc(a.name)} <button class="lien" data-renacct="${a.id}">Renommer</button></p>
      <p class="aide">Ce compte est-il professionnel, personnel, ou sert-il à tout ?</p>
      <div class="choix gros">${Object.entries(TYPES_LONG).map(([k,l])=>`<button class="choix-btn${a.type===k?' suggere':''}" data-settype="${a.id}:${k}" aria-pressed="${a.type===k}">${l}</button>`).join('')}</div></div>`).join('')}
    <p class="aide">Sans compte pro, l’application vous demandera simplement, pour chaque personne qui vous paie, s’il s’agit d’un client.</p></section>`:''}
  <section class="carte" id="rubriques"><h3>Vos rubriques</h3>
    <p class="aide">Renommez ou supprimez vos rubriques. Les limites de dépenses se fixent dans Mes objectifs.</p>
    ${perso.map(rub).join('')}
    <details class="autre"><summary>Rubriques de l’activité</summary>${act.map(rub).join('')}</details>
    <button class="btn secondaire ajout-btn" data-act="nouvrub" data-de="reglages"><i data-lucide="plus"></i>Ajouter une rubrique</button></section>
  <section class="carte" id="donnees"><h3>Vos données</h3>
    <p class="aide">${mode==='db'?'Vos données sont dans votre espace privé.':'Vos données sont enregistrées dans ce navigateur, sur cet appareil.'} Pour changer d’appareil, sauvegardez ici, puis restaurez sur l’autre appareil.</p>
    <div class="boutons"><button class="btn" data-act="backup">Sauvegarder mes données</button><label class="btn secondaire">Restaurer une sauvegarde<input type="file" id="restorefile" accept=".json,application/json" hidden></label></div>
    ${backupMsg?`<p class="ok-txt">${esc(backupMsg)}</p>`:''}
    <button class="lien danger" data-act="wipe">Tout effacer</button></section>
  ${annees.length?`<section class="carte"><h3>Votre année en revue</h3><div class="boutons">${annees.slice(0,3).map(y=>`<button class="btn secondaire" data-act="review" data-year="${y}">Année ${y}</button>`).join('')}</div></section>`:''}
  <section class="carte"><h3>Présentation</h3><button class="btn secondaire" data-act="relancer">Revoir la présentation</button></section>
  <details class="carte repli" id="avances"><summary>Réglages avancés</summary>
    <label class="champ">La part à garder de côté se calcule sur<select class="grand" data-assiette="1"><option value="ca"${s.assiette!=='resultat'?' selected':''}>ce que vous encaissez</option><option value="resultat"${s.assiette==='resultat'?' selected':''}>ce qui reste après les frais</option></select></label>
    ${S.accounts.filter(a=>a.type==='pro').map(a=>`<label class="champ">Solde du compte ${esc(a.name)} (€)<input type="number" inputmode="decimal" step="0.01" data-solde="${a.id}" value="${a.solde!=null?a.solde:''}"></label>
      <label class="champ">À la date du<input type="date" data-soldedate="${a.id}" value="${esc(a.soldeDate||'')}"></label>`).join('')}
    <h4>Règles apprises</h4>
    ${r.length?r.map(([m,c])=>`<div class="regle"><span>${esc(ruleName(m))}</span><select class="grand" data-rule="${esc(m)}" aria-label="Rubrique pour ${esc(m)}">${catOptions(c)}</select><button class="lien" data-delrule="${esc(m)}">Oublier</button></div>`).join(''):'<p class="aide">Aucune pour l’instant.</p>'}
    <h4 id="lecteurs">Lecteurs de relevés</h4>
    <p class="aide">Si les relevés de votre banque sont mal lus, Claude peut écrire un lecteur. Importez le relevé, touchez « Copier la demande pour Claude » dans son aide à la lecture, collez-la dans Claude, puis collez sa réponse ici.</p>
    <textarea id="readerIn" class="anon" placeholder="Collez ici la réponse de Claude, qui commence par { et finit par }"></textarea>
    <button class="btn secondaire" data-act="addreader">Ajouter ce lecteur</button>
    ${readerMsg?`<p class="${readerErr?'ko-txt':'ok-txt'}">${esc(readerMsg)}</p>`:''}
    ${(S.readers||[]).map((x,i)=>`<div class="regle"><span>${esc(x.nom)}</span><button class="lien" data-lexport="${i}">Exporter ce lecteur</button><button class="lien" data-delreader="${i}">Supprimer</button></div>`).join('')}
    <label class="btn secondaire">Importer un lecteur<input type="file" id="lecteurfile" accept=".json,application/json" hidden></label>
    <p class="aide">Un lecteur reçu d’une personne qui a la même banque s’applique automatiquement aux relevés de cette banque.</p>
  </details>`;
}

/* ============ Démarrage ============ */
function vDemarrage(){
  const s=S.settings, pas=`<p class="etapes" aria-label="Étape ${ONB+1} sur 3">${[0,1,2].map(i=>`<span class="${i===ONB?'on':''}"></span>`).join('')}</p>`;
  if(ONB===0) return `<section class="demarrage">${pas}<h2>Bienvenue</h2>
    <p class="phrase">Cette application vous montre ce que vous gagnez vraiment, et où part votre argent.</p>
    <p class="phrase">Vos comptes restent sur cet appareil : personne d’autre ne peut les voir.</p>
    <div class="boutons"><button class="btn" data-onb="1">Commencer</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
    <button class="lien" data-act="onbfin">Passer</button></section>`;
  if(ONB===1) return `<section class="demarrage">${pas}<h2>Votre objectif</h2>
    <label class="champ">Ce que vous voulez gagner par mois (€)<input type="number" inputmode="numeric" min="0" step="50" data-set="netVise" value="${s.netVise||''}" placeholder="2000"></label>
    <label class="champ">Heures travaillées par semaine<input type="number" inputmode="numeric" min="1" max="100" step="1" data-set="heuresSemaine" value="${s.heuresSemaine||''}" placeholder="40"></label>
    <label class="champ">Part à garder de côté pour vos cotisations et impôts (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="par exemple 22"></label>
    <p class="aide">${CONSEIL_TAUX}</p>
    <p class="phrase prix-live" id="prixLive" aria-live="polite">${phrasePrix()}</p>
    <p class="aide"><button class="lien" data-act="onbfin" data-tab="objectifs">Vous pourrez tout changer plus tard</button>, dans l’onglet Mes objectifs.</p>
    <div class="boutons"><button class="btn" data-onb="2">Continuer</button></div><button class="lien" data-act="onbfin">Passer</button></section>`;
  const cu=S.settings.compteUnique;
  return `<section class="demarrage">${pas}<h2>Ajoutez vos relevés</h2>
    <p class="phrase">Avez-vous un compte bancaire réservé à votre activité ?</p>
    <div class="choix gros"><button class="choix-btn${cu===false?' suggere':''}" data-cu="0" aria-pressed="${cu===false}">Oui, j’ai un compte pro</button><button class="choix-btn${cu===true?' suggere':''}" data-cu="1" aria-pressed="${cu===true}">Non, un seul compte pour tout</button></div>
    ${cu===true?`<p class="aide">Pas de souci : vous aurez simplement à nous dire, pour chaque personne qui vous paie, s’il s’agit d’un client.</p>`:''}
    <p class="phrase">Téléchargez ensuite vos relevés de compte en PDF sur le site de votre banque${cu===true?'':', pro et perso'}, puis ajoutez-les ici.</p>
    <div class="boutons"><button class="btn" data-act="onbfin" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
    <button class="lien" data-act="onbfin">Plus tard</button></section>`;
}
