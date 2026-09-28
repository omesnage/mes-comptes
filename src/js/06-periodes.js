/* ============ Périodes ============ */
function defaultPeriod(){
  const d=S.ops.length?S.ops.reduce((a,o)=>o.date>a?o.date:a,'0'):new Date().toISOString().slice(0,10);
  return {lvl:'M',y:+d.slice(0,4),m:+d.slice(5,7)};
}
const pad=n=>String(n).padStart(2,'0');
function bounds(p){
  if(p.lvl==='Y') return [`${p.y}-01`,`${p.y}-12`,12];
  if(p.lvl==='Q'){const q=Math.ceil(p.m/3),s=(q-1)*3+1;return [`${p.y}-${pad(s)}`,`${p.y}-${pad(s+2)}`,3]}
  return [`${p.y}-${pad(p.m)}`,`${p.y}-${pad(p.m)}`,1];
}
function shift(p,d){
  const n={...p};
  if(p.lvl==='Y') n.y+=d;
  else{const step=p.lvl==='Q'?3:1;let t=p.y*12+(p.m-1)+d*step;n.y=Math.floor(t/12);n.m=t%12+1}
  return n;
}
function plabel(p){
  if(p.lvl==='Y') return String(p.y);
  if(p.lvl==='Q'){const q=Math.ceil(p.m/3);return `${q===1?'1er':q+'e'} trimestre ${p.y}`}
  return `${MOIS[p.m-1]} ${p.y}`;
}
function prevLabel(p){
  const r=shift(p,-1);
  if(p.lvl==='M') return 'à '+MOIS[r.m-1];
  if(p.lvl==='Q') return 'au trimestre précédent';
  return 'à '+r.y;
}
let AGG={};
function agg(p){
  const ck=p.lvl+p.y+'-'+p.m+(p.lvl==='Q'?Math.ceil(p.m/3):'')+'|'+ACC; if(AGG[ck]) return AGG[ck];
  const [a,b,months]=bounds(p);
  const by={}, inc={}, proBy={}; let income=0, any=false, pro=0; const fileInc=S.incomeSource==='file';
  for(const o of S.ops){
    const k=o.date.slice(0,7); if(k<a||k>b) continue;
    if(ACC&&(o.src==='rev'||acctOf(o)!==ACC)) continue; any=true;
    if(o.src==='rev'){if(fileInc){income+=o.amount;inc.revenus=(inc.revenus||0)+o.amount}continue}
    const c=catOf(o)||'_pending';
    if(c==='_pending'&&o.amount>0) continue;
    const ty=c==='_pending'?'expense':typeOf(c);
    if(ty==='transfer') continue;
    if(ty==='pro'){pro+=-o.amount;const e=proBy[c]||(proBy[c]={net:0,ops:[]});e.net+=-o.amount;e.ops.push(o);continue}
    if(ty==='income'){if(c==='revenus'&&fileInc)continue;income+=o.amount;inc[c]=(inc[c]||0)+o.amount;continue}
    const e=by[c]||(by[c]={spent:0,ref:0,ops:[]});
    if(o.amount<0) e.spent+=-o.amount; else e.ref+=o.amount;
    e.ops.push(o);
  }
  let net=0; for(const c in by){by[c].net=by[c].spent-by[c].ref; net+=by[c].net}
  let fixed=0; for(const c in by) if(catById(c)?.fixed) fixed+=by[c].net;
  return AGG[ck]={by,inc,proBy,pro,fixed,income,net,months,any};
}

