/* ============ Nouvelle rubrique : petite fenêtre ============ */
let NEWCAT=null, FICHESEL=null;
const ICONES=[['tag','Étiquette'],['dumbbell','Sport'],['graduation-cap','Études'],['music','Musique'],['palette','Création'],['book-open','Lecture'],
  ['coffee','Café'],['wrench','Bricolage'],['flower-2','Jardin'],['bike','Vélo'],['heart','Cœur'],['star','Étoile']];
/* ctx : { de:'accueil'|'fiche'|'question'|'reglages', m: marchand, id: opération } */
function ouvrirRubrique(ctx){NEWCAT={nom:'',univers:'perso',icon:'tag',...ctx};render();setTimeout(()=>$('#nrNom')?.focus(),30)}
function fenetreRubrique(){
  const n=NEWCAT;
  return `<div class="fiche-fond haut" data-act="nrannule"></div><div class="fiche fenetre haut" role="dialog" aria-modal="true" aria-label="Nouvelle rubrique">
    <button class="fermer" data-act="nrannule" aria-label="Fermer"><i data-lucide="x"></i></button>
    <p class="f-m">Nouvelle rubrique</p>
    <label class="champ">Nom<input id="nrNom" type="text" maxlength="40" value="${esc(n.nom)}" placeholder="par exemple : Sport"></label>
    <p class="f-lbl">Pour</p>
    <div class="seg" role="group" aria-label="Type de rubrique"><button data-nru="perso" aria-pressed="${n.univers==='perso'}">Perso</button><button data-nru="pro" aria-pressed="${n.univers==='pro'}">Activité</button></div>
    <p class="f-lbl">Icône</p>
    <div class="icones">${ICONES.map(([ic,l])=>`<button class="icone${n.icon===ic?' choisie':''}" data-nri="${ic}" aria-label="${l}" aria-pressed="${n.icon===ic}"><i data-lucide="${ic}"></i></button>`).join('')}</div>
    ${n.err?`<p class="ko-txt">${esc(n.err)}</p>`:''}
    <div class="boutons"><button class="btn" data-act="nrcree">Créer la rubrique</button><button class="btn secondaire" data-act="nrannule">Annuler</button></div></div>`;
}
function creerRubrique(){
  const n=NEWCAT, nom=($('#nrNom')?.value||'').trim().slice(0,40);
  if(!nom){n.err='Donnez un nom à la rubrique.';render();return}
  if(S.categories.some(c=>c.name.toLowerCase()===nom.toLowerCase())){n.nom=nom;n.err='Une rubrique porte déjà ce nom.';render();return}
  const c={id:'c_'+Math.random().toString(36).slice(2,8),name:nom,icon:n.icon,type:'expense',univers:n.univers,budget:0,fixed:false,custom:true};
  S.categories.push(c); save();
  if(n.de==='question'&&n.m) setRule(n.m,c.id);
  if(n.de==='fiche') FICHESEL=c.id;
  NEWCAT=null; render();
}
