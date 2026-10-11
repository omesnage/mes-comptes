/* ============ Dépenses en camembert ============
   Une petite icône bascule les dépenses entre la liste et un camembert. Chaque part porte son montant ; le détail est dans la légende, en gros. */
let VUE_REP='liste';
const NB_PARTS=6;
function boutonsVue(){
  const b=(k,ic,mot,tip)=>`<button class="ico-vue" data-vue="${k}" aria-pressed="${VUE_REP===k}" data-tip="${tip}"><i data-lucide="${ic}"></i><span>${mot}</span></button>`;
  return `<div class="vue-rep" role="group" aria-label="Façon de voir les dépenses">${b('liste','list','Liste','Voir les dépenses en liste')}${b('camembert','chart-pie','Camembert','Voir les dépenses en camembert : chaque part porte son montant')}</div>`;
}
/* rows : [{id, nom, v}] déjà triées de la plus grosse à la plus petite. cliquable : les lignes de la légende ouvrent la rubrique (data-bcat). */
function camembert(rows,cliquable){
  const L=rows.filter(r=>r.v>0.005); if(!L.length) return '';
  const total=L.reduce((s,r)=>s+r.v,0);
  let parts=L.slice(0,NB_PARTS).map((r,i)=>({...r,i}));
  const reste=L.slice(NB_PARTS);
  if(reste.length) parts.push({id:'_autres',nom:reste.length>1?`Autres rubriques (${reste.length})`:reste[0].nom,v:reste.reduce((s,r)=>s+r.v,0),i:NB_PARTS});
  const C=160, R=140, pt=(a,r)=>[C+r*Math.cos(a),C+r*Math.sin(a)];
  let a0=-Math.PI/2, svg='';
  for(const p of parts){
    const f=p.v/total, a1=a0+f*2*Math.PI, am=(a0+a1)/2;
    if(parts.length===1) svg+=`<circle class="part c${p.i+1}" cx="${C}" cy="${C}" r="${R}"/>`;
    else{const [x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R); svg+=`<path class="part c${p.i+1}" d="M${C} ${C}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${f>.5?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z"/>`}
    if(f>=0.07){const [tx,ty]=parts.length===1?[C,C]:pt(am,R*0.62); svg+=`<text class="part-t" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${esc(eur0(p.v))}</text>`}
    a0=a1;
  }
  const resume=parts.map(p=>`${p.nom} ${eur0(p.v)}`).join(', ');
  return `<div class="camembert"><svg viewBox="0 0 320 320" role="img" aria-label="Camembert des dépenses : ${esc(resume)}">${svg}</svg>
    <div class="cam-leg">${parts.map(p=>{const tag=cliquable&&p.id!=='_autres'?'button':'div', at=cliquable&&p.id!=='_autres'?` data-bcat="${p.id}"`:'';
      return `<${tag} class="cam-l"${at}><span class="cam-pt c${p.i+1}"></span><span class="cam-nom">${esc(p.nom)}</span><span class="cam-val"><b>${eur0(p.v)}</b> <span class="cam-pc">${Math.round(p.v/total*100)} %</span></span></${tag}>`}).join('')}</div></div>`;
}
