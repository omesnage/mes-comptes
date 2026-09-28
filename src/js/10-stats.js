/* ============ Indépendants : statistiques ============ */
const fmt1=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n);
const pad2=n=>String(n).padStart(2,'0');
function thisMonth(){const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)}
function lastOpDate(){return S.ops.reduce((m,o)=>o.date>m?o.date:m,'')}
function endOf(p){const [,b]=bounds(p);return {y:+b.slice(0,4),m:+b.slice(5,7)}}
function monthsTo(y,m,n){const out=[];for(let i=n-1;i>=0;i--){const q=shift({lvl:'M',y,m},-i);out.push({lvl:'M',y:q.y,m:q.m})}return out}
/* Statistiques sur 12 mois. Les revenus lissés suivent l'univers affiché ; les dépenses moyennes (matelas) couvrent tout, pro et perso. */
function stats(p,U){
  U=U||UNIV;
  const e=endOf(p); const ms=monthsTo(e.y,e.m,12).map(q=>({q,a:agg(q,U),t:agg(q,'all')}));
  const wd=ms.filter(x=>x.t.any), n=wd.length||1;
  const lisse=wd.reduce((s,x)=>s+x.a.income,0)/n;
  const l3=wd.slice(-3), l6=wd.slice(-6);
  const pointMort=l3.reduce((s,x)=>s+x.a.fixed,0)/(l3.length||1);
  const depMoy=l6.reduce((s,x)=>s+x.t.net,0)/(l6.length||1);
  const ep=+S.settings.epargne||0;
  return {ms,lisse,pointMort,depMoy,nData:wd.length,autonomie:ep>0&&depMoy>0?ep/depMoy:null,autoEss:ep>0&&pointMort>0?ep/pointMort:null};
}
function recurring(){
  const last=lastOpDate(); if(!last) return [];
  const end={y:+last.slice(0,4),m:+last.slice(5,7)}; const ms=monthsTo(end.y,end.m,6).map(q=>q.y+'-'+pad2(q.m));
  const g={};
  for(const k of ms) for(const o of (BYMONTH[k]||[])){ if(o.amount>=0||o.src==='rev'||!inUniv(o)) continue;
    const c=catOf(o); if(!c||['income','transfer','remu'].includes(typeOf(c))||['pret','courses','resto','transport','shopping'].includes(c)) continue;
    const e=g[o.merchant]||(g[o.merchant]={m:o.merchant,c,by:{},amts:[]}); e.by[k]=(e.by[k]||0)+1; e.amts.push(-o.amount); }
  const out=[];
  for(const e of Object.values(g)){
    const months=Object.keys(e.by); if(months.length<3) continue;
    if(Math.max(...Object.values(e.by))>1) continue;
    const mean=e.amts.reduce((s,x)=>s+x,0)/e.amts.length, sd=Math.sqrt(e.amts.reduce((s,x)=>s+(x-mean)**2,0)/e.amts.length);
    if(sd/mean>.2) continue;
    const first=months.sort()[0]; const span=ms.length-ms.indexOf(first);
    const monthly=e.amts.reduce((s,x)=>s+x,0)/span;
    out.push({m:e.m,c:e.c,monthly,annual:monthly*12});
  }
  return out.sort((a,b)=>b.annual-a.annual);
}
