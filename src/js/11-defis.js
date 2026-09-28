/* ============ Défis et médailles ============ */
const DEFIS=[
  {id:'noresto',name:'Un mois sans restaurant',desc:'Aucune dépense en Restaurants & cafés.',cat:'resto',zero:true},
  {id:'noshop',name:'Zéro shopping',desc:'Aucun achat en Shopping de tout le mois.',cat:'shopping',zero:true},
  {id:'courses10',name:'Courses −10 %',desc:'Des courses 10 % sous votre moyenne des trois derniers mois.',cat:'courses',pct:.9},
  {id:'loisirs20',name:'Loisirs −20 %',desc:'Des loisirs 20 % sous votre moyenne des trois derniers mois.',cat:'loisirs',pct:.8},
  {id:'lisse',name:'Sous le revenu lissé',desc:'Dépenser moins que votre revenu lissé ce mois-ci.',lisse:true}
];
function evalDefi(c){
  const D=DEFIS.find(x=>x.id===c.id)||DEFIS[0]; const y=+c.month.slice(0,4), m=+c.month.slice(5,7);
  const p={lvl:'M',y,m}, A=agg(p,'all'), dim=new Date(y,m,0).getDate();
  const complete=lastOpDate()>=`${c.month}-${pad2(dim-3)}`&&thisMonth()>c.month;
  let v=0,target=0,ok;
  if(D.zero){v=A.by[D.cat]?.net||0;ok=v<=0}
  else if(D.pct){let s=0,k=0;for(let i=1;i<=3;i++){const b=agg(shift(p,-i),'all');if(b.any){s+=b.by[D.cat]?.net||0;k++}}target=k?s/k*D.pct:0;v=A.by[D.cat]?.net||0;ok=v<=target}
  else {target=stats(p,'all').lisse;v=A.net;ok=target>0&&v<=target}
  const status=D.zero&&!ok?'manqué':complete?(ok?'réussi':'manqué'):'en cours';
  const progress=D.zero?(ok?'Rien pour l’instant, continuez.':`${eur0(v)} déjà dépensés.`):`${eur0(v)} pour ${eur0(target)} maximum.`;
  return {...D,month:c.month,status,progress,ok};
}
function medals(st){
  const done=S.challenges.map(evalDefi).filter(x=>x.status==='réussi').length;
  const monthsData=new Set(S.ops.map(o=>o.date.slice(0,7))).size;
  let sober=0,best=0; st.ms.forEach(x=>{if(x.a.any&&st.lisse>0&&x.t.net<=st.lisse){sober++;best=Math.max(best,sober)}else sober=0});
  return [
    ['file-check','Premier relevé','Importer un relevé',S.ops.length>0],
    ['check-check','Tout est rangé','Plus rien à valider',S.ops.length>0&&!pendingGroups().length],
    ['calendar-check','Six mois suivis','Six mois de relevés',monthsData>=6],
    ['target','Défi relevé','Réussir un défi',done>=1],
    ['trophy','Trois défis','Réussir trois défis',done>=3],
    ['feather','Sobre','Trois mois sous le revenu lissé',best>=3],
    ['shield','Matelas de 3 mois','3 mois d’autonomie',(st.autonomie||0)>=3],
    ['shield-check','Matelas de 6 mois','6 mois d’autonomie',(st.autonomie||0)>=6]
  ];
}
function vGoals(){
  const st=stats(P,'all'), obj=+S.settings.objectif||6, tm=thisMonth();
  const mine=S.challenges.slice().sort((a,b)=>a.month<b.month?1:-1).map(evalDefi);
  const cur=new Set(mine.filter(x=>x.month===tm).map(x=>x.id));
  const pts=st.ms.map(x=>({l:MOIS[x.q.m-1].slice(0,1),v:x.a.income,any:x.a.any}));
  const max=Math.max(1,st.lisse,...pts.map(p=>p.v)); const W=600,H=170,bh=130,gap=W/pts.length,bw=gap*.5, ly=bh-st.lisse/max*(bh-14);
  const chart=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Encaissements des douze derniers mois"><line x1="0" x2="${W}" y1="${bh}" y2="${bh}" stroke="var(--line)"/>
    ${pts.map((p,i)=>{const hh=p.v>0?Math.max(2,p.v/max*(bh-14)):0;const x=i*gap+gap/2;return `<rect x="${x-bw/2}" y="${bh-hh}" width="${bw}" height="${hh}" fill="var(--ink)" opacity="${p.v<st.lisse*.7?.35:.85}"/><text x="${x}" y="${bh+24}" text-anchor="middle" font-size="17" fill="var(--muted)" font-family="Jost, sans-serif">${p.l}</text>`}).join('')}
    ${st.lisse>0?`<line x1="0" x2="${W}" y1="${ly}" y2="${ly}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="6 5"/>`:''}</svg>`;
  return periodBar()+`
  <section class="block"><h3 class="sec">Matelas de sécurité</h3>
    ${st.autonomie!=null?`<div class="kpi">${fmt1(st.autonomie)}<small>mois d’autonomie</small></div>
    <div class="gauge"><span style="width:${Math.min(100,st.autonomie/obj*100)}%"></span></div>
    <p class="note">${st.autonomie>=obj?`Objectif de ${obj} mois atteint 🎉`:`Objectif : ${obj} mois. Il manque environ ${eur0((obj-st.autonomie)*st.depMoy)}.`} Calculé sur vos dépenses moyennes de ${eur0(st.depMoy)} par mois${st.autoEss?`. En ne gardant que les charges fixes, vous tiendriez ${fmt1(st.autoEss)} mois`:''}.</p>`
    :'<p class="lead">Indiquez votre épargne disponible pour savoir combien de mois vous tenez sans rien encaisser.</p>'}
    <div class="fields" style="margin-top:18px"><label>Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${S.settings.epargne||''}" placeholder="0"></label>
    <label>Matelas visé (mois)<input type="number" inputmode="numeric" min="1" max="36" data-set="objectif" value="${S.settings.objectif||''}" placeholder="6"></label></div>
  </section>
  <section class="block"><h3 class="sec">Vos encaissements</h3>
    ${st.lisse>0?`<p class="lead">Les douze derniers mois. La ligne dorée est votre revenu lissé, ${esc(eur0(st.lisse))} par mois. Les mois en gris clair sont les mois creux.</p><div class="chart" style="margin-bottom:0">${chart}</div>`:'<p class="note">Importez vos revenus ou vos relevés pour voir vos encaissements.</p>'}
  </section>
  <section class="block"><h3 class="sec">Défis du mois</h3>
    <p class="lead">Choisissez un ou plusieurs défis pour ${MOIS[+tm.slice(5,7)-1]}. L’application vérifie toute seule s’ils sont tenus, à chaque import de relevé.</p>
    ${DEFIS.map(D=>`<div class="defi"><div><div class="n">${esc(D.name)}</div><div class="d">${esc(D.desc)}</div>${cur.has(D.id)?`<div class="st">${(x=>`${x.status==='manqué'?'Manqué':x.status==='réussi'?'Réussi 🎉':'En cours'}. ${x.progress}`)(mine.find(x=>x.id===D.id&&x.month===tm))}</div>`:''}</div>
      ${cur.has(D.id)?`<button class="link" data-undefi="${D.id}">Abandonner</button>`:`<button class="link" data-defi="${D.id}" style="color:var(--ink)">Relever</button>`}</div>`).join('')}
    ${mine.filter(x=>x.month!==tm).length?`<h4 style="font-weight:400;margin:26px 0 4px;font-size:14px;color:var(--muted)">Défis passés</h4>${mine.filter(x=>x.month!==tm).map(x=>`<div class="row"><span>${esc(x.name)}</span><b style="font-size:15px">${x.status==='réussi'?'Réussi 🎉':x.status==='manqué'?'Manqué':'En attente du relevé'}</b><span class="sub">${MOIS[+x.month.slice(5,7)-1]} ${x.month.slice(0,4)}</span></div>`).join('')}`:''}
  </section>
  <section class="block"><h3 class="sec">Médailles</h3>
    <div class="medals">${medals(st).map(([ic,n,c,on])=>`<div class="medal${on?' on':''}"><div class="disc"><i data-lucide="${ic}"></i></div>${esc(n)}<em>${esc(c)}</em></div>`).join('')}</div>
  </section>`;
}

