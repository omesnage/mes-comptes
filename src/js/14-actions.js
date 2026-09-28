/* ============ Actions ============ */
function setRule(m,c){S.rules[m]=c;delete S.sugg[m];const mm=m.replace(/\|[+-]$/,'');S.ops.forEach(o=>{if(o.merchant===mm)dirtyMonths.add(o.date.slice(0,7))});save()}
document.addEventListener('click',async e=>{
  const seg=e.target.closest&&e.target.closest('circle[data-cat]');
  if(seg){openCat=seg.dataset.cat;render();const el=document.querySelector(`.cat-row[data-cat="${CSS.escape(openCat)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
  const t=e.target.closest('button'); if(!t) return;
  const d=t.dataset;
  if(d.tab){view=d.tab;openCat=null;render();window.scrollTo({top:0});return}
  if(d.lvl){P.lvl=d.lvl;openCat=null;render();return}
  if(d.shift){P=shift(P,+d.shift);openCat=null;render();return}
  if(d.cat==='_pending'){view='valider';openCat=null;render();window.scrollTo({top:0});return}
  if(d.univ){UNIV=d.univ;saveUI();openCat=null;if(!['synthese','economies','objectifs','operations','remb'].includes(view))view='synthese';OPACC='';render();window.scrollTo({top:0});return}
  if(d.settype){const [id,ty]=d.settype.split(':');const a=acctById(id);if(a){a.type=ty;a.confirmed=true;stateDirty=true;save();render()}return}
  if(d.renacct){const a=acctById(d.renacct);if(!a)return;const n=(prompt('Nouveau nom du compte',a.name)||'').trim();if(!n||n===a.name)return;a.name=n.slice(0,40);stateDirty=true;save();render();return}
  if(d.copy){const ta=t.closest('.privacy').querySelector('textarea');ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(!ok&&navigator.clipboard){navigator.clipboard.writeText(ta.value).then(()=>{t.textContent='Copié'},()=>{t.textContent='Sélectionnez le texte et copiez-le'});return}t.textContent=ok?'Copié':'Sélectionnez le texte et copiez-le';return}
  if(d.prompt){const r=reports.find(x=>x.imp===d.prompt);if(!r)return;copyText(claudePrompt(r.raw),t,'Demande copiée : collez-la dans Claude');return}
  if(d.act==='addreader'){addReader();return}
  if(d.delreader){if(confirm('Supprimer ce lecteur ?')){S.readers.splice(+d.delreader,1);stateDirty=true;save();render()}return}
  if(d.fixed){const c=catById(d.fixed);if(c){c.fixed=!c.fixed;save();render()}return}
  if(d.act==='review'){openReview();return}
  if(d.act==='closereview'){$('#review')?.remove();document.body.style.overflow='';return}
  if(d.act==='backup'){backup_();return}
  if(d.defi){S.challenges=S.challenges.filter(c=>!(c.month===thisMonth()&&c.id===d.defi));S.challenges.push({id:d.defi,month:thisMonth()});save();render();return}
  if(d.undefi){S.challenges=S.challenges.filter(c=>!(c.month===thisMonth()&&c.id===d.undefi));save();render();return}
  if(d.cat){const fromLegend=!!t.closest('.legend');openCat=fromLegend?d.cat:(openCat===d.cat?null:d.cat);render();
    if(fromLegend){const el=document.querySelector(`.cat-row[data-cat="${CSS.escape(openCat)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}return}
  if(d.qok){const s=document.querySelector(`[data-qsel="${CSS.escape(d.qok)}"]`);if(!s.value){s.focus();return}setRule(d.qok,s.value);render();return}
  if(d.await){const o=S.ops.find(x=>x.id===d.await);if(o){if(o.awaiting)delete o.awaiting;else o.awaiting=true;dirtyMonths.add(o.date.slice(0,7));save();render()}return}
  if(d.act==='addcat'){const n=$('#newcat').value.trim();if(!n){$('#newcat').focus();return}
    const ty=$('#newcattype').value;S.categories.push({id:'c_'+Math.random().toString(36).slice(2,8),name:n,icon:ty==='income'?'plus-circle':ty==='pro'?'briefcase':'tag',type:ty==='income'?'income':'expense',univers:ty==='income'?'auto':ty,budget:0,custom:true});save();render();return}
  if(d.delcat){const c=catById(d.delcat);if(!c||!confirm(`Supprimer la rubrique « ${c.name} » ? Les opérations concernées repasseront dans À valider.`))return;
    S.categories=S.categories.filter(x=>x!==c);for(const m in S.rules)if(S.rules[m]===c.id)delete S.rules[m];for(const m in S.sugg)if(S.sugg[m].c===c.id)delete S.sugg[m];
    S.ops.forEach(o=>{if(o.cat===c.id){delete o.cat;dirtyMonths.add(o.date.slice(0,7))}});save();render();return}
  if(d.delrule){delete S.rules[d.delrule];save();render();return}
  if(d.delop){const o=S.ops.find(x=>x.id===d.delop);if(o&&confirm('Supprimer cette opération ?')){S.ops=S.ops.filter(x=>x!==o);dirtyMonths.add(o.date.slice(0,7));save();render()}return}
  if(d.act==='acceptall'){pendingGroups().forEach(g=>{const s=S.sugg[g.m];if(s)setRule(g.m,s.c)});render();return}
  if(d.act==='askclaude'){askClaude(t);return}
  if(d.act==='demo'){startDemo();return}
  if(d.act==='revok'){revImport();return}
  if(d.act==='revcancel'){revDraft=null;render();return}
  if(d.inc){S.incomeSource=d.inc;save();render();return}
  if(d.act==='exitdemo'){exitDemo();render();return}
  if(d.act==='wipe'){if(confirm('Effacer toutes les opérations, règles et budgets ?')){S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)));S=blank();reports.length=0;P=null;save();render()}return}
});
document.addEventListener('change',e=>{
  const t=e.target, d=t.dataset;
  if(d.override){const o=S.ops.find(x=>x.id===d.override);if(!o)return;if(t.value)o.cat=t.value;else delete o.cat;dirtyMonths.add(o.date.slice(0,7));save();render();return}
  if(d.rule){S.rules[d.rule]=t.value;save();render();return}
  if(d.budget){const c=catById(d.budget);c.budget=Math.max(0,+t.value||0);save();return}
  if(d.opacc){OPACC=t.value;render();return}
  if(d.accttype){const a=acctById(d.accttype);if(a){a.type=t.value;a.confirmed=true;stateDirty=true;save();render()}return}
  if(d.solde){const a=acctById(d.solde);if(a){const v=t.value.trim();a.solde=v===''?null:+(+v).toFixed(2);if(a.solde!=null&&!a.soldeDate)a.soldeDate=S.ops.filter(o=>o.acct===a.id).reduce((m,o)=>o.date>m?o.date:m,'')||new Date().toISOString().slice(0,10);a.soldeSrc='saisie';stateDirty=true;save();render()}return}
  if(d.soldedate){const a=acctById(d.soldedate);if(a){a.soldeDate=t.value;a.soldeSrc='saisie';stateDirty=true;save();render()}return}
  if(d.catuniv){const c=catById(d.catuniv);if(c){c.univers=t.value;save();render()}return}
  if(d.assiette){S.settings.assiette=t.value==='resultat'?'resultat':'ca';save();render();return}
  if(d.repacct){let v=t.value;const r=reports.find(x=>x.imp===d.repacct);if(!r)return;
    if(v==='__new'){const n=(prompt('Nom du compte (par exemple « Qonto pro »)')||'').trim();if(!n){render();return}v=addAccount({name:n.slice(0,40),type:guessType('','',n)}).id;r.isNew=true}
    S.ops.forEach(o=>{if(o.imp===r.imp){o.acct=v;dirtyMonths.add(o.date.slice(0,7))}});r.acct=v;
    S.accounts=S.accounts.filter(a=>S.ops.some(o=>o.acct===a.id));stateDirty=true;save();render();return}
  if(d.set){S.settings[d.set]=Math.max(0,+t.value||0);save();return}
  if(t.id==='restorefile'&&t.files.length){restore_(t.files[0]);t.value='';return}
  if(t.id==='file'&&t.files.length){importFiles([...t.files]);t.value=''}
  if(t.id==='revfile'&&t.files.length){if(demo)exitDemo();readRev(t.files[0]);t.value=''}
  if(d.rev){const v=+t.value;if(d.rev==='sheet'){revDraft.sheet=v;detect()}else revDraft[d.rev]=v;render()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#review')){$('#review').remove();document.body.style.overflow=''}});
document.addEventListener('input',e=>{if(e.target.dataset&&(e.target.dataset.set==='netVise'||e.target.dataset.set==='heures')){const el=$('#cibleLive');const v=+e.target.value||0;if(el){const s={...S.settings,[e.target.dataset.set]:v};el.textContent=eur((+s.netVise||SET0.netVise)/(+s.heures||SET0.heures))}}if(e.target.id==='search'){q=e.target.value;const pos=e.target.selectionStart;render();const s=$('#search');s.focus();s.setSelectionRange(pos,pos)}});
['dragover','dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{
  const z=e.target.closest&&e.target.closest('[data-drop]'); if(!z) return; e.preventDefault();
  z.classList.toggle('over',ev==='dragover');
  if(ev==='drop'&&e.dataTransfer.files.length){ if(z.dataset.drop==='rev'){if(demo)exitDemo();readRev(e.dataTransfer.files[0])} else importFiles([...e.dataTransfer.files]); }
}));

async function askClaude(btn){
  const note=$('#askNote');
  const sample=window.claude&&claude.use?await claude.use('sample'):null;
  if(!sample){note.textContent='Les suggestions de Claude ne sont pas disponibles ici. Classez les marchands à la main.';btn.remove();return}
  const list=pendingGroups().filter(g=>!S.sugg[g.m]).map(g=>g.m).slice(0,80);
  btn.disabled=true; btn.textContent='Claude réfléchit…';
  const prompt=`Tu ranges des marchands issus de relevés bancaires français dans des catégories de dépenses personnelles.
Catégories (id : nom) :
${S.categories.map(c=>c.id+' : '+c.name).join('\n')}

Marchands :
${list.join('\n')}

Réponds uniquement avec un tableau JSON, un objet par marchand, sous la forme [{"m":"NOM EXACT DU MARCHAND","c":"id_de_categorie","conf":0.8}]. "conf" va de 0 à 1. Si tu ne sais pas, mets "divers" avec une confiance basse.`;
  try{
    const res=await sample.json(prompt,{modelTier:'quick'});
    const ids=new Set(S.categories.map(c=>c.id)); let n=0;
    (Array.isArray(res)?res:[]).forEach(r=>{if(r&&list.includes(r.m)&&ids.has(r.c)){S.sugg[r.m]={c:r.c,src:'claude',conf:typeof r.conf==='number'?r.conf:null};n++}});
    save(); render();
    if(!n){const nn=$('#askNote'); if(nn) nn.textContent='Claude n’a pas pu proposer de catégorie. Classez ces marchands à la main.'}
  }catch(err){
    btn.disabled=false; btn.textContent='Demander à Claude';
    note.textContent=err&&err.code==='not_granted'?'Autorisation refusée : classez les marchands à la main.':err&&err.code==='rate_limited'?'Trop de demandes d’un coup. Réessayez dans une minute.':'La demande n’a pas abouti. Réessayez plus tard.';
  }
}

