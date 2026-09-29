/* ============ Lecture des relevés : plusieurs méthodes, vérifiées par les soldes ============ */
/* Montant : 1 234,56 · 1.234,56 · 1234.56 · -12,50 · 12,50- · +12,50 € · EUR 12.50 · −12,50 (signe moins typographique) */
const AMTX=/^(?:EUR\s*)?[-+−]?\s?(?:\d{1,3}(?:[ .  ]\d{3})+|\d{1,7})[,.]\d{2}-?\s*(?:€|EUR)?$/i;
const estMontant=s=>AMTX.test(String(s).trim());
function lireMontant(s){
  s=String(s).replace(/−/g,'-').replace(/EUR|€/gi,'').trim();
  const neg=/^-|-$/.test(s), pos=/^\+/.test(s);
  const v=Math.abs(toNum(s.replace(/^[-+]\s*/,'').replace(/-$/,'')));
  return isFinite(v)?{v,signe:neg?-1:pos?1:0}:null;
}
const DATE_TOK=/^\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?$/;
/* Date au début d'une ligne : un, deux ou trois morceaux (« 05/03 », « 5 mars 2026 ») */
function dateEnTete(toks,Y){
  for(let n=Math.min(3,toks.length);n>=1;n--){const s=toks.slice(0,n).map(t=>t.s).join(' ');if(n===1&&!DATE_TOK.test(s)&&!/^\d{1,2}\s+[A-Za-zéû]{3,9}\.?(\s+\d{2,4})?$/.test(s))continue;const d=parseDateAny(s,Y);if(d)return {date:d,n}}
  return null;
}
const centre=t=>t.x+t.w/2, droite=t=>t.x+t.w;
/* Méthode « colonnes » : chaque montant est rangé selon la colonne dont il est le plus proche (débit, crédit, montant signé, solde ignoré) */
function lireColonnes(lines,cols,Y,opts){
  opts=opts||{}; const ops=[]; let last=null, pend=null, pend0=null; const tol=opts.tol||40;
  const libre=opts.libre; /* montants écrits autrement (assistant) : lecture souple */
  const montantTok=t=>libre?/\d[\d . ]*[,.]\d{2}/.test(t.s)&&!DATE_TOK.test(t.s):estMontant(t.s);
  const colDe=t=>{let best=null,bd=1e9;for(const k of ['deb','cre','mont','solde']){if(cols[k]==null)continue;const d=Math.min(Math.abs(droite(t)-cols[k]),Math.abs(centre(t)-cols[k]));if(d<bd){bd=d;best=k}}return bd<=tol?best:null};
  for(const l of lines){
    const toks=l.tokens; if(!toks.length) continue;
    /* Nouveau tableau dans le relevé (détail des achats carte…) : ses colonnes remplacent les précédentes */
    if(opts.suivre){const c=colsEntete([l]);if(c){cols={...cols,...c};if(c.date==null)delete cols.date;last=null;pend=null;continue}}
    const dt=cols.date!=null?(()=>{const i=toks.findIndex(t=>Math.abs(t.x-cols.date)<tol||Math.abs(centre(t)-cols.date)<tol);if(i<0)return null;const r=dateEnTete(toks.slice(i),Y);return r?{...r,i}:null})():dateEnTete(toks,Y);
    const amts=toks.filter(montantTok).map(t=>({t,k:colDe(t)})).filter(x=>x.k&&x.k!=='solde');
    /* Montant écrit sur la ligne suivante, seul (« RÈGLEMENT CARTES DÉBIT DIFFÉRÉ » puis « -3 752,30 € ») */
    if(pend&&!dt&&amts.length===1&&toks.every(t=>montantTok(t)||/^(€|EUR)$/i.test(t.s))){
      const a=amts[0], m=lireMontant(a.t.s); pend=null;
      if(m&&m.v){const s=a.k==='deb'?-1:a.k==='cre'?1:(m.signe||(opts.nonSigne??-1));last={date:pend0.date,label:pend0.label,amount:+(s*m.v).toFixed(2)};ops.push(last);continue}
    }
    pend=null;
    if(dt&&!amts.length&&!libre){
      const lib=toks.slice(dt.i!=null?dt.i+dt.n:dt.n).filter((t,i)=>!(i===0&&DATE_TOK.test(t.s))).map(t=>t.s).join(' ').replace(/\s+/g,' ').trim();
      if(lib&&!estHorsOp(lib)&&!toks.some(t=>montantTok(t))){pend={date:dt.date,label:lib};pend0=pend;last=null;continue}
    }
    if(dt&&amts.length){
      const rest=toks.slice(dt.i!=null?dt.i+dt.n:dt.n).filter(t=>!amts.some(a=>a.t===t)&&!montantTok(t)&&!/^(€|EUR)$/i.test(t.s));
      const lib=rest.filter(t=>!(DATE_TOK.test(t.s)&&t===rest[0])).filter(t=>cols.lib==null||t.x>=cols.lib-tol-60).map(t=>t.s).join(' ').replace(/\s+/g,' ').trim();
      if(!lib||estHorsOp(lib)){last=null;pend=null;continue}
      const a=amts[0], m=libre?{v:Math.abs(toNum((a.t.s.match(/[-+−]?\d[\d . ]*[,.]\d{2}-?/)||[''])[0].replace(/−/g,'-').replace(/-$/,''))),signe:/^-|-$|−|^\(/.test(a.t.s.trim())?-1:/^\+/.test(a.t.s.trim())?1:0}:lireMontant(a.t.s);
      if(!m||!m.v){last=null;continue}
      let s=a.k==='deb'?-1:a.k==='cre'?1:(m.signe||(opts.nonSigne??-1));
      last={date:dt.date,label:lib,amount:+(s*m.v).toFixed(2)}; ops.push(last);
    } else if(last&&!dt&&!amts.length&&!toks.some(t=>montantTok(t))){
      const txt=toks.map(t=>t.s).join(' ').trim();
      if(txt&&!estHorsOp(txt)&&txt.length<70&&last.label.length<110&&!/^(SOLDE|TOTAL|PAGE)/i.test(norm(txt))) last.label+=' '+txt; else last=null;
    } else last=null;
  }
  return ops;
}
/* En-têtes de colonnes : Date, Libellé, Débit, Crédit, Montant, Solde */
function colsEntete(lines){
  for(const l of lines){
    const c={}; for(const t of l.tokens){const s=norm(t.s);
      if(COL_DEB.test(t.s)||/^(DEBIT|DEBITS|SORTIES?)\b/.test(s)) c.deb=droite(t);
      else if(COL_CRE.test(t.s)||/^(CREDIT|CREDITS|ENTREES?)\b/.test(s)) c.cre=droite(t);
      else if(/^MONTANT/.test(s)) c.mont=droite(t);
      else if(/^SOLDE$/.test(s)) c.solde=droite(t);
      else if(/^DATE/.test(s)&&c.date==null) c.date=t.x;
      else if(/^(LIBELLE|OPERATION|NATURE|DETAIL|DESCRIPTION|TRANSACTION)/.test(s)) c.lib=t.x;}
    if((c.deb!=null&&c.cre!=null)||c.mont!=null) return c;
  }
  return null;
}
/* Sans en-tête : colonnes déduites de l'alignement à droite des montants */
function colsGrappes(lines,Y){
  const xs=[]; for(const l of lines){if(!dateEnTete(l.tokens,Y))continue;for(const t of l.tokens)if(estMontant(t.s))xs.push(droite(t))}
  if(!xs.length) return [];
  xs.sort((a,b)=>a-b); const g=[]; for(const x of xs){const d=g[g.length-1];if(d&&x-d.max<18){d.max=x;d.n++;d.s+=x}else g.push({min:x,max:x,n:1,s:x})}
  const c=g.filter(x=>x.n>=1).map(x=>x.s/x.n);
  if(c.length===1) return [{mont:c[0]},{mont:c[0],_nonSigne:1}];
  if(c.length===2) return [{deb:c[0],cre:c[1]},{deb:c[1],cre:c[0]},{mont:c[0],solde:c[1]},{mont:c[0],solde:c[1],_nonSigne:1}];
  return [{deb:c[0],cre:c[1],solde:c[2]},{deb:c[1],cre:c[0],solde:c[2]},{deb:c[0],cre:c[1]}];
}
/* Méthode « lignes » : l'ancienne lecture ligne par ligne */
function lireLignes(lines,Y){
  const ops=[]; let last=null;
  const LINE=/^(\d{2}[\/.]\d{2}(?:[\/.]\d{2,4})?)\s+(?:(\d{2}[\/.]\d{2}(?:[\/.]\d{2,4})?)\s+)?(.+?)\s+([-+]?(?:\d{1,3}(?:[ .  ]\d{3})+|\d{1,7}),\d{2}-?)\s*(?:€|EUR)?(?:\s+([-+]?(?:\d{1,3}(?:[ .  ]\d{3})+|\d{1,7}),\d{2}-?)\s*(?:€|EUR)?)?$/i;
  const MO={JANV:'01',JAN:'01',FEVR:'02',FEV:'02',MARS:'03',MAR:'03',AVR:'04',MAI:'05',JUIN:'06',JUIL:'07',AOUT:'08',SEPT:'09',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const L=lines.map(l=>({...l,text:l.text.replace(/−/g,'-').replace(/^(\d{1,2})\s+([A-Za-zéûÉÛ]{3,9})\.?(\s+\d{4})?\s+/,(s,d,mo,yy)=>{const k=norm(mo);const mm=MO[k]||MO[k.slice(0,4)]||MO[k.slice(0,3)];return mm?`${pad(d)}/${mm}${yy?'/'+yy.trim():''} `:s})}));
  const hasJan=L.some(l=>/^\d{2}[\/.]01\b/.test(l.text));
  for(const l of L){
    const m=l.text.match(LINE);
    if(m){
      let label=m[3].replace(/\s+/g,' ').trim(); if(estHorsOp(label)){last=null;continue}
      const dm=m[1].match(/(\d{2})[\/.](\d{2})(?:[\/.](\d{2,4}))?/);
      let y=dm[3]?(dm[3].length===2?2000+ +dm[3]:+dm[3]):Y; if(!dm[3]&&dm[2]==='12'&&hasJan) y=Y-1;
      const amtStr=m[4], val=Math.abs(toNum(amtStr)); if(!isFinite(val)||val===0){last=null;continue}
      let explicit=0,col=0; if(/^-/.test(amtStr)||/-$/.test(amtStr)) explicit=-1; else if(/^\+/.test(amtStr)) explicit=1;
      const amtTok=[...l.tokens].reverse().find(t=>AMT.test(t.s)||t.s.endsWith(amtStr.trim()));
      if(l.deb!=null&&l.cre!=null&&amtTok){const cx=centre(amtTok); col=Math.abs(cx-l.cre)<Math.abs(cx-l.deb)?1:-1}
      last={date:`${y}-${dm[2]}-${dm[1]}`,label,val,explicit,col}; ops.push(last);
    } else if(last && !AMT.test(l.text) && !DATE_RE.test(l.tokens[0]?.s||'') && !estHorsOp(l.text) && l.text.length<70 && last.label.length<110){ last.label+=' '+l.text.trim() }
    else last=null;
  }
  const hasMinus=ops.some(o=>o.explicit<0), hasPlus=ops.some(o=>o.explicit>0);
  return ops.map(o=>({date:o.date,label:o.label,amount:+((o.explicit||o.col||(hasMinus&&!hasPlus?1:hasPlus&&!hasMinus?-1:CREDIT_HINT.test(o.label)?1:-1))*o.val).toFixed(2)}));
}
/* Lecteurs intégrés : banques reconnues, méthode préférée. Ils passent aussi par la vérification des soldes. */
const INTEGRES=[['Crédit Agricole','colonnes'],['BNP Paribas','colonnes'],['Société Générale','colonnes'],['LCL','colonnes'],['Crédit Mutuel','colonnes'],['CIC','colonnes'],
  ['Banque Populaire','colonnes'],['Caisse d’Épargne','colonnes'],['La Banque Postale','colonnes'],['BoursoBank','lignes'],['Qonto','lignes'],['Shine','colonnes']];
/* Carte à débit différé : le relevé détaille les achats carte puis les reprend en une seule ligne
   (« RÈGLEMENT CARTES DÉBIT DIFFÉRÉ »). Si une suite d'achats lus tombe exactement sur ce montant,
   le détail est gardé (plus parlant) et la ligne groupée est écartée, pour ne rien compter deux fois. */
const DIFFERE=/DEBIT DIFFERE|CARTES? (A )?DIFFERE|FACTURE CARTE|RELEVE (DE )?CARTE|REGLEMENT CARTE|ARRETE CARTE|TOTAL CARTE/;
function sansDoubleCarte(ops){
  let out=ops, retire=[];
  for(const g of ops.filter(o=>o.amount<0&&DIFFERE.test(norm(o.label)))){
    const reste=out.filter(o=>o!==g), cible=g.amount; let trouve=false;
    for(let i=0;i<reste.length&&!trouve;i++){let s=0;for(let j=i;j<reste.length;j++){s+=reste[j].amount;if(j>i&&Math.abs(s-cible)<0.005){trouve=true;break}}}
    if(trouve){out=reste;retire.push(g)}
  }
  return {ops:out,retire};
}
/* Toutes les méthodes sont essayées ; la première dont les soldes tombent juste l'emporte. Sinon, la plus plausible. */
function lireReleve(lines,full,Y){
  const texts=lines.map(l=>l.text), cand=[];
  for(const r of (S.readers||[])){try{
    const det=r.detection?new RegExp(r.detection,'i'):null; if(det&&!det.test(full)) continue;
    const ops=r.type==='colonnes'?lireColonnes(lines,r.cols,Y,{nonSigne:r.nonSigne,libre:1,tol:r.tol}):readWith(compileReader(r),texts,Y);
    if(ops.length) cand.push({ops,methode:'lecteur',reader:r.nom,prio:0})}catch(e){}}
  const bank=detectBank(full), integ=INTEGRES.find(b=>b[0]===bank);
  const ent=colsEntete(lines);
  if(ent) for(const ns of [-1,1]) cand.push({ops:lireColonnes(lines,ent,Y,{nonSigne:ns,suivre:1}),methode:'colonnes',prio:integ&&integ[1]==='colonnes'?1:2});
  cand.push({ops:lireLignes(lines,Y),methode:'lignes',prio:integ&&integ[1]==='lignes'?1:2});
  for(const g of colsGrappes(lines,Y)) cand.push({ops:lireColonnes(lines,g,Y,{nonSigne:g._nonSigne?1:-1}),methode:'grappes',prio:3});
  for(const c of cand){const d=sansDoubleCarte(c.ops);c.ops=d.ops;c.carte=d.retire}
  const valides=cand.filter(c=>c.ops.length);
  for(const c of valides) c.ctl=controleSoldes({full,ops:c.ops});
  const ok=valides.filter(c=>c.ctl&&c.ctl.ok).sort((a,b)=>a.prio-b.prio)[0];
  const best=ok||valides.sort((a,b)=>a.prio-b.prio||b.ops.length-a.ops.length)[0];
  if(!best) return {ops:[],methode:null,verifie:false};
  return {ops:best.ops,methode:best.methode,reader:best.reader||(ok&&integ?integ[0]:''),verifie:!!ok,ctl:best.ctl,carte:best.carte||[]};
}
