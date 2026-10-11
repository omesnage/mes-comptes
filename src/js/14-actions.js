/* ============ Actions ============ */
function setRule(m,c){const mm=m.replace(/\|[+-]$/,'');S.rules[m]=c;delete S.sugg[mm];S.ops.forEach(o=>{if(o.merchant===mm)dirtyMonths.add(o.date.slice(0,7))});save()}
function aller(tab,ancre){
  view=tab;openCat=null;FICHE=null;MODAL=null;BCAT=null;render();
  const el=ancre&&document.getElementById(ancre);
  if(el){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({block:'start'});const i=el.querySelector('input');if(i&&el.id==='taux-champ')i.focus()}else window.scrollTo({top:0});
}
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.bcat&&e.target.tagName==='circle'){e.preventDefault();BCAT=e.target.dataset.bcat;render()}});
document.addEventListener('click',async e=>{
  const part=e.target.closest&&e.target.closest('circle[data-bcat]'); if(part){BCAT=part.dataset.bcat;render();return}
  const t=e.target.closest&&e.target.closest('button,[data-act="closefiche"]'); if(!t) return;
  const d=t.dataset;
  if(d.modal){MODAL={type:d.modal,src:d.src||''};render();setTimeout(()=>$('.fenetre .fermer')?.focus(),30);return}
  if(d.act==='mclose'){MODAL=null;render();return}
  if(d.act==='nrannule'){NEWCAT=null;render();return}
  if(d.act==='nrcree'){creerRubrique();return}
  if(d.nru){NEWCAT.nom=$('#nrNom').value;NEWCAT.univers=d.nru;render();return}
  if(d.nri){NEWCAT.nom=$('#nrNom').value;NEWCAT.icon=d.nri;render();return}
  if(d.act==='nouvrub'){ouvrirRubrique({de:d.de||'accueil'});return}
  if(d.act==='releve'){RELEVE=!RELEVE;render();return}
  if(d.act==='closefiche'){RELEVE=false;FICHE=null;BCAT=null;FICHESEL=null;render();return}
  if(d.blvl){PB.lvl=d.blvl;BTOUT=false;render();return}
  if(d.bshift){PB=shift(PB,+d.bshift);BTOUT=false;render();return}
  if(d.bu){BU=d.bu;BCAT=null;render();return}
  if(d.bcat){BCAT=d.bcat;render();setTimeout(()=>$('.fiche .fermer')?.focus(),30);return}
  if(d.autres||d.btout){BTOUT=!BTOUT;render();return}
  if(d.bmois){const [y,m]=d.bmois.split('-').map(Number);PB={lvl:'M',y,m};BCAT=null;BTOUT=false;render();window.scrollTo({top:0});return}
  if(d.act==='onbfin'){S.onboarded=true;ONB=0;save();aller(d.tab||'accueil');return}
  if(d.cu){S.settings.compteUnique=d.cu==='1';save();render();return}
  if(d.onb){ONB=+d.onb;render();window.scrollTo({top:0});return}
  if(d.act==='relancer'){S.onboarded=false;ONB=0;save();render();window.scrollTo({top:0});return}
  if(d.tab){aller(d.tab,d.ancre);return}
  if(d.scroll){const el=document.getElementById(d.scroll);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(d.act==='wizlater'){WIZ.later=true;render();return}
  if(d.act==='wizresume'){WIZ.later=false;render();return}
  if(d.act==='validall'){validerSuggestions();return}
  if(d.act==='valdev'){validerDevinees();return}
  if(d.act==='reclasser'){const n=reclasserDevinees(), r=pendingGroups().length;alert((n?n+' opération'+(n>1?'s':'')+' reclassée'+(n>1?'s':'')+' avec le dictionnaire à jour.':'Aucune opération n’a changé de rubrique.')+'\n\nIl reste '+r+' marchand'+(r>1?'s':'')+' à vérifier.\n(Dictionnaire du 30 septembre, version 3)');return}
  if(d.idk){jeNeSaisPas(d.idk);return}
  if(d.act==='cloud'){sauvegardeCloud();return}
  if(d.imptype){IMPTYPE=IMPTYPE===d.imptype?null:d.imptype;render();return}
  if(d.alvl){AL=d.alvl;openCat=null;render();return}
  if(d.ashift){P=shift({...P,lvl:AL},+d.ashift);P.lvl='M';openCat=null;render();return}
  if(d.shift){P=shift(P,+d.shift);openCat=null;render();return}
  if(d.act==='camembert'){ouvrirCamembert();return}
  if(d.act==='camimporter'){$('#camPage')?.remove();document.body.style.overflow='';aller('importer');return}
  if(d.act==='closecam'){$('#camPage')?.remove();document.body.style.overflow='';return}
  if(d.clvl){CAM.lvl=d.clvl;majCam();return}
  if(d.cshift){const n=shift({lvl:CAM.lvl,y:CAM.y,m:CAM.m},+d.cshift);CAM.y=n.y;CAM.m=n.m;majCam();return}
  if(d.camcat){CAM.open=CAM.open===d.camcat?null:d.camcat;majCam();return}
  if(d.camautres){CAM.autres=!CAM.autres;majCam();return}
  if(d.camvoir){FIL={lvl:CAM.lvl,cat:d.camvoir,du:'',au:''};P={lvl:'M',y:CAM.y,m:CAM.m};$('#camPage')?.remove();document.body.style.overflow='';aller('operations');return}
  if(d.cside){CAM.u=d.cside;majCam();return}
  if(d.act==='restok'){if(RESTAURER)appliquerRestauration(RESTAURER);return}
  if(d.act==='restno'){RESTAURER=null;render();return}
  if(d.oshift){const n=shift({...P,lvl:FIL.lvl},+d.oshift);P={lvl:'M',y:n.y,m:n.m};render();return}
  if(d.flvl){FIL.lvl=d.flvl;if(d.flvl==='D'&&!FIL.du&&!FIL.au){const [a,b]=bounds({...P,lvl:'M'});FIL.du=a+'-01';FIL.au=b+'-'+pad(new Date(P.y,P.m,0).getDate())}render();return}
  if(d.act==='filreset'){FIL={lvl:'M',cat:'',du:'',au:''};render();return}
  if(d.op){RELEVE=false;FICHE=d.op;FICHESEL=null;render();setTimeout(()=>$('.fiche .fermer')?.focus(),30);return}
  if(d.cat){openCat=openCat===d.cat?null:d.cat;render();return}
  if(d.qcat){setRule(d.qcat,d.c);render();return}
  if(d.heures){HEURES=d.heures;render();setTimeout(()=>$('#heuresIn')?.focus(),30);return}
  if(d.heuresok){const o=BYID[d.heuresok],v=+($('#heuresIn')?.value||0);if(o){if(v>0)o.heures=+v.toFixed(2);else delete o.heures;dirtyMonths.add(o.date.slice(0,7));save()}HEURES=null;render();return}
  if(d.defiok){S.challenges=S.challenges.filter(c=>!(c.id==='auto'&&c.month===d.month));S.challenges.push({id:'auto',key:newId('d_'),month:d.month,cat:d.defiok,limite:+d.limite,habitude:+d.hab});save();render();return}
  if(d.undefi){S.challenges=S.challenges.filter(c=>c.key!==d.undefi);save();render();return}
  if(d.act==='savefiche'){const o=BYID[d.id], v=$('#ficheCat').value, tout=document.querySelector('input[name="portee"]:checked')?.value!=='une';
    if(o&&v){if(tout){delete o.cat;const dk=o.merchant+(o.amount>0?'|+':'|-'), mixte=S.ops.some(x=>x.merchant===o.merchant&&(x.amount>0)!==(o.amount>0)), k=S.rules[dk]||mixte||(S.rules[o.merchant]&&typeOf(v)!==typeOf(S.rules[o.merchant]))?dk:o.merchant;setRule(k,v);S.ops.forEach(x=>{if(x.merchant===o.merchant&&x.cat){delete x.cat;dirtyMonths.add(x.date.slice(0,7))}})}else{o.cat=v;dirtyMonths.add(o.date.slice(0,7))}save()}
    FICHE=null;FICHESEL=null;render();return}
  if(d.settype){const [id,ty]=d.settype.split(':');const a=acctById(id);if(a){a.type=ty;a.confirmed=true;stateDirty=true;save();render()}return}
  if(d.renacct){const a=acctById(d.renacct);if(!a)return;const n=(prompt('Nouveau nom du compte',a.name)||'').trim();if(!n||n===a.name)return;a.name=n.slice(0,40);stateDirty=true;save();render();return}
  if(d.rencat){const c=catById(d.rencat);if(!c)return;const n=(prompt('Nouveau nom de la rubrique',c.name)||'').trim();if(!n||n===c.name)return;c.name=n.slice(0,40);save();render();return}
  if(d.copy){const ta=t.closest('details').querySelector('textarea');copyText(ta.value,t,'Texte copié');return}
  if(d.prompt){const r=reports.find(x=>x.imp===d.prompt);if(!r)return;copyText(claudePrompt(r.raw),t,'Demande copiée : collez-la dans Claude');return}
  if(d.act==='addreader'){addReader();return}
  if(d.act==='coller'){COLLE=COLLE?null:{texte:'',acct:compteProbable(),apercu:null,signe:'dep'};render();setTimeout(()=>$('#colleTxt')?.focus(),30);return}
  if(d.act==='collelire'){lireColle();render();return}
  if(d.act==='colleok'){ajouterColle();return}
  if(d.act==='collefin'){COLLE=null;render();return}
  if(d.dout){const [i,m]=d.dout.split(':');trancherDouteux(+i,m==='1');return}
  if(d.assist){ASSIST={imp:d.assist,step:1};render();return}
  if(d.act==='assistreset'){ASSIST={imp:ASSIST.imp,step:1};render();return}
  if(d.act==='assistok'){validerAssistant();return}
  if(d.tok){const [i,k]=d.tok.split(':').map(Number);const A=ASSIST;if(!A)return;const r=reports.find(x=>x.imp===A.imp);
    if(A.step===1){A.date=[i,k];A.step=2}else if(A.step===2){A.lib=[i,k];A.step=3}else{A.dep=[i,k];A.res=calculAssistant(r)}render();return}
  if(d.lexport){exporterLecteur(+d.lexport);return}
  if(d.lclaude){const r=reports.find(x=>x.imp===d.lclaude),ta=$('#claude-'+d.lclaude);if(!r||!ta)return;$('#readerIn')||document.body.insertAdjacentHTML('beforeend','<textarea id="readerIn" hidden></textarea>');$('#readerIn').value=ta.value;addReader();
    if(!readerErr&&r.file) relireAvecLecteur(r); else alert(readerMsg);return}
  if(d.realimp){const i=reports.findIndex(x=>x.imp===d.realimp);if(i<0)return;const f=reports[i].file;reports.splice(i,1);importFiles([f]);return}
  if(d.dropreport){const i=reports.findIndex(x=>x.imp===d.dropreport);if(i>=0)reports.splice(i,1);render();return}
  if(d.delreader){if(confirm('Supprimer ce lecteur ?')){S.readers.splice(+d.delreader,1);stateDirty=true;save();render()}return}
  if(d.act==='review'){openReview(d.year);return}
  if(d.act==='closereview'){$('#review')?.remove();document.body.style.overflow='';return}
  if(d.act==='backup'){backup_();return}
  if(d.await){const o=S.ops.find(x=>x.id===d.await);if(o){if(o.awaiting)delete o.awaiting;else o.awaiting=true;dirtyMonths.add(o.date.slice(0,7));save();render()}return}
  if(d.act==='addcat'){const n=$('#newcat').value.trim();if(!n){$('#newcat').focus();return}
    const ty=$('#newcattype').value;S.categories.push({id:'c_'+Math.random().toString(36).slice(2,8),name:n.slice(0,40),icon:ty==='pro'?'briefcase':'tag',type:'expense',univers:ty,budget:0,custom:true});save();render();return}
  if(d.delcat){const c=catById(d.delcat);if(!c||!confirm(`Supprimer la rubrique « ${c.name} » ? Ses opérations repasseront dans « À vérifier ».`))return;
    S.categories=S.categories.filter(x=>x!==c);for(const m in S.rules)if(S.rules[m]===c.id)delete S.rules[m];for(const m in S.sugg)if(S.sugg[m].c===c.id)delete S.sugg[m];
    S.ops.forEach(o=>{if(o.cat===c.id){delete o.cat;dirtyMonths.add(o.date.slice(0,7))}});save();render();return}
  if(d.delrule){delete S.rules[d.delrule];save();render();return}
  if(d.delimp){supprimerReleve(d.delimp);return}
  if(d.delop){const o=S.ops.find(x=>x.id===d.delop);if(o&&confirm('Supprimer cette opération ?')){S.ops=S.ops.filter(x=>x!==o);dirtyMonths.add(o.date.slice(0,7));FICHE=null;save();render()}return}
  if(d.act==='demo'){startDemo();return}
  if(d.act==='revok'){revImport();return}
  if(d.act==='revcancel'){revDraft=null;render();return}
  if(d.act==='exitdemo'){exitDemo();render();return}
  if(d.act==='choisirsauv'){$('#restorefile2')?.click();return}
  if(d.act==='wipe'){WIPE=true;render();return}
  if(d.act==='wipeno'){WIPE=false;render();return}
  if(d.act==='wipeok'){WIPE=false;S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)));S=blank();S.onboarded=true;reports.length=0;P=null;save();aller('accueil');return}
});
document.addEventListener('change',e=>{
  const t=e.target, d=t.dataset;
  if(d.rule){S.rules[d.rule]=t.value;save();render();return}
  if(d.limite||d.limper){const id=d.limite||d.limper,c=catById(id);if(!c)return;const row=t.closest('.limite-reg');const v=+row.querySelector('[data-limite]').value||0, per=row.querySelector('[data-limper]').value;c.limite=v>0?{montant:v,per}:null;save();return}
  if(d.devsel){if(t.value){DEV_OUVERT=true;setRule(d.devsel,t.value);if(S.auto)delete S.auto[d.devsel];render()}return}
  if(d.opcat){const o=BYID[d.opcat];if(o&&t.value){LIGNES.add(d.gk);o.cat=t.value;dirtyMonths.add(o.date.slice(0,7));stateDirty=true;save();render()}return}
  if(d.moveimp){deplacerReleve(d.moveimp,t.value);return}
  if(d.qsel){if(t.value==='__new'){t.value='';ouvrirRubrique({de:'question',m:d.qsel});return}if(t.value){setRule(d.qsel,t.value);render()}return}
  if(t.id==='filtreCat'){FIL.cat=t.value;render();return}
  if(t.id==='filtreDu'||t.id==='filtreAu'){FIL[t.id==='filtreDu'?'du':'au']=t.value;render();return}
  if(t.id==='ficheCat'){if(t.value==='__new'){t.value=FICHESEL||'';ouvrirRubrique({de:'fiche',id:FICHE})}else FICHESEL=t.value||null;return}
  if(d.repacct){let v=t.value;const r=reports.find(x=>x.imp===d.repacct);if(!r)return;
    if(v==='__new'){const n=(prompt('Nom du compte')||'').trim();if(!n){render();return}v=addAccount({name:n.slice(0,40),type:guessType('','',n)}).id;r.isNew=true}
    S.ops.forEach(o=>{if(o.imp===r.imp){o.acct=v;dirtyMonths.add(o.date.slice(0,7))}});r.acct=v;
    S.accounts=S.accounts.filter(a=>S.ops.some(o=>o.acct===a.id));stateDirty=true;save();render();return}
  if(d.solde){const a=acctById(d.solde);if(a){const v=t.value.trim();a.solde=v===''?null:+(+v).toFixed(2);if(a.solde!=null&&!a.soldeDate)a.soldeDate=S.ops.filter(o=>o.acct===a.id).reduce((m,o)=>o.date>m?o.date:m,'')||todayStr();a.soldeSrc='saisie';stateDirty=true;save();render()}return}
  if(d.soldedate){const a=acctById(d.soldedate);if(a){a.soldeDate=t.value;a.soldeSrc='saisie';stateDirty=true;save();render()}return}
  if(d.assiette){S.settings.assiette=t.value==='resultat'?'resultat':'ca';save();render();return}
  if(d.inc){S.incomeSource=d.inc;save();render();return}
  if(d.set){S.settings[d.set]=t.value===''?'':Math.max(0,+t.value||0);save();if(MODAL)render();return}
  if(t.id==='restorefile'&&t.files.length){restore_(t.files[0]);t.value='';return}
  if(t.id==='restorefile2'&&t.files.length){const f=t.files[0];t.value='';restore_(f).then(()=>aller('reglages','donnees'));return}
  if(t.id==='lecteurfile'&&t.files.length){importerLecteur(t.files[0]);t.value='';return}
  if(d.cs){COLLE.signe=d.cs;lireColle();render();return}
  if(t.id==='colleAcct'&&COLLE){COLLE.texte=$('#colleTxt')?.value??COLLE.texte;COLLE.acct=t.value;if(COLLE.apercu)lireColle();render();return}
  if(t.id==='file'&&t.files.length){importFiles([...t.files]);t.value=''}
  if(t.id==='testfile'&&t.files.length){testerFichier(t.files[0]);t.value=''}
  if(t.id==='revfile'&&t.files.length){if(demo)exitDemo();readRev(t.files[0]);t.value=''}
  if(d.rev){const v=+t.value;if(d.rev==='sheet'){revDraft.sheet=v;detect()}else revDraft[d.rev]=v;render()}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='heuresIn'){e.preventDefault();$('[data-heuresok]')?.click();return}if(e.key==='Enter'&&e.target.id==='nrNom'){e.preventDefault();creerRubrique();return}if(e.key!=='Escape')return;if(NEWCAT){NEWCAT=null;render();return}if(MODAL){MODAL=null;render();return}if(FICHE||BCAT){FICHE=null;BCAT=null;render();return}if($('#review')){$('#review').remove();document.body.style.overflow=''}});
document.addEventListener('input',e=>{
  const d=e.target.dataset||{};
  if(d.set){const el=$('#prixLive');if(el){const sur={};document.querySelectorAll('[data-set]').forEach(i=>{if(i.value!=='')sur[i.dataset.set]=+i.value;else sur[i.dataset.set]=''});el.innerHTML=phrasePrix(sur)}}
  if(e.target.id==='colleTxt'&&COLLE){COLLE.texte=e.target.value;return}
  if(e.target.id==='search'){q=e.target.value;const pos=e.target.selectionStart;render();const s=$('#search');s.focus();s.setSelectionRange(pos,pos)}
});
['dragover','dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{
  const z=e.target.closest&&e.target.closest('[data-drop]'); if(!z) return; e.preventDefault();
  z.classList.toggle('over',ev==='dragover');
  if(ev==='drop'&&e.dataTransfer.files.length){ if(z.dataset.drop==='rev'){if(demo)exitDemo();readRev(e.dataTransfer.files[0])} else importFiles([...e.dataTransfer.files]); }
}));
