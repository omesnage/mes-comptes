/* ============ Fichier de revenus ============ */
let revDraft=null, revError='', revMsg='';
const cellStr=c=>c instanceof Date?'':String(c??'').trim();
function toDate(c){
  if(c instanceof Date&&!isNaN(c)){const t=new Date(c.getTime()-c.getTimezoneOffset()*60000+43200000);return t.toISOString().slice(0,10)}
  const s=String(c??'').trim(); let m;
  if(m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/)) return `${m[3].length===2?'20'+m[3]:m[3]}-${pad(m[2])}-${pad(m[1])}`;
  if(m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function toAmt(c){
  if(typeof c==='number') return c;
  let s=String(c??'').replace(/[€\s\u00a0\u202f]/g,''); if(!s) return NaN;
  if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  return /^[-+]?\d+(\.\d+)?$/.test(s)?parseFloat(s):NaN;
}
function csvRows(text){
  const lines=text.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  const sep=(lines[0].split(';').length>=lines[0].split(',').length)?';':',';
  return lines.map(l=>{const out=[];let cur='',inq=false;for(const ch of l){if(ch==='"'){inq=!inq;continue}if(ch===sep&&!inq){out.push(cur);cur='';continue}cur+=ch}out.push(cur);return out.map(s=>s.trim())});
}
function bestCol(body,test){let best=-1,bn=0;const w=Math.max(0,...body.map(r=>r.length));for(let i=0;i<w;i++){const n=body.filter(r=>test(r[i])).length;if(n>bn){bn=n;best=i}}return best}
function detect(){
  const d=revDraft, rows=d.sheets[d.sheet].rows;
  let h=0;
  for(let i=0;i<Math.min(15,rows.length);i++){const r=rows[i].map(c=>norm(cellStr(c)));
    if(r.some(c=>/DATE/.test(c))&&r.some(c=>/MONTANT|TOTAL|TTC|\bHT\b|NET|ENCAISS|SOMME|PRIX|CHIFFRE|\bCA\b/.test(c))){h=i;break}}
  const H=(rows[h]||[]).map(c=>norm(cellStr(c)));
  const find=(res,noDate)=>{for(const re of res){const i=H.findIndex(c=>re.test(c)&&!(noDate&&/DATE/.test(c)));if(i>=0)return i}return -1};
  d.h=h;
  d.date=find([/DATE.*(ENCAISS|PAIEMENT|REGLEMENT|RECEPTION)|(ENCAISS|PAIEMENT|REGLEMENT).*DATE/,/DATE/]);
  d.amt=find([/ENCAISS/,/\bNET\b/,/TTC/,/\bHT\b/,/MONTANT|TOTAL|SOMME|PRIX|CHIFFRE|\bCA\b/],true);
  d.lab=find([/CLIENT/,/LIBELLE|DESCRIPTION|OBJET|INTITULE|PRESTATION|DESIGNATION/],true);
  const body=rows.slice(h+1,h+40);
  if(d.date<0) d.date=bestCol(body,c=>!!toDate(c));
  if(d.amt<0) d.amt=bestCol(body,c=>typeof c==='number');
  if(d.date<0) d.date=0; if(d.amt<0) d.amt=Math.min(1,Math.max(0,H.length-1));
}
async function readRev(file){
  revError=''; revMsg='';
  try{
    let sheets;
    if(/\.csv$/i.test(file.name)) sheets=[{name:'CSV',rows:csvRows(await file.text())}];
    else{
      if(!window.XLSX) throw new Error('Le lecteur de tableurs n’a pas pu se charger. Rechargez la page.');
      const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true});
      sheets=wb.SheetNames.map(n=>({name:n,rows:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''})}));
    }
    sheets=sheets.filter(s=>s.rows.length>1);
    if(!sheets.length) throw new Error('Ce fichier ne contient aucune ligne exploitable.');
    revDraft={name:file.name,sheets,sheet:0}; detect();
  }catch(e){
    revDraft=null;
    revError=(/\.numbers$/i.test(file.name)?'Ce fichier Numbers n’a pas pu être lu. Dans Numbers, choisissez Fichier, Exporter vers, Excel, puis importez ce fichier Excel. ':'')+(e.message||'Lecture impossible.');
  }
  render();
}
function revParse(){
  const d=revDraft, rows=d.sheets[d.sheet].rows.slice(d.h+1); const list=[]; let skipped=0;
  for(const r of rows){
    if(!r.some(c=>cellStr(c)||c instanceof Date||typeof c==='number')) continue;
    const date=toDate(r[d.date]), amount=toAmt(r[d.amt]);
    if(!date||!isFinite(amount)||!amount){skipped++;continue}
    const label=d.lab>=0?cellStr(r[d.lab]):'';
    list.push({date,amount:+amount.toFixed(2),label:label||'Revenu'});
  }
  return {list,skipped};
}
function revPanel(){
  const d=revDraft, H=d.sheets[d.sheet].rows[d.h]||[];
  const opt=(sel,optional)=>(optional?`<option value="-1"${sel<0?' selected':''}>Aucune</option>`:'')+H.map((c,i)=>`<option value="${i}"${i===sel?' selected':''}>${esc(cellStr(c)||'Colonne '+(i+1))}</option>`).join('');
  const {list,skipped}=revParse(); const tot=list.reduce((s,o)=>s+o.amount,0);
  return `<p class="f-lbl">${esc(d.name)}</p>
    ${d.sheets.length>1?`<label class="champ">Feuille<select class="grand" data-rev="sheet">${d.sheets.map((s,i)=>`<option value="${i}"${i===d.sheet?' selected':''}>${esc(s.name)}</option>`).join('')}</select></label>`:''}
    <label class="champ">Colonne de la date<select class="grand" data-rev="date">${opt(d.date)}</select></label>
    <label class="champ">Colonne du montant<select class="grand" data-rev="amt">${opt(d.amt)}</select></label>
    <label class="champ">Colonne du client (facultatif)<select class="grand" data-rev="lab">${opt(d.lab,true)}</select></label>
  <p class="phrase">${list.length} encaissement${list.length>1?'s':''} trouvé${list.length>1?'s':''}, ${eur(tot)} au total${skipped?`. ${skipped} ligne${skipped>1?'s':''} sans date ou montant lisible, ignorée${skipped>1?'s':''}`:''}.</p>
  <div class="apercu">${list.slice(0,5).map(o=>`<div class="pv"><span>${o.date.slice(8,10)}/${o.date.slice(5,7)}</span><span>${esc(o.label)}</span><span class="cr">+${eur(o.amount)}</span></div>`).join('')}</div>
  <div class="boutons"><button class="btn" data-act="revok"${list.length?'':' disabled'}>Importer ${list.length} encaissement${list.length>1?'s':''}</button><button class="lien" data-act="revcancel">Annuler</button></div>`;
}
function revImport(){
  const {list}=revParse();
  S.ops.filter(o=>o.src==='rev').forEach(o=>dirtyMonths.add(o.date.slice(0,7)));
  S.ops=S.ops.filter(o=>o.src!=='rev');
  for(const r of list){
    S.ops.push({id:Math.random().toString(36).slice(2,10),src:'rev',cat:'revenus',date:r.date,label:r.label,amount:r.amount,merchant:norm(r.label).slice(0,40)});
    dirtyMonths.add(r.date.slice(0,7));
  }
  const first=S.incomeSource!=='file'; S.incomeSource='file';
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  revMsg=`${list.length} encaissement${list.length>1?'s':''} importé${list.length>1?'s':''}.`+(first?' Vos encaissements sont désormais lus dans ce tableau.':'');
  revDraft=null; P=null; save(); render();
}

