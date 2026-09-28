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
function retenir(A,st,U){
  U=U||UNIV;
  const items=[]; const [a]=bounds(P);
  if(P.lvl==='M'&&U!=='pro'){const last=S.ops.filter(o=>o.date.slice(0,7)===a).reduce((m,o)=>o.date>m?o.date:m,'');
    if(last){const d=+last.slice(8,10), dim=new Date(P.y,P.m,0).getDate();
      if(d>=5&&d<dim-2&&A.net>0){const proj=A.net/d*dim;items.push({e:st.lisse>0&&proj>st.lisse?'⚠️':'',t:`À ce rythme, vos dépenses finiront le mois vers ${eur0(proj)}${st.lisse>0?`, pour des rentrées lissées de ${eur0(st.lisse)}`:''}.`,go:'economies'})}}}
  if(st.lisse>0&&A.any&&st.nData>=3){const mi=A.income/A.months, d=(mi-st.lisse)*A.months;
    if(mi>st.lisse*1.15) items.push({e:'🎉',t:`Bonne période : ${eur0(d)} au-dessus de vos rentrées lissées. Gardez-en une partie pour les mois creux.`,go:'objectifs'});
    else if(mi<st.lisse*.7) items.push({e:'⚠️',t:`Période creuse : ${eur0(-d)} sous vos rentrées lissées.${st.autonomie!=null?` Votre matelas couvre ${fmt1(st.autonomie)} mois.`:''}`,go:'objectifs'})}
  const X=agg(P,'pro'), tx=+S.settings.taux||0;
  if(U!=='perso'&&X.ca>0) items.push(tx>0?{e:'',t:`À mettre de côté pour les cotisations et les impôts : ${eur0(X.provision)}, soit ${tx} % ${S.settings.assiette==='resultat'?`de votre résultat de ${eur0(Math.max(0,X.resultat))}`:`des ${eur0(X.ca)} encaissés`}.`,go:'regles'}:{e:'',t:'Indiquez dans Réglages la part de vos revenus à mettre de côté pour les cotisations et les impôts.',go:'regles'});
  const ch=S.challenges.filter(c=>c.month===thisMonth()).map(evalDefi).find(x=>x.status==='en cours');
  if(ch) items.push({e:'🎯',t:`Défi en cours : ${ch.name}. ${ch.progress}`,go:'objectifs'});
  if(st.autonomie!=null) items.push({e:'',t:`Votre matelas : ${fmt1(st.autonomie)} mois d’autonomie, pour ${S.settings.objectif||6} visés.`,go:'objectifs'});
  return items.slice(0,3);
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
function hoursTxt(eur,rate){const h=eur/rate;const H=Math.floor(h),M=Math.round((h-H)*60);return H?`${H} h${M?' '+pad2(M):''}`:`${Math.max(1,M)} min`}
function vEco(){
  const A=agg(P), B=agg(shift(P,-1)), st=stats(P,'all'), rec=recurring();
  const recTot=rec.reduce((s,r)=>s+r.annual,0);
  const rate=st.lisse>0?st.lisse/(+S.settings.heures||140):0;
  const top=Object.values(A.by).flatMap(e=>e.ops).filter(o=>o.amount<0&&!catById(catOf(o))?.fixed).sort((a,b)=>a.amount-b.amount).slice(0,6);
  const fixedCats=S.categories.filter(c=>c.fixed&&c.type==='expense');
  const l3=st.ms.filter(x=>x.a.any).slice(-3);
  const rises=Object.entries(A.by).filter(([c])=>c!=='_pending').map(([c,e])=>{const pb=B.by[c]?.net||0;return {c,now:e.net,pb,d:e.net-pb}}).filter(x=>B.any&&x.d>30&&x.pb>0&&x.d/x.pb>.2).sort((a,b)=>b.d-a.d);
  return periodBar()+`
  <section class="block"><h3 class="sec">Votre point mort</h3>
    <div class="kpi">${eur0(st.pointMort)}<small>par mois</small></div>
    <p class="lead">Ce qu’il faut encaisser au minimum chaque mois pour couvrir vos charges fixes, en moyenne sur les trois derniers mois.</p>
    ${fixedCats.map(c=>{const v=l3.reduce((s,x)=>s+(x.a.by[c.id]?.net||0),0)/(l3.length||1);return v?`<div class="row"><span>${esc(c.name)}</span><b>${eur0(v)}</b></div>`:''}).join('')}
    <p class="note" style="margin-top:12px">Vous choisissez ce qui compte comme charge fixe dans Réglages, rubrique par rubrique.</p></section>
  <section class="block"><h3 class="sec">Abonnements et prélèvements réguliers</h3>
    ${rec.length?`<div class="kpi">${eur0(recTot)}<small>par an</small></div><p class="lead">Ce qui est prélevé chaque mois, repéré sur les six derniers mois, hors prêts. À passer en revue une fois par an : on y trouve souvent des abonnements oubliés.</p>
    ${rec.map(r=>`<div class="row"><span>${esc(r.m)}</span><b>${eur0(r.annual)} / an</b><span class="sub">${esc(catById(r.c)?.name||'')}, environ ${eur(r.monthly)} par mois</span></div>`).join('')}`:'<p class="note">Rien de régulier repéré pour l’instant. Il faut au moins trois mois de relevés.</p>'}
  </section>
  <section class="block"><h3 class="sec">Le vrai prix de vos dépenses</h3>
    ${rate?`<p class="lead">Votre heure de travail vaut environ ${eur(rate)}, d’après votre revenu lissé et ${+S.settings.heures||140} h travaillées par mois. Voici ce que vos plus grosses dépenses de la période, hors charges fixes, vous ont coûté en temps.</p>
    ${top.map(o=>`<div class="row"><span>${esc(o.merchant)}</span><b>${hoursTxt(-o.amount,rate)}</b><span class="sub">${dfmt(o.date)}, ${eur(-o.amount)}</span></div>`).join('')||'<p class="note">Aucune dépense sur cette période.</p>'}`
    :'<p class="note">Il faut des revenus importés pour calculer la valeur de votre heure de travail.</p>'}
  </section>
  ${rises.length?`<section class="block"><h3 class="sec">Postes en hausse</h3><p class="lead">Par rapport à la période précédente.</p>
    ${rises.map(x=>`<div class="row"><span>${esc(catById(x.c)?.name||x.c)} ${x.d/x.pb>.5?'🔥':'⚠️'}</span><b>+${eur0(x.d)}</b><span class="sub">${eur0(x.pb)} puis ${eur0(x.now)}</span></div>`).join('')}</section>`:''}`;
}

