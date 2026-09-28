/* ============ Réglages ============ */
function vReglages(){
  const s=S.settings, st=S.ops.length?stats({lvl:'M',...endOf(defaultPeriod())},'all'):null;
  const r=Object.entries(S.rules).sort((a,b)=>a[0].localeCompare(b[0]));
  const annees=[...new Set(S.ops.map(o=>o.date.slice(0,4)))].sort().reverse();
  const perso=S.categories.filter(c=>c.type==='expense'&&c.univers!=='pro'), act=S.categories.filter(c=>c.type==='expense'&&c.univers==='pro');
  const rub=c=>`<div class="rub-reg"><i data-lucide="${c.icon}"></i><span class="rr-nom">${esc(c.name)}</span>
    ${c.univers!=='pro'?`<label class="rr-budget">Budget<input type="number" inputmode="numeric" min="0" step="10" placeholder="—" value="${c.budget||''}" data-budget="${c.id}" aria-label="Budget mensuel ${esc(c.name)}"></label>`:''}
    <button class="lien" data-rencat="${c.id}">Renommer</button>${c.custom?`<button class="lien danger" data-delcat="${c.id}">Supprimer</button>`:''}</div>`;
  return `<h2 class="titre-page">Réglages</h2>
  <section class="carte" id="objectif"><h3>Votre objectif</h3>
    <label class="champ">Ce que vous voulez gagner par mois (€)<input type="number" inputmode="numeric" min="0" step="50" data-set="netVise" value="${s.netVise||''}" placeholder="2000"></label>
    <label class="champ">Heures travaillées par mois<input type="number" inputmode="numeric" min="1" step="5" data-set="heures" value="${s.heures||''}" placeholder="160"></label>
    <p class="phrase">Une heure de travail doit vous rapporter <b id="cibleLive">${eurH(tauxCible())}</b>.</p>
    <label class="champ">Part de vos encaissements à mettre de côté (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="par exemple 22"></label>
    <p class="aide">Si vous ne savez pas, demandez à votre comptable.</p></section>
  <section class="carte" id="reserve"><h3>Votre réserve</h3>
    <label class="champ">Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${s.epargne||''}" placeholder="0"></label>
    ${st&&st.autonomie!=null?`<p class="phrase">Votre réserve couvre ${fmt1(st.autonomie)} mois de dépenses.</p>`:'<p class="aide">Elle indique combien de mois vous tiendriez sans rien encaisser.</p>'}</section>
  ${S.accounts.length?`<section class="carte" id="comptes"><h3>Vos comptes</h3>
    ${S.accounts.map(a=>`<div class="compte-reg"><p class="cr-nom">${esc(a.name)} <button class="lien" data-renacct="${a.id}">Renommer</button></p>
      <div class="choix">${Object.entries({perso:'Perso',pro:'Pro',mixte:'Mélangé'}).map(([k,l])=>`<button class="choix-btn${a.type===k?' suggere':''}" data-settype="${a.id}:${k}" aria-pressed="${a.type===k}">${l}</button>`).join('')}</div></div>`).join('')}
    <p class="aide">« Mélangé » : un seul compte pour votre activité et votre vie perso. Chaque dépense est alors rangée selon sa rubrique.</p></section>`:''}
  <section class="carte" id="rubriques"><h3>Vos rubriques</h3>
    <p class="aide">Un budget est facultatif : sans budget, une rubrique est comparée à ce que vous dépensez d’habitude.</p>
    ${perso.map(rub).join('')}
    <details class="autre"><summary>Rubriques de l’activité</summary>${act.map(rub).join('')}</details>
    <div class="ajout"><input id="newcat" class="grand" placeholder="Nom de la nouvelle rubrique" maxlength="40" aria-label="Nom de la nouvelle rubrique">
      <select class="grand" id="newcattype" aria-label="Type de rubrique"><option value="perso">Dépense perso</option><option value="pro">Dépense de l’activité</option></select>
      <button class="btn secondaire" data-act="addcat">Ajouter</button></div></section>
  <section class="carte" id="donnees"><h3>Vos données</h3>
    <p class="aide">${mode==='db'?'Vos données sont dans votre espace privé.':'Vos données sont enregistrées dans ce navigateur, sur cet appareil.'} Pour changer d’appareil, sauvegardez ici, puis restaurez sur l’autre appareil.</p>
    <div class="boutons"><button class="btn" data-act="backup">Sauvegarder mes données</button><label class="btn secondaire">Restaurer une sauvegarde<input type="file" id="restorefile" accept=".json,application/json" hidden></label></div>
    ${backupMsg?`<p class="ok-txt">${esc(backupMsg)}</p>`:''}
    <button class="lien danger" data-act="wipe">Tout effacer</button></section>
  ${annees.length?`<section class="carte"><h3>Votre année en revue</h3><div class="boutons">${annees.slice(0,3).map(y=>`<button class="btn secondaire" data-act="review" data-year="${y}">Année ${y}</button>`).join('')}</div></section>`:''}
  <section class="carte"><h3>Présentation</h3><button class="btn secondaire" data-act="relancer">Revoir la présentation</button></section>
  <details class="carte repli" id="avances"><summary>Réglages avancés</summary>
    <label class="champ">La part à mettre de côté se calcule sur<select class="grand" data-assiette="1"><option value="ca"${s.assiette!=='resultat'?' selected':''}>ce que vous encaissez</option><option value="resultat"${s.assiette==='resultat'?' selected':''}>ce qui reste après les frais</option></select></label>
    ${S.accounts.filter(a=>a.type==='pro').map(a=>`<label class="champ">Solde du compte ${esc(a.name)} (€)<input type="number" inputmode="decimal" step="0.01" data-solde="${a.id}" value="${a.solde!=null?a.solde:''}"></label>
      <label class="champ">À la date du<input type="date" data-soldedate="${a.id}" value="${esc(a.soldeDate||'')}"></label>`).join('')}
    <h4>Virements de votre compte pro</h4>
    ${Object.keys(S.virements||{}).length?Object.entries(S.virements).map(([m,k])=>`<div class="regle"><span>${esc(m)}</span><span>${k==='ndf'?'Remboursement de frais':'Rémunération'}</span><button class="lien" data-delvir="${esc(m)}">Oublier</button></div>`).join(''):'<p class="aide">Aucun pour l’instant.</p>'}
    <h4>Règles apprises</h4>
    ${r.length?r.map(([m,c])=>`<div class="regle"><span>${esc(ruleName(m))}</span><select class="grand" data-rule="${esc(m)}" aria-label="Rubrique pour ${esc(m)}">${catOptions(c)}</select><button class="lien" data-delrule="${esc(m)}">Oublier</button></div>`).join(''):'<p class="aide">Aucune pour l’instant.</p>'}
    <h4 id="lecteurs">Lecteurs de relevés</h4>
    <p class="aide">Si les relevés de votre banque sont mal lus, Claude peut écrire un lecteur. Importez le relevé, touchez « Copier la demande pour Claude » dans son aide à la lecture, collez-la dans Claude, puis collez sa réponse ici.</p>
    <textarea id="readerIn" class="anon" placeholder="Collez ici la réponse de Claude, qui commence par { et finit par }"></textarea>
    <button class="btn secondaire" data-act="addreader">Ajouter ce lecteur</button>
    ${readerMsg?`<p class="${readerErr?'ko-txt':'ok-txt'}">${esc(readerMsg)}</p>`:''}
    ${(S.readers||[]).map((x,i)=>`<div class="regle"><span>${esc(x.nom)}</span><span></span><button class="lien" data-delreader="${i}">Supprimer</button></div>`).join('')}
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
    <label class="champ">Heures travaillées par mois<input type="number" inputmode="numeric" min="1" step="5" data-set="heures" value="${s.heures||''}" placeholder="160"></label>
    <label class="champ">Part de vos encaissements à mettre de côté (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="par exemple 22"></label>
    <p class="aide">Si vous ne savez pas, demandez à votre comptable. Vous pourrez tout changer plus tard.</p>
    <div class="boutons"><button class="btn" data-onb="2">Continuer</button></div><button class="lien" data-act="onbfin">Passer</button></section>`;
  return `<section class="demarrage">${pas}<h2>Ajoutez vos relevés</h2>
    <p class="phrase">Téléchargez vos relevés de compte en PDF sur le site de votre banque, pro et perso, puis ajoutez-les ici.</p>
    <div class="boutons"><button class="btn" data-act="onbfin" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
    <button class="lien" data-act="onbfin">Plus tard</button></section>`;
}
