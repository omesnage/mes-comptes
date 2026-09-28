import {test,expect,openWith} from './helpers.js';
async function demo(page){await openWith(page,null);await page.click('[data-act="demo"]');await page.click('nav.tabs [data-tab="bilan"]')}
const n=t=>+t.replace(/[^\d,−-]/g,'').replace('−','-').replace(',','.');

test('vue Mois : totaux identiques à l’Accueil, pour chaque mois de la démo, perso et activité',async({page})=>{
  await demo(page);
  const r=await page.evaluate(()=>{const out=[];for(let k=0;k<12;k++){const p=shift(defaultPeriod(),-k);
    out.push([bilan(p,'perso').total,agg(p,'perso').net,bilan(p,'pro').total,agg(p,'pro').fraisExpl])}return out});
  for(const [a,b,c,d] of r){expect(a).toBeCloseTo(b,6);expect(c).toBeCloseTo(d,6)}
  // Et à l'écran : le total au centre de l'anneau égale la phrase de l'Accueil
  const centre=await page.locator('.rep-total').evaluate(e=>e.firstChild.textContent);
  await page.click('nav.tabs [data-tab="accueil"]');
  const acc=await page.locator('.argent .phrase').textContent();
  expect(n(centre)).toBe(n(acc));
});

test('vue Année = somme des 12 mois ; vue Trimestre = somme de ses 3 mois',async({page})=>{
  await demo(page);
  const r=await page.evaluate(()=>{const d=defaultPeriod(),y=d.y;const out={};
    for(const U of ['perso','pro']){let s=0;for(let m=1;m<=12;m++)s+=bilan({lvl:'M',y,m},U).total;out[U]=[bilan({lvl:'Y',y,m:1},U).total,s];
      let q=0;for(let m=1;m<=3;m++)q+=bilan({lvl:'M',y,m},U).total;out[U+'Q']=[bilan({lvl:'Q',y,m:2},U).total,q];
      const cat={};for(let m=1;m<=12;m++)for(const [c,v] of bilan({lvl:'M',y,m},U).rows)cat[c]=(cat[c]||0)+v;
      out[U+'R']=bilan({lvl:'Y',y,m:1},U).rows.every(([c,v])=>Math.abs(cat[c]-v)<1e-6)}
    return out});
  for(const U of ['perso','pro']){expect(r[U][0]).toBeCloseTo(r[U][1],6);expect(r[U+'Q'][0]).toBeCloseTo(r[U+'Q'][1],6);expect(r[U+'R']).toBe(true)}
});

test('répartition : une barre étiquetée par rubrique (nom, montant, pourcentage), triée, fiche au toucher',async({page})=>{
  await demo(page);
  await page.click('[data-blvl="Y"]');
  await expect(page.locator('.mois h2')).toHaveText(/^\d{4}$/);
  await expect(page.locator('.repartition h3')).toHaveText(/^Répartition de vos dépenses de \d{4}$/);
  const l=page.locator('.rep-l'); const n0=await l.count(); expect(n0).toBeGreaterThan(5);
  for(let i=0;i<n0;i++){expect((await l.nth(i).locator('.rep-nom').textContent()).trim()).not.toBe('');expect(await l.nth(i).locator('.rep-val').textContent()).toMatch(/\d\s€ · \d+ %/)}
  const am=(await page.locator('.rep-val b').allTextContents()).map(n);
  expect(am).toEqual([...am].sort((a,b)=>b-a));
  await l.first().click();
  const f=page.locator('.fiche');
  await expect(f).toContainText('En moyenne par mois');
  await expect(f).toContainText('Par rapport à l’année précédente');
  await expect(f.locator('.col')).toHaveCount(12);
  expect(await f.locator('.op').count()).toBeGreaterThan(0);
});

test('évolution : 6 barres en Mois, 3 en Trimestre, 12 en Année, moyenne en pointillés ; toucher une barre ouvre ce mois',async({page})=>{
  await demo(page);
  const cols=page.locator('.carte:has(h3:text("Évolution")) .col');
  await expect(cols).toHaveCount(6);
  await expect(page.locator('.carte:has(h3:text("Évolution")) .moyenne')).toHaveCount(1);
  await expect(page.locator('.legende-moy').first()).toContainText('Ligne pointillée : votre moyenne,');
  await page.click('[data-blvl="Q"]'); await expect(page.locator('.mois h2')).toHaveText(/trimestre/); await expect(cols).toHaveCount(3);
  await page.click('[data-blvl="Y"]'); await expect(cols).toHaveCount(12);
  await cols.nth(2).click();
  await expect(page.locator('[data-blvl="M"]')).toHaveAttribute('aria-pressed','true');
  const mois=await page.evaluate(()=>PB);
  expect(mois).toMatchObject({lvl:'M',m:3});
  await page.click('[data-bshift="-1"]');
  expect(await page.evaluate(()=>PB.m)).toBe(2);
});

test('par rapport à la période précédente : en euros seulement, écarts de plus de 30 €, flèches, voir tout',async({page})=>{
  await demo(page);
  const e=page.locator('.ecart');
  expect(await e.count()).toBeLessThanOrEqual(5);
  const resto=page.locator('.ecart',{hasText:'Restaurants et cafés'});
  await expect(resto.locator('.e-nom')).toHaveText(/^Restaurants et cafés : \d[\d\s]*\s€ en \S+, contre \d[\d\s]*\s€ en \S+$/);
  await expect(resto).toHaveClass(/hausse/); await expect(resto.locator('.e-fleche')).toHaveText('↑');
  await expect(page.locator('.ecarts')).not.toContainText('%');
  const r=await page.evaluate(()=>{const U=bilanU(),B=bilan(PB,U),pr=bilan(shift(PB,-1),U);const ids=[...new Set([...B.rows,...pr.rows].map(x=>x[0]))];
    return ids.map(c=>(B.rows.find(x=>x[0]===c)?.[1]||0)-(pr.rows.find(x=>x[0]===c)?.[1]||0)).filter(d=>Math.abs(d)>30).length});
  if(r>5){await page.click('[data-btout]');await expect(e).toHaveCount(r)}
  // Mots de la période en cours
  expect(await page.evaluate(()=>{const d=new Date();return [motsPeriode({lvl:'M',y:d.getFullYear(),m:d.getMonth()+1}),motsPeriode({lvl:'Q',y:d.getFullYear(),m:d.getMonth()+1}),motsPeriode({lvl:'Y',y:d.getFullYear(),m:1})]})).toEqual([['ce mois-ci','le mois dernier'],['ce trimestre','le trimestre dernier'],['cette année','l’an dernier']]);
});

test('choix Perso / Activité : absent sans frais d’activité ; en Activité, total = frais de l’activité',async({page})=>{
  await demo(page);
  await page.click('[data-bu="pro"]');
  const r=await page.evaluate(()=>({t:bilan(PB,'pro').total,f:agg(PB,'pro').fraisExpl}));
  expect(n(await page.locator('.rep-total').evaluate(e=>e.firstChild.textContent))).toBe(Math.round(r.f));
  await openWith(page,{schemaVersion:4,onboarded:true,accounts:[{id:'a',name:'A',type:'perso',confirmed:true}],ops:[{id:'1',date:'2026-06-03',label:'CB CARREFOUR',amount:-50,merchant:'CARREFOUR',acct:'a'}],rules:{CARREFOUR:'courses'}});
  await page.click('nav.tabs [data-tab="bilan"]');
  await expect(page.locator('[data-bu]')).toHaveCount(0);
});
