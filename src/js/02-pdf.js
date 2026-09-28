/* ============ Lecture PDF ============ */
const AMT=/^[-+]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7}),\d{2}(?:\s?€)?$/;
const DATE_RE=/^(\d{2})[\/.](\d{2})(?:[\/.](\d{2}|\d{4}))?$/;
function toNum(s){let t=String(s).replace(/-$/,'').replace(/EUR/i,'').replace(/[€\s\u00a0\u202f+]/g,'');if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');else if(!/\.\d{1,2}$/.test(t))t=t.replace(/\./g,'');return parseFloat(t)}
const COL_DEB=/^d[ée]bits?(\s+(en\s+)?(€|eur|euros))?\s*(\(€\))?$/i, COL_CRE=/^cr[ée]dits?(\s+(en\s+)?(€|eur|euros))?\s*(\(€\))?$/i;
const MSG_RESEAU='L’application n’a pas fini de se charger. Vérifiez votre connexion internet, puis rechargez la page.';
const SKIP=/^(ANCIEN SOLDE|NOUVEAU SOLDE|SOLDE|TOTAL|TOTAUX|REPORT|PAGE|DATE)\b/i;
const CREDIT_HINT=/\b(VIR(EMENT)? (SEPA )?RECU|VIREMENT DE|REMB|REMBOURSEMENT|AVOIR|SALAIRE|PAIE|VERSEMENT|REMISE)\b/i;

async function parsePDF(file){
  if(!window.pdfjsLib) throw new Error(MSG_RESEAU);
  let doc;
  try{doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise}
  catch(e){throw new Error(e&&e.name==='PasswordException'?'Ce relevé est protégé par un mot de passe. Téléchargez-le à nouveau depuis le site de votre banque, sans protection, puis réessayez.':'Ce fichier n’a pas pu être lu. Vérifiez qu’il s’agit bien d’un relevé PDF téléchargé depuis le site de votre banque, puis réessayez.')}
  const lines=[]; let full='';
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);
    const tc=await page.getTextContent();
    const rows=[];
    for(const it of tc.items){
      const s=(it.str||'').trim(); if(!s) continue;
      const x=it.transform[4], y=it.transform[5], w=it.width||0;
      let r=rows.find(r=>Math.abs(r.y-y)<2.5);
      if(!r){r={y,t:[]};rows.push(r)}
      r.t.push({x,w,s});
    }
    rows.sort((a,b)=>b.y-a.y);
    let deb=null,cre=null;
    for(const r of rows){ r.t.sort((a,b)=>a.x-b.x);
      for(const t of r.t){ if(COL_DEB.test(t.s)) deb=t.x+t.w/2; if(COL_CRE.test(t.s)) cre=t.x+t.w/2; } }
    for(const r of rows){ const text=r.t.map(t=>t.s).join(' '); full+=text+'\n'; lines.push({tokens:r.t,text,deb,cre}); }
  }
  const years=(full.match(/\b20\d{2}\b/g)||[]); const cnt={};years.forEach(y=>cnt[y]=(cnt[y]||0)+1);
  const Y=+(Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]||new Date().getFullYear());
  const custom=applyReaders(lines.map(l=>l.text),full,Y);
  if(custom) return {ops:custom.ops,raw:lines.map(l=>l.text).slice(0,80).join('\n'),full,reader:custom.name};
  const ops=[]; let last=null;
  const LINE=/^(\d{2}[\/.]\d{2}(?:[\/.]\d{2,4})?)\s+(?:(\d{2}[\/.]\d{2}(?:[\/.]\d{2,4})?)\s+)?(.+?)\s+([-+]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7}),\d{2}-?)\s*(?:€|EUR)?(?:\s+([-+]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7}),\d{2}-?)\s*(?:€|EUR)?)?$/i;
  const MO={JANV:'01',JAN:'01',FEVR:'02',FEV:'02',MARS:'03',MAR:'03',AVR:'04',MAI:'05',JUIN:'06',JUIL:'07',AOUT:'08',SEPT:'09',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  lines.forEach(l=>{l.text=l.text.replace(/^(\d{1,2})\s+([A-Za-zéûÉÛ]{3,9})\.?(\s+\d{4})?\s+/,(s,d,mo,yy)=>{const k=norm(mo);const mm=MO[k]||MO[k.slice(0,4)]||MO[k.slice(0,3)];return mm?`${pad(d)}/${mm}${yy?'/'+yy.trim():''} `:s})});
  const hasJan=lines.some(l=>/^\d{2}[\/.]01\b/.test(l.text));
  const header=[];
  for(const l of lines){
    const m=l.text.match(LINE);
    if(m){
      let label=m[3].replace(/\s+/g,' ').trim();
      if(SKIP.test(label)){last=null;continue}
      const dm=m[1].match(/(\d{2})[\/.](\d{2})(?:[\/.](\d{2,4}))?/);
      let y=dm[3]?(dm[3].length===2?2000+ +dm[3]:+dm[3]):Y;
      if(!dm[3]&&dm[2]==='12'&&hasJan) y=Y-1;
      const date=`${y}-${dm[2]}-${dm[1]}`;
      const amtStr=m[4];
      const val=Math.abs(toNum(amtStr));
      if(!isFinite(val)||val===0){last=null;continue}
      let explicit=0,col=0;
      if(/^-/.test(amtStr)||/-$/.test(amtStr)) explicit=-1; else if(/^\+/.test(amtStr)) explicit=1;
      const amtTok=[...l.tokens].reverse().find(t=>AMT.test(t.s)||t.s.endsWith(amtStr.trim()));
      if(l.deb!=null&&l.cre!=null&&amtTok){const cx=amtTok.x+amtTok.w/2; col=Math.abs(cx-l.cre)<Math.abs(cx-l.deb)?1:-1}
      last={date,label,val,explicit,col}; ops.push(last);
    } else if(last && !AMT.test(l.text) && !DATE_RE.test(l.tokens[0]?.s||'') && !SKIP.test(l.text) && l.text.length<70 && last.label.length<110){
      last.label+=' '+l.text.trim();
    } else { last=null; if(!ops.length) header.push(l.text) }
  }
  /* Convention du relevé : si seuls les débits portent un signe moins, un montant sans signe est un crédit, et inversement */
  const hasMinus=ops.some(o=>o.explicit<0), hasPlus=ops.some(o=>o.explicit>0);
  const out=ops.map(o=>{
    const sign=o.explicit||o.col||(hasMinus&&!hasPlus?1:hasPlus&&!hasMinus?-1:CREDIT_HINT.test(o.label)?1:-1);
    return {date:o.date,label:o.label,amount:+(sign*o.val).toFixed(2)};
  });
  return {ops:out,raw:lines.map(l=>l.text).slice(0,80).join('\n'),full,header:header.join('\n')};
}

