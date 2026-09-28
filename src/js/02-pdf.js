/* ============ Lecture PDF ============ */
const AMT=/^[-+]?(?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{1,7}),\d{2}(?:\s?€)?$/;
const DATE_RE=/^(\d{2})[\/.](\d{2})(?:[\/.](\d{2}|\d{4}))?$/;
function toNum(s){let t=String(s).replace(/-$/,'').replace(/EUR/i,'').replace(/[€\s\u00a0\u202f+]/g,'');if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');else if(!/\.\d{1,2}$/.test(t))t=t.replace(/\./g,'');return parseFloat(t)}
const SKIP=/^(ANCIEN SOLDE|NOUVEAU SOLDE|SOLDE|TOTAL|TOTAUX|REPORT|PAGE|DATE)\b/i;
const CREDIT_HINT=/\b(VIR(EMENT)? (SEPA )?RECU|VIREMENT DE|REMB|REMBOURSEMENT|AVOIR|SALAIRE|PAIE|VERSEMENT|REMISE)\b/i;

async function parsePDF(file){
  if(!window.pdfjsLib) throw new Error('Le lecteur de PDF n’a pas pu se charger. Rechargez la page.');
  const doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
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
      for(const t of r.t){ if(/^d[ée]bits?\b/i.test(t.s)) deb=t.x+t.w/2; if(/^cr[ée]dits?\b/i.test(t.s)) cre=t.x+t.w/2; } }
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
  for(const l of lines){
    const m=l.text.match(LINE);
    if(m){
      let label=m[3].replace(/\s+/g,' ').trim();
      if(SKIP.test(label)){last=null;continue}
      const dm=m[1].match(/(\d{2})[\/.](\d{2})(?:[\/.](\d{2,4}))?/);
      let y=dm[3]?(dm[3].length===2?2000+ +dm[3]:+dm[3]):Y;
      if(!dm[3]&&dm[2]==='12'&&hasJan) y=Y-1;
      const date=`${y}-${dm[2]}-${dm[1]}`;
      const amtStr=m[5]&&l.deb==null?m[4]:m[4];
      let val=Math.abs(toNum(amtStr));
      let sign=-1;
      const amtTok=[...l.tokens].reverse().find(t=>AMT.test(t.s)||t.s.endsWith(amtStr.trim()));
      if(/^-/.test(amtStr)||/-$/.test(amtStr)) sign=-1;
      else if(/^\+/.test(amtStr)) sign=1;
      else if(l.deb!=null&&l.cre!=null&&amtTok){
        const cx=amtTok.x+amtTok.w/2; sign=Math.abs(cx-l.cre)<Math.abs(cx-l.deb)?1:-1;
      } else if(CREDIT_HINT.test(label)) sign=1;
      if(!isFinite(val)||val===0){last=null;continue}
      last={date,label,amount:+(sign*val).toFixed(2)}; ops.push(last);
    } else if(last && !AMT.test(l.text) && !DATE_RE.test(l.tokens[0]?.s||'') && !SKIP.test(l.text) && l.text.length<70 && last.label.length<110){
      last.label+=' '+l.text.trim();
    } else last=null;
  }
  return {ops,raw:lines.map(l=>l.text).slice(0,80).join('\n'),full};
}

const BANKS=[['Crédit Agricole',/CREDIT AGRICOLE/],['LCL',/\bLCL\b|CREDIT LYONNAIS/],['BNP Paribas',/BNP PARIBAS/],['Hello bank',/HELLO BANK/],['Société Générale',/SOCIETE GENERALE/],['Crédit Mutuel',/CREDIT MUTUEL/],['CIC',/\bCIC\b/],['Banque Populaire',/BANQUE POPULAIRE/],['Caisse d’Épargne',/CAISSE D.?EPARGNE/],['La Banque Postale',/BANQUE POSTALE/],['BoursoBank',/BOURSORAMA|BOURSOBANK/],['Fortuneo',/FORTUNEO/],['Qonto',/QONTO/],['Shine',/\bSHINE\b/],['N26',/\bN26\b/],['Revolut',/REVOLUT/],['Monabanq',/MONABANQ/],['Crédit du Nord',/CREDIT DU NORD/],['CCF',/\bCCF\b/],['Nickel',/COMPTE-NICKEL|\bNICKEL\b/],['Crédit Coopératif',/CREDIT COOPERATIF/]];
function detectBank(text){const t=norm((text||'').slice(0,6000));const b=BANKS.find(([,re])=>re.test(t));return b?b[0]:null}
const acctOf=o=>o.acct||'Compte principal';
function accounts(){return [...new Set(S.ops.filter(o=>o.src!=='rev').map(acctOf))].sort()}
let ACC='';
function anonymize(t){return (t||'').replace(/\bFR\d{2}[\d A-Z]{10,34}/g,'FR•• (IBAN masqué)').replace(/\b[A-Z]{4}FR[A-Z0-9]{2,5}\b/g,'(BIC masqué)').replace(/\d{6,}/g,m=>'#'.repeat(m.length)).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'(e-mail masqué)').replace(/\b(M\.|MR|MME|MLLE|MONSIEUR|MADAME)\s+[A-ZÀ-Üa-zà-ü' -]{1,40}/gi,'$1 (nom masqué)')}

