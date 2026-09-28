/* ============ Lecture CSV ============ */
function parseCSV(text){
  const rowsRaw=text.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  if(!rowsRaw.length) throw new Error('Ce fichier est vide. Téléchargez à nouveau votre relevé depuis le site de votre banque.');
  const sep=(rowsRaw[0].split(';').length>=rowsRaw[0].split(',').length)?';':',';
  const split=l=>{const out=[];let cur='',inq=false;for(const ch of l){if(ch==='"'){inq=!inq;continue}if(ch===sep&&!inq){out.push(cur);cur='';continue}cur+=ch}out.push(cur);return out.map(s=>s.trim())};
  const rows=rowsRaw.map(split);
  let h=rows.findIndex(r=>r.some(c=>/date/i.test(c)));
  if(h<0) throw new Error('Ce fichier ne ressemble pas à un relevé : aucune colonne de dates n’a été trouvée. Téléchargez plutôt le relevé au format PDF depuis le site de votre banque.');
  const H=rows[h].map(c=>norm(c));
  const iD=H.findIndex(c=>c.includes('DATE'));
  const iL=H.findIndex(c=>/LIBELLE|LABEL|DESCRIPTION|INTITULE|OPERATION/.test(c)&&!c.includes('DATE'));
  const iM=H.findIndex(c=>/MONTANT|AMOUNT/.test(c));
  const iDe=H.findIndex(c=>c.includes('DEBIT')), iCr=H.findIndex(c=>c.includes('CREDIT'));
  const ops=[];
  for(const r of rows.slice(h+1)){
    const d=r[iD]||''; let date=null, mm;
    if(mm=d.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})/)) date=`${mm[3].length===2?'20'+mm[3]:mm[3]}-${mm[2]}-${mm[1]}`;
    else if(mm=d.match(/^(\d{4})-(\d{2})-(\d{2})/)) date=`${mm[1]}-${mm[2]}-${mm[3]}`;
    if(!date) continue;
    const num=s=>{if(!s)return 0;const t=s.replace(/[€\s\u00a0]/g,'');return parseFloat(t.includes(',')?t.replace(/\./g,'').replace(',','.'):t)||0};
    let amount=iM>=0?num(r[iM]):(num(r[iCr])-Math.abs(num(r[iDe])));
    if(!amount) continue;
    ops.push({date,label:(r[iL>=0?iL:1]||'').replace(/\s+/g,' '),amount:+amount.toFixed(2)});
  }
  return {ops,raw:rowsRaw.slice(0,30).join('\n'),full:rowsRaw.slice(0,h+1).join('\n'),header:rowsRaw.slice(0,h).join('\n')};
}