const BANKS=[['Crédit Agricole',/CREDIT AGRICOLE/],['LCL',/\bLCL\b|CREDIT LYONNAIS/],['BNP Paribas',/BNP PARIBAS/],['Hello bank',/HELLO BANK/],['Société Générale',/SOCIETE GENERALE/],['Crédit Mutuel',/CREDIT MUTUEL/],['CIC',/\bCIC\b/],['Banque Populaire',/BANQUE POPULAIRE/],['Caisse d’Épargne',/CAISSE D.?EPARGNE/],['La Banque Postale',/BANQUE POSTALE/],['BoursoBank',/BOURSORAMA|BOURSOBANK/],['Fortuneo',/FORTUNEO/],['Qonto',/QONTO/],['Shine',/\bSHINE\b/],['N26',/\bN26\b/],['Revolut',/REVOLUT/],['Monabanq',/MONABANQ/],['Crédit du Nord',/CREDIT DU NORD/],['CCF',/\bCCF\b/],['Nickel',/COMPTE-NICKEL|\bNICKEL\b/],['Crédit Coopératif',/CREDIT COOPERATIF/]];
function detectBank(text){const t=norm((text||'').slice(0,6000));const b=BANKS.find(([,re])=>re.test(t));return b?b[0]:null}
/* Numéro de compte : tiré de l'IBAN (11 caractères du numéro de compte), sinon d'une mention « compte n° » */
function detectAccountNo(text){
  const t=norm(text||'').replace(/\u00a0/g,' ');
  const ib=t.match(/\bFR\d{2}(?:\s?[0-9A-Z]{4}){5}\s?[0-9A-Z]{3}\b/);
  if(ib){const c=ib[0].replace(/\s/g,'');return c.slice(14,25)}
  const m=t.match(/\b(?:COMPTE|CPTE)\s*(?:N[°O]?\.?|NUMERO)\s*:?\s*([0-9]{8,11})\b/);
  return m?m[1]:'';
}
/* Solde de fin de relevé, s'il est écrit clairement. Renvoie {solde, date} ou null. */
const SOLDE_FIN=/\b(NOUVEAU SOLDE|SOLDE (FINAL|CREDITEUR|DEBITEUR|AU))\b/, SOLDE_DEBUT=/\b(ANCIEN SOLDE|SOLDE PRECEDENT|SOLDE INITIAL|SOLDE DE DEBUT|REPORT (DU )?SOLDE)\b/;
function soldeDeLigne(l,fallbackDate){
  const am=l.match(/[-+]?(?:\d{1,3}(?:[ . ]\d{3})+|\d{1,7}),\d{2}-?/g); if(!am) return null;
  const raw=am[am.length-1]; let v=Math.abs(toNum(raw)); if(!isFinite(v)) return null;
  if(/DEBITEUR/.test(l)||/^-|-$/.test(raw)) v=-v;
  const dm=l.match(/(\d{2})[\/.](\d{2})[\/.](\d{2,4})/);
  const date=dm?`${dm[3].length===2?'20'+dm[3]:dm[3]}-${dm[2]}-${dm[1]}`:fallbackDate;
  return {solde:+v.toFixed(2),date};
}
/* Solde de fin de relevé, s'il est écrit clairement. Renvoie {solde, date} ou null. */
function detectSolde(text,fallbackDate){
  const lines=norm(text||'').split('\n').filter(l=>SOLDE_FIN.test(l)&&!SOLDE_DEBUT.test(l));
  const r=lines.length?soldeDeLigne(lines[lines.length-1],fallbackDate):null;
  return r&&r.date?r:null;
}
/* Contrôle : ancien solde + opérations lues = nouveau solde. null si le relevé n'indique pas les deux soldes. */
function controleSoldes(res){
  const lines=norm(res.full||'').split('\n');
  const d=lines.find(l=>SOLDE_DEBUT.test(l)), f=[...lines].reverse().find(l=>SOLDE_FIN.test(l)&&!SOLDE_DEBUT.test(l));
  const a=d&&soldeDeLigne(d,''), b=f&&soldeDeLigne(f,'');
  if(!a||!b) return null;
  const ecart=+(a.solde+res.ops.reduce((s,o)=>s+o.amount,0)-b.solde).toFixed(2);
  return {ok:Math.abs(ecart)<0.01,ancien:a.solde,nouveau:b.solde,ecart};
}
function anonymize(t){return (t||'').replace(/\bFR\d{2}[\d A-Z]{10,34}/g,'FR•• (IBAN masqué)').replace(/\b[A-Z]{4}FR[A-Z0-9]{2,5}\b/g,'(BIC masqué)').replace(/\d{6,}/g,m=>'#'.repeat(m.length)).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'(e-mail masqué)').replace(/\b(M\.|MR|MME|MLLE|MONSIEUR|MADAME)\s+[A-ZÀ-Üa-zà-ü' -]{1,40}/gi,'$1 (nom masqué)')}

