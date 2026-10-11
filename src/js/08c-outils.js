/* ============ Copier-coller depuis le site de la banque ============ */
let COLLE=null;
const AUJ=()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()+1,j:d.getDate()}};
/* Date écrite comme sur un site bancaire : 12/09/2026, 12/09, 12 sept. 2026, Lun. 12 sept., Aujourd'hui, Hier */
function dateCollee(s){
  s=norm(String(s)).replace(/^(LUN|MAR|MER|JEU|VEN|SAM|DIM)[A-Z]*\.?\s+/,'').trim();
  const a=AUJ(), iso=(y,m,j)=>`${y}-${pad(m)}-${pad(j)}`;
  if(/^AUJOURD.?HUI/.test(s)) return iso(a.y,a.m,a.j);
  if(/^HIER/.test(s)){const d=new Date();d.setDate(d.getDate()-1);return iso(d.getFullYear(),d.getMonth()+1,d.getDate())}
  const d=parseDateAny(s,a.y); if(!d) return null;
  /* Sans année : une date « dans le futur » appartient à l'année dernière */
  if(!/\d{4}|\/\d{2}$|\.\d{2}$|\s\d{2}$/.test(s)&&d>iso(a.y,a.m,a.j)) return (a.y-1)+d.slice(4);
  return d;
}
const RE_MONT=/[-+]?\s?(?:\d{1,3}(?:[ .  ]\d{3})+|\d{1,7})[,.]\d{2}(?:\s?(?:€|EUR))?/g;
const RE_DEBUT_DATE=/^((?:(?:lun|mar|mer|jeu|ven|sam|dim)[a-zé]*\.?\s+)?\d{1,2}(?:[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|\s+[a-zéû]{3,9}\.?(?:\s+\d{4})?)|aujourd.?hui|hier)\b/i;
/* Renvoie {ops, nonSignes} : ops = [{date,label,amount,signe}] */
function parseCollage(txt,signeDefaut){
  const t=String(txt||'').replace(/−/g,'-').replace(/\r/g,''), lignes=t.split('\n').map(l=>l.trim()).filter(Boolean);
  const out=[], def=signeDefaut==='ren'?1:-1;
  const ajoute=(date,label,m,forceSigne)=>{const x=lireMontant(m);if(!x||!x.v||!date)return;const s=forceSigne||x.signe;label=label.replace(/\s+/g,' ').trim();if(!label||estHorsOp(label))return;
    out.push({date,label,amount:+((s||def)*x.v).toFixed(2),signe:!!s})};
  if(lignes.filter(l=>l.includes('\t')).length>=Math.max(1,lignes.length/2)){
    const rows=lignes.map(l=>l.split('\t').map(c=>c.trim()));
    const h=rows.findIndex(r=>r.some(c=>/date/i.test(c))&&r.some(c=>/d[ée]bit|cr[ée]dit|montant/i.test(c)));
    const H=h>=0?rows[h].map(c=>norm(c)):[], iD=H.findIndex(c=>/DEBIT/.test(c)), iC=H.findIndex(c=>/CREDIT/.test(c));
    for(const r of rows.slice(h+1)){
      const di=r.findIndex(c=>dateCollee(c)); if(di<0) continue;
      const txtc=r.filter((c,i)=>i!==di&&!RE_MONT.test(c)&&(RE_MONT.lastIndex=0,true)&&!dateCollee(c)); RE_MONT.lastIndex=0;
      const label=txtc.sort((a,b)=>b.length-a.length)[0]||'';
      if(iD>=0&&r[iD]&&/\d/.test(r[iD])) ajoute(dateCollee(r[di]),label,r[iD],-1);
      else if(iC>=0&&r[iC]&&/\d/.test(r[iC])) ajoute(dateCollee(r[di]),label,r[iC],1);
      else{const m=r.filter((c,i)=>i!==di).map(c=>c.match(RE_MONT)).filter(Boolean).map(x=>x[0]);if(m.length)ajoute(dateCollee(r[di]),label,m[0])}
    }
  } else {
    /* Texte libre : une opération commence par une date. Son libellé continue sur les lignes suivantes, même après le montant
       (« PRÉLÈVEMENT -6,56 € » puis, dessous, le nom de l'enseigne), jusqu'à la date de l'opération suivante. */
    const aMont=x=>{RE_MONT.lastIndex=0;const r=RE_MONT.test(x);RE_MONT.lastIndex=0;return r};
    const premier=x=>{RE_MONT.lastIndex=0;const r=x.match(RE_MONT);RE_MONT.lastIndex=0;return r&&r[0]};
    let cur=null; const fin=()=>{if(cur&&cur.m) ajoute(cur.date,(cur.txt+' '+cur.suite).replace(RE_MONT,' '),cur.m);cur=null};
    for(const l of lignes){
      const md=l.match(RE_DEBUT_DATE), dt=md&&dateCollee(md[0]);
      if(dt){fin();cur={date:dt,txt:l.slice(md[0].length),m:null,suite:'',n:0}; if(aMont(cur.txt)) cur.m=premier(cur.txt)}
      else if(cur){
        if(!cur.m){cur.txt+=' '+l; if(aMont(cur.txt)) cur.m=premier(cur.txt)}
        else if(!aMont(l)&&!estHorsOp(l)&&cur.n<4&&l.length<90){cur.suite+=' '+l;cur.n++}
        else fin();
      }
    }
    fin();
  }
  return {ops:out,nonSignes:out.filter(o=>!o.signe).length};
}
/* Classement des lignes collées face à ce qui existe déjà */
function classeCollage(ops,acct){
  const deja=compteur(), pris=new Set();
  return ops.map(o=>{if(deja.pris(cleOp(o))) return {...o,etat:'deja'};
    const j=acct&&acct!=='__new'?jumeau(o,acct,pris,()=>true):null;
    if(j){pris.add(j.o.id);return {...o,etat:j.sur?'deja':'doute',twin:j.o.id}} return {...o,etat:'nouveau'}});
}
function compteProbable(){const d=S.ops.filter(o=>o.src!=='rev'&&o.acct).sort((a,b)=>a.date<b.date?1:-1)[0];return d?d.acct:(S.accounts[0]||{}).id||'__new'}
function panneauColler(){
  const c=COLLE;
  const acc=`<label class="champ">Ces opérations viennent de quel compte ?<select class="grand" id="colleAcct">${S.accounts.map(a=>`<option value="${a.id}"${a.id===c.acct?' selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new"${c.acct==='__new'?' selected':''}>Un nouveau compte…</option></select></label>`;
  let ap='';
  if(c.apercu){
    const L=c.apercu, dep=L.filter(o=>o.amount<0).reduce((s,o)=>s-o.amount,0), ren=L.filter(o=>o.amount>0).reduce((s,o)=>s+o.amount,0);
    const nv=L.filter(o=>o.etat==='nouveau').length, dj=L.filter(o=>o.etat==='deja').length, dt=L.filter(o=>o.etat==='doute').length;
    ap=L.length?`<div class="colle-res"><p class="phrase"><b>${L.length} opération${L.length>1?'s':''} lue${L.length>1?'s':''}</b> : ${eur(dep)} de dépenses et ${eur(ren)} de rentrées.</p>
      <p class="aide">Comparez ces deux montants avec ce qu’affiche votre banque : s’ils sont identiques, tout a été lu.</p>
      ${c.nonSignes?`<div class="radios"><p class="f-lbl">Les montants sans signe sont :</p><label><input type="radio" name="csig" data-cs="dep"${c.signe!=='ren'?' checked':''}> des dépenses</label><label><input type="radio" name="csig" data-cs="ren"${c.signe==='ren'?' checked':''}> des rentrées</label></div>`:''}
      <p class="phrase">${nv} nouvelle${nv>1?'s':''}${dj?`, ${dj} déjà présente${dj>1?'s':''} (non ajoutée${dj>1?'s':''})`:''}${dt?`, ${dt} à confirmer`:''}.</p>
      <div class="apercu">${L.slice(0,60).map(o=>`<div class="pv${o.etat==='deja'?' dup':''}"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}${o.etat==='deja'?' <em>déjà présente</em>':o.etat==='doute'?' <em>à confirmer</em>':''}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></div>`).join('')}</div>
      <div class="boutons">${nv+dt?`<button class="btn" data-act="colleok">Ajouter ${nv+dt} opération${nv+dt>1?'s':''}</button>`:''}<button class="lien" data-act="collefin">Fermer</button></div></div>`
      :`<p class="ko-txt">Aucune opération n’a été reconnue. Vérifiez que vous avez bien copié les lignes avec leur date et leur montant.</p>`;
  }
  return `<section class="carte coller"><h3><i data-lucide="clipboard-paste"></i>Coller mes opérations</h3>
    <ol class="etapes-txt"><li>Sur le site de votre banque, sélectionnez les opérations avec la souris ou le doigt, puis copiez (Cmd + C ou « Copier »).</li><li>Collez-les ci-dessous (Cmd + V ou « Coller »).</li><li>Touchez « Lire les opérations », puis vérifiez les deux totaux.</li></ol>
    <textarea id="colleTxt" class="anon colle-txt" placeholder="Collez ici les opérations copiées sur le site de votre banque">${esc(c.texte||'')}</textarea>
    ${acc}
    <div class="boutons"><button class="btn secondaire" data-act="collelire">Lire les opérations</button></div>${ap}</section>`;
}
function lireColle(){
  const c=COLLE; c.texte=$('#colleTxt')?.value||c.texte; c.acct=$('#colleAcct')?.value||c.acct;
  const r=parseCollage(c.texte,c.signe); c.nonSignes=r.nonSignes; c.apercu=classeCollage(r.ops,c.acct);
}
function ajouterColle(){
  const c=COLLE; let acct=c.acct;
  if(acct==='__new'){const n=(prompt('Nom du compte (par exemple « Crédit Agricole »)')||'').trim();if(!n)return;acct=addAccount({name:n.slice(0,40),bank:detectBank(n)||'',type:guessType(detectBank(n)||'','',n)}).id}
  const L=classeCollage(parseCollage(c.texte,c.signe).ops,acct), imp=Math.random().toString(36).slice(2,9), atype=(acctById(acct)||{}).type||'perso';
  let added=0; S.douteux=S.douteux||[]; const nouvelles=[];
  for(const o of L){ if(o.etat==='deja') continue;
    const op={id:Math.random().toString(36).slice(2,10),date:o.date,label:o.label,amount:o.amount,merchant:merchantOf(o.label),acct,imp,src:'paste'};
    S.ops.push(op); added++; dirtyMonths.add(op.date.slice(0,7));
    if(o.etat==='doute') S.douteux.push({a:o.twin,b:op.id});
    appliqueAuto(op,atype); nouvelles.push(op);
  }
  classerNouvelles(nouvelles);
  const a=acctById(acct);
  if(added){S.imports=S.imports||{};S.imports[imp]={nom:'Copier-coller du '+new Date().toLocaleDateString('fr-FR'),quand:Date.now()}}
  reports.unshift({name:'Copier-coller',colle:true,bank:a?a.name:'',acct,found:L.length,added,dups:L.filter(o=>o.etat==='deja').length,completees:0,douteux:L.filter(o=>o.etat==='doute').length,sample:[],lus:L.map(o=>({...o,dup:o.etat==='deja'})),raw:'',imp,test:false});
  if(!S.since) S.since=Date.now();
  S.ops.sort((x,y)=>x.date<y.date?1:-1); stateDirty=true; COLLE=null; P=null; save(); render();
}
/* Deux opérations peut-être identiques : la réponse fusionne (on garde la version du relevé) ou les garde toutes deux */
function douteuxValides(){return (S.douteux||[]).filter(d=>BYID[d.a]&&BYID[d.b])}
function trancherDouteux(i,meme){
  const d=douteuxValides()[i]; if(!d) return;
  if(meme){const a=BYID[d.a],b=BYID[d.b],garde=a.src==='paste'&&b.src!=='paste'?b:a,retire=garde===a?b:a;
    for(const k of ['cat','awaiting','heures']) if(retire[k]!=null&&garde[k]==null) garde[k]=retire[k];
    S.ops=S.ops.filter(o=>o!==retire); dirtyMonths.add(retire.date.slice(0,7)); dirtyMonths.add(garde.date.slice(0,7))}
  S.douteux=S.douteux.filter(x=>x!==d); stateDirty=true; save(); render();
}

/* ============ Assistant de lecture : trois gestes, sans quitter l'application ============ */
let ASSIST=null;
const MONT_LIBRE=/\d[\d .  ]*[,.]\d{2}/;
function lignesAssistant(r){
  return (r.lignes||[]).map((l,i)=>({l,i})).filter(({l})=>l.tokens.length>=3&&l.tokens.some(t=>MONT_LIBRE.test(t.s)&&!DATE_TOK.test(t.s))&&!/SOLDE|TOTAL/i.test(norm(l.text))).slice(0,8);
}
function calculAssistant(r){
  const A=ASSIST, L=r.lignes, tok=([i,k])=>L[i].tokens[k];
  const tD=tok(A.date), tL=tok(A.lib), tM=tok(A.dep);
  const signe=/^\s*[-−]|-\s*$/.test(tM.s);
  /* Colonnes de montants : alignement à droite, sur les lignes qui ont une date au même endroit */
  const xs=[]; for(const l of L){const d=l.tokens.find(t=>Math.abs(t.x-tD.x)<25);if(!d||!parseDateAny(d.s,r.Y))continue;for(const t of l.tokens)if(t!==d&&MONT_LIBRE.test(t.s)&&!DATE_TOK.test(t.s)&&t.x>tL.x)xs.push(droite(t))}
  xs.sort((a,b)=>a-b); const g=[]; for(const x of xs){const q=g[g.length-1];if(q&&x-q.max<18){q.max=x;q.n++;q.s+=x}else g.push({max:x,n:1,s:x})}
  const cs=g.map(x=>x.s/x.n), xd=droite(tM), dep=cs.reduce((b,x)=>Math.abs(x-xd)<Math.abs(b-xd)?x:b,xd);
  const autres=cs.filter(x=>Math.abs(x-dep)>=18).sort((a,b)=>a-b);
  let cols;
  /* Deux colonnes de montants ou plus : la colonne touchée est celle des dépenses, l'autre celle des rentrées, la plus à droite le solde */
  if(!autres.length) cols={date:tD.x,lib:tL.x,mont:dep,...(autres.length?{solde:autres[autres.length-1]}:{})};
  else cols={date:tD.x,lib:tL.x,deb:dep,cre:autres.find(x=>x>dep)??autres[0],...(autres.length>1?{solde:autres[autres.length-1]}:{})};
  const nonSigne=signe?1:-1;
  const ops=lireColonnes(L,cols,r.Y,{libre:1,nonSigne});
  /* Parenthèses : (45,20) est une dépense */
  return {cols,nonSigne,ops,ctl:ops.length?controleSoldes({full:r.full,ops}):null};
}
function panneauAssistant(r){
  const A=ASSIST, etapes=['Touchez la date d’une opération.','Touchez le libellé de cette même opération.','Touchez le montant d’une dépense (de l’argent sorti de votre compte).'];
  if(A.res){const x=A.res, n=x.ops.length, dep=x.ops.filter(o=>o.amount<0).reduce((s,o)=>s-o.amount,0), ren=x.ops.filter(o=>o.amount>0).reduce((s,o)=>s+o.amount,0);
    return `<div class="assistant"><p class="f-m">Résultat</p>
      <p class="phrase"><b>${n} opération${n>1?'s':''} lue${n>1?'s':''}</b> : ${eur(dep)} de dépenses et ${eur(ren)} de rentrées.</p>
      ${x.ctl?(x.ctl.ok?`<p class="verif ok">Relevé vérifié ✓ Les soldes du relevé correspondent aux opérations lues.</p>`:`<p class="ko-txt">Les soldes ne correspondent pas : écart de ${eur(Math.abs(x.ctl.ecart))}. Recommencez en touchant d’autres éléments, sur une autre ligne.</p>`)
        :`<p class="aide">Ce relevé n’indique pas ses soldes : comparez les deux totaux ci-dessus avec votre relevé.</p>`}
      <div class="apercu">${x.ops.slice(0,8).map(o=>`<div class="pv"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}</span><span class="${o.amount>0?'cr':''}">${o.amount>0?'+':'−'}${eur(Math.abs(o.amount))}</span></div>`).join('')}</div>
      <div class="boutons">${n&&!(x.ctl&&!x.ctl.ok)?`<button class="btn" data-act="assistok">C’est juste : retenir et importer</button>`:''}<button class="btn secondaire" data-act="assistreset">Recommencer</button></div></div>`}
  return `<div class="assistant"><p class="f-m">Apprenez à l’application à lire ce relevé</p>
    <p class="aide">Trois gestes, une seule fois pour cette banque : les relevés suivants seront lus tout seuls.</p>
    <p class="etape-assist"><b>${A.step}.</b> ${etapes[A.step-1]}</p>
    <div class="lignes-assist">${lignesAssistant(r).map(({l,i})=>`<div class="ligne-assist">${l.tokens.map((t,k)=>{const sel=[A.date,A.lib,A.dep].some(z=>z&&z[0]===i&&z[1]===k);return `<button class="tok${sel?' choisi':''}" data-tok="${i}:${k}">${esc(t.s)}</button>`}).join('')}</div>`).join('')}</div>
    <button class="lien" data-act="assistreset">Recommencer</button></div>`;
}
function detectionPour(r){
  if(r.bank){const b=BANKS.find(x=>x[0]===r.bank);if(b)return b[1].source}
  const h=norm((r.full||'').split('\n').find(l=>l.trim().length>3)||'').trim().slice(0,40);
  return h?h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'';
}
function validerAssistant(){
  const r=reports.find(x=>x.imp===ASSIST.imp); if(!r||!ASSIST.res) return;
  const nom=r.bank||(r.acctInfo&&r.acctInfo.name)||'Ma banque';
  S.readers=(S.readers||[]).filter(x=>x.nom!==nom);
  S.readers.unshift({nom,detection:detectionPour(r),type:'colonnes',cols:ASSIST.res.cols,nonSigne:ASSIST.res.nonSigne,tol:40});
  stateDirty=true; save(); ASSIST=null;
  relireAvecLecteur(r);
}
/* Un relevé mal lu est retiré entièrement, puis relu avec le nouveau lecteur */
function relireAvecLecteur(r){
  S.ops.filter(o=>o.imp===r.imp).forEach(o=>dirtyMonths.add(o.date.slice(0,7)));
  S.ops=S.ops.filter(o=>o.imp!==r.imp); S.douteux=(S.douteux||[]).filter(d=>BYID[d.a]?.imp!==r.imp&&BYID[d.b]?.imp!==r.imp);
  const f=r.file; reports.splice(reports.indexOf(r),1); if(f) importFiles([f]); else {save();render()}
}
/* Partage d'un lecteur : petit fichier à envoyer à quelqu'un qui a la même banque */
function exporterLecteur(i){
  const r=(S.readers||[])[i]; if(!r) return;
  const data=JSON.stringify({app:'mes-comptes-lecteur',version:1,lecteur:r},null,1), name=`lecteur-${norm(r.nom).toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();
  readerErr=false; readerMsg=`Lecteur « ${r.nom} » exporté : envoyez le fichier ${name} à la personne qui a la même banque.`; render();
}
async function importerLecteur(file){
  readerErr=true;
  try{const j=JSON.parse(await file.text()), r=j&&j.lecteur||j;
    if(!r||!r.nom) throw new Error('Ce fichier n’est pas un lecteur de relevés.');
    if(r.type==='colonnes'){if(!r.cols||r.cols.date==null) throw new Error('Ce lecteur est incomplet.')} else compileReader(r);
    S.readers=(S.readers||[]).filter(x=>x.nom!==r.nom); S.readers.unshift(r); stateDirty=true; save();
    readerErr=false; readerMsg=`Lecteur « ${r.nom} » ajouté : les relevés de cette banque seront lus automatiquement.`;
  }catch(e){readerMsg=e&&e.message&&!/JSON/.test(e.message)?e.message:'Ce fichier n’est pas un lecteur de relevés.'}
  render();
}

/* Supprimer un relevé ajouté par erreur : ses opérations, ses questions en attente, et le compte s'il n'a été créé que pour lui */
/* Relevé rangé dans le mauvais compte (autre banque, autre numéro) : ses opérations passent dans le bon compte */
function deplacerReleve(imp,vers){
  const ops=S.ops.filter(o=>o.imp===imp); if(!ops.length||!vers) return;
  const avant=new Set(ops.map(o=>o.acct));
  if(vers==='__new'){
    const n=(prompt('Nom du nouveau compte (par exemple « Crédit Agricole »)')||'').trim(); if(!n){render();return}
    vers=addAccount({name:n.slice(0,40),bank:detectBank(n)||'',type:guessType(detectBank(n)||'','',n)}).id;
  }
  if(!acctById(vers)||(avant.size===1&&avant.has(vers))) {render();return}
  ops.forEach(o=>{o.acct=vers;dirtyMonths.add(o.date.slice(0,7))});
  /* Un compte resté sans aucune opération est retiré, sauf s'il a été confirmé par vous */
  S.accounts=S.accounts.filter(a=>!(avant.has(a.id)&&a.id!==vers&&!a.confirmed&&!S.ops.some(o=>o.acct===a.id)));
  for(const r of reports) if(r.imp===imp) r.acct=vers;
  stateDirty=true; save(); render();
}
function supprimerReleve(imp){
  const ops=S.ops.filter(o=>o.imp===imp); if(!ops.length) return;
  const nom=(S.imports||{})[imp]?.nom||'ce relevé';
  if(!confirm(`Supprimer « ${nom} » et ses ${ops.length} opération${ops.length>1?'s':''} ? Les rubriques que vous avez choisies sont gardées : si vous le réimportez, tout se rangera de nouveau.`)) return;
  const ids=new Set(ops.map(o=>o.id)), accts=new Set(ops.map(o=>o.acct));
  ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)));
  S.ops=S.ops.filter(o=>o.imp!==imp);
  S.douteux=(S.douteux||[]).filter(d=>!ids.has(d.a)&&!ids.has(d.b));
  if(S.imports) delete S.imports[imp];
  S.accounts=S.accounts.filter(a=>!(accts.has(a.id)&&!a.confirmed&&!S.ops.some(o=>o.acct===a.id)));
  for(let i=reports.length-1;i>=0;i--) if(reports[i].imp===imp) reports.splice(i,1);
  stateDirty=true; P=null; save(); render();
}
