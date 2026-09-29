/* ============ Lecture PDF ============ */
const AMT=/^[-+]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7}),\d{2}(?:\s?€)?$/;
const DATE_RE=/^(\d{2})[\/.](\d{2})(?:[\/.](\d{2}|\d{4}))?$/;
function toNum(s){let t=String(s).replace(/-$/,'').replace(/EUR/i,'').replace(/[€\s\u00a0\u202f+]/g,'');if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');else if(!/\.\d{1,2}$/.test(t))t=t.replace(/\./g,'');return parseFloat(t)}
const COL_DEB=/^d[ée]bits?(\s+(en\s+)?(€|eur|euros))?\s*(\(€\))?$/i, COL_CRE=/^cr[ée]dits?(\s+(en\s+)?(€|eur|euros))?\s*(\(€\))?$/i;
const MSG_RESEAU='L’application n’a pas fini de se charger. Vérifiez votre connexion internet, puis rechargez la page.';
const SKIP=/^(ANCIEN SOLDE|NOUVEAU SOLDE|SOLDE|TOTAL|TOTAUX|REPORT|PAGE|DATE)\b/i;
/* Lignes de solde ou de total, quelle que soit la formulation (« Votre ancien solde », « Total des débits »,
   « Montant comptabilisé ») : jamais des opérations, elles servent seulement au contrôle.
   Exceptions : « solde de tout compte » (un vrai versement), une station TOTAL payée par carte. */
function estHorsOp(lib){
  const t=norm(lib||'').replace(/SOLDE DE TOUT COMPTE/g,'');
  if(SKIP.test(lib)||/\bSOLDE\b|\bMONTANT COMPTABILISE\b/.test(t)) return true;
  return /\b(TOTAL|TOTAUX|SOUS.?TOTAL)\b/.test(t)&&!/^(CB|CARTE|PAIEMENT|ACHAT|PRLV|PRELEVEMENT|RETRAIT|DAB)\b/.test(t);
}
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
  const header=[]; for(const l of lines){if(dateEnTete(l.tokens,Y)&&l.tokens.some(t=>estMontant(t.s)))break;header.push(l.text)}
  const r=lireReleve(lines,full,Y);
  return {ops:r.ops,raw:lines.map(l=>l.text).slice(0,80).join('\n'),full,header:header.join('\n'),reader:r.reader,methode:r.methode,verifie:r.verifie,carte:r.carte,
    lignes:lines.map(l=>({text:l.text,tokens:l.tokens.map(t=>({x:t.x,w:t.w,s:t.s}))})),Y};
}

const BANKS=[['Crédit Agricole',/CREDIT AGRICOLE/],['LCL',/\bLCL\b|CREDIT LYONNAIS/],['BNP Paribas',/BNP PARIBAS/],['Hello bank',/HELLO BANK/],['Société Générale',/SOCIETE GENERALE/],['Crédit Mutuel',/CREDIT MUTUEL/],['CIC',/\bCIC\b/],['Banque Populaire',/BANQUE POPULAIRE/],['Caisse d’Épargne',/CAISSE D.?EPARGNE/],['La Banque Postale',/BANQUE POSTALE/],['BoursoBank',/BOURSORAMA|BOURSOBANK/],['Fortuneo',/FORTUNEO/],['Qonto',/QONTO/],['Shine',/\bSHINE\b/],['BforBank',/BFORBANK/],['N26',/\bN26\b/],['Revolut',/REVOLUT/],['Monabanq',/MONABANQ/],['Crédit du Nord',/CREDIT DU NORD/],['CCF',/\bCCF\b/],['Nickel',/COMPTE-NICKEL|\bNICKEL\b/],['Crédit Coopératif',/CREDIT COOPERATIF/]];
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
  const am=l.replace(/\d{2}[\/.]\d{2}[\/.]\d{2,4}/g,' ').match(/[-+\u2212]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7})[,.]\d{2}-?/g); if(!am) return null;
  const raw=am[am.length-1].replace(/−/g,'-'); let v=Math.abs(toNum(raw.replace(/^[-+]/,''))); if(!isFinite(v)) return null;
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
  const fins=lines.filter(l=>SOLDE_FIN.test(l)&&!SOLDE_DEBUT.test(l));
  let d=lines.find(l=>SOLDE_DEBUT.test(l)), f=fins[fins.length-1];
  if(!d&&fins.length>=2){d=fins[0]}
  const a=d&&soldeDeLigne(d,''), b=f&&soldeDeLigne(f,'');
  if(!a||!b) return null;
  const ecart=+(a.solde+res.ops.reduce((s,o)=>s+o.amount,0)-b.solde).toFixed(2);
  const ok=Math.abs(ecart)<0.01;
  return {ok,ancien:a.solde,nouveau:b.solde,ecart,suspects:ok?[]:suspects(res.ops,ecart)};
}
/* L'écart correspond exactement à une ligne lue, ou à deux : ces lignes n'étaient sans doute pas des opérations */
function suspects(ops,ecart){
  const pres=(x)=>Math.abs(x-ecart)<0.005;
  const un=ops.find(o=>pres(o.amount)); if(un) return [un.label];
  if(ops.length<=600) for(let i=0;i<ops.length;i++) for(let j=i+1;j<ops.length;j++) if(pres(ops[i].amount+ops[j].amount)) return [ops[i].label,ops[j].label];
  return [];
}
function phraseSuspects(ctl){
  const s=(ctl&&ctl.suspects)||[], c=l=>'« '+esc(l.length>60?l.slice(0,58)+'…':l)+' »';
  if(s.length===1) return ` La ligne ${c(s[0])} a peut-être été lue à tort comme une opération.`;
  if(s.length===2) return ` Les lignes ${c(s[0])} et ${c(s[1])} ont peut-être été lues à tort comme des opérations.`;
  return '';
}
function anonymize(t){return (t||'').replace(/\bFR\d{2}[\d A-Z]{10,34}/g,'FR•• (IBAN masqué)').replace(/\b[A-Z]{4}FR[A-Z0-9]{2,5}\b/g,'(BIC masqué)').replace(/\d{6,}/g,m=>'#'.repeat(m.length)).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'(e-mail masqué)').replace(/\b(M\.|MR|MME|MLLE|MONSIEUR|MADAME)\s+[A-ZÀ-Üa-zà-ü' -]{1,40}/gi,'$1 (nom masqué)')}

