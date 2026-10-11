/* ============ Dépenses en camembert ============
   Une page à part (petite icône en haut de l'écran) : période au choix (mois, trimestre, année), et chaque part porte son nom et son montant,
   écrits à côté de la part. Les 7 plus grosses rubriques sont détaillées, le reste est regroupé dans « Autres ». */
let CAM=null;
const NB_PARTS=7, COUL=['var(--c1)','var(--i-ciel)','var(--i-menthe)','var(--i-rose)','var(--i-peche)','var(--i-lavande)','var(--i-sable)','var(--c4)'];
const boutonCam=()=>`<button class="ico-vue seul" data-act="camembert" data-tip="Voir ces dépenses en camembert : chaque part porte son nom et son montant."><i data-lucide="chart-pie"></i><span class="sr">Voir en camembert</span></button>`;
function ouvrirCamembert(){
  const bilanVu=view==='bilan'&&PB, base=bilanVu?PB:{...P,lvl:AL};
  CAM={lvl:base.lvl||'M',y:base.y,m:base.m,u:bilanVu?bilanU():'perso'};
  $('#camPage')?.remove();
  document.body.insertAdjacentHTML('beforeend','<div id="camPage" role="dialog" aria-modal="true" aria-label="Vos dépenses en camembert"></div>');
  document.body.style.overflow='hidden'; majCam();
}
function majCam(){
  const z=$('#camPage'); if(!z||!CAM) return;
  const p={lvl:CAM.lvl,y:CAM.y,m:CAM.m}, u=hasFraisPro()?CAM.u:'perso', B=bilan(p,u);
  const rows=B.rows.filter(([,v])=>v>0.005).sort((a,b)=>b[1]-a[1]).map(([id,v])=>({id,nom:nomRub(id),v}));
  const seg=(att,items,cle)=>`<div class="seg" role="group">${items.map(([k,l])=>`<button ${att}="${k}" aria-pressed="${cle===k}">${l}</button>`).join('')}</div>`;
  z.innerHTML=`<div class="cam-page"><div class="rv-tete"><h2>Vos dépenses en camembert</h2><button class="close" data-act="closecam"><i data-lucide="x"></i>Fermer</button></div>
    ${seg('data-clvl',[['M','Mois'],['Q','Trimestre'],['Y','Année']],CAM.lvl)}
    ${hasFraisPro()?seg('data-cside',[['perso','Perso'],['pro','Activité']],u):''}
    <div class="mois"><button class="fleche" data-cshift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button><h2>${esc(nomPeriode(p))}</h2><button class="fleche" data-cshift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>
    ${rows.length?`<p class="rep-total">${eur0(rows.reduce((s,r)=>s+r.v,0))} <span>au total</span></p>${camembert(rows)}
      <p class="aide">Les ${NB_PARTS} plus grosses rubriques ont leur part ; les autres sont regroupées dans « Autres ». Changez la période avec les boutons Mois, Trimestre et Année.</p>`
      :'<p class="aide centre">Aucune dépense sur cette période.</p>'}</div>`;
  icons();
}
/* Coupe un nom en deux lignes au plus (12 caractères), sans couper un mot */
function lignesNom(nom){
  const mots=String(nom).split(' '), L=['']; for(const m of mots){const k=L.length-1; if((L[k]+' '+m).trim().length<=12||!L[k]) L[k]=(L[k]+' '+m).trim(); else L.push(m)}
  if(L.length>2){L.length=2; L[1]=L[1].slice(0,11)+'…'} if(L[0].length>13) L[0]=L[0].slice(0,12)+'…'; if(L[1]&&L[1].length>13) L[1]=L[1].slice(0,12)+'…';
  return L;
}
/* rows : [{id, nom, v}] de la plus grosse à la plus petite */
function camembert(rows){
  const L=rows.filter(r=>r.v>0.005); if(!L.length) return '';
  const total=L.reduce((s,r)=>s+r.v,0), reste=L.slice(NB_PARTS);
  const parts=L.slice(0,NB_PARTS).map((r,i)=>({...r,i}));
  if(reste.length) parts.push({id:'_autres',nom:reste.length>1?'Autres':reste[0].nom,v:reste.reduce((s,r)=>s+r.v,0),i:NB_PARTS});
  const W=420, CX=210, CY=190, R=78, HL=20, XD=312, XG=108;
  let a0=-Math.PI/2, formes='', cotes={d:[],g:[]};
  for(const p of parts){
    const f=p.v/total, a1=a0+f*2*Math.PI, am=(a0+a1)/2, pt=(a,r)=>[CX+r*Math.cos(a),CY+r*Math.sin(a)];
    if(parts.length===1) formes+=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${COUL[p.i]}" stroke="var(--surface)" stroke-width="2"/>`;
    else{const [x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R); formes+=`<path d="M${CX} ${CY}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${f>.5?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${COUL[p.i]}" stroke="var(--surface)" stroke-width="2"/>`}
    const nom=lignesNom(p.nom), h=nom.length*HL+24, cote=Math.cos(am)>=0?'d':'g';
    cotes[cote].push({p,am,nom,h,vise:CY+(R+22)*Math.sin(am)-h/2});
    a0=a1;
  }
  /* Étiquettes : une colonne de chaque côté, de haut en bas, sans qu'elles se chevauchent */
  let haut=0, bas=2*CY, traits='', textes='';
  for(const c of ['d','g']){
    const E=cotes[c].sort((a,b)=>a.vise-b.vise); let y=-1e9;
    for(const e of E){ e.y=Math.max(e.vise,y+8); y=e.y+e.h }
    const exces=E.length?E[E.length-1].y+E[E.length-1].h-(2*CY+30):0; if(exces>0) E.forEach(e=>e.y-=exces);
    let min=-1e9; for(const e of E){ e.y=Math.max(e.y,min+8); min=e.y+e.h }
    for(const e of E){
      const x=c==='d'?XD:XG, ancre=c==='d'?'start':'end', cy=e.y+e.h/2, [px,py]=[CX+(R+3)*Math.cos(e.am),CY+(R+3)*Math.sin(e.am)], [ex,ey]=[CX+(R+14)*Math.cos(e.am),CY+(R+14)*Math.sin(e.am)];
      traits+=`<polyline points="${px.toFixed(1)},${py.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} ${c==='d'?x-6:x+6},${cy.toFixed(1)}" fill="none" stroke="${COUL[e.p.i]}" stroke-width="2"/>`;
      textes+=e.nom.map((t,k)=>`<text class="cam-n" x="${x}" y="${(e.y+16+k*HL).toFixed(1)}" text-anchor="${ancre}">${esc(t)}</text>`).join('')+`<text class="cam-a" x="${x}" y="${(e.y+16+e.nom.length*HL+2).toFixed(1)}" text-anchor="${ancre}">${esc(eur0(e.p.v))}</text>`;
      haut=Math.min(haut,e.y); bas=Math.max(bas,e.y+e.h);
    }
  }
  const vy=Math.floor(Math.min(haut,CY-R)-12), vh=Math.ceil(Math.max(bas,CY+R)+12-vy);
  const resume=parts.map(p=>`${p.nom} ${eur0(p.v)}`).join(', ');
  return `<div class="camembert"><svg viewBox="0 ${vy} ${W} ${vh}" role="img" aria-label="Camembert des dépenses : ${esc(resume)}">${formes}${traits}${textes}</svg>
    <div class="cam-leg">${parts.map(p=>`<div class="cam-l"><span class="cam-pt" style="background:${COUL[p.i]}"></span><span class="cam-nom">${esc(p.id==='_autres'&&reste.length>1?`Autres rubriques (${reste.length})`:p.nom)}</span><span class="cam-val"><b>${eur0(p.v)}</b> <span class="cam-pc">${Math.round(p.v/total*100)} %</span></span></div>`).join('')}</div></div>`;
}
