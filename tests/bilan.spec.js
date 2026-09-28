import {test,expect,openWith} from './helpers.js';
async function demo(page){await openWith(page,null);await page.click('[data-act="demo"]');await page.click('nav.tabs [data-tab="bilan"]')}
const n=t=>+t.replace(/[^\d,−-]/g,'').replace('−','-').replace(',','.');

test('vue Mois : totaux identiques à l’Accueil, pour chaque mois de la démo, perso et activité',async({page})=>{
  await demo(page);
  const r=await page.evaluate(()=>{const out=[];for(let k=0;k<12;k++){const p=shift(defaultPeriod(),-k);
    out.push([bilan(p,'perso').total,agg(p,'perso').net,bilan(p,'pro').total,agg(p,'pro').fraisExpl])}return out});
  for(const [a,b,c,d] of r){expect(a).toBeCloseTo(b,6);expect(c).toBeCloseTo(d,6)}
  // Et à l'écran : le total au centre de l'anneau égale la phrase de l'Accueil
  const centre=await page.locator('.anneau-bilan text').first().textContent();
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

test('répartition : 7 parts au plus, légende triée avec montant et pourcentage, fiche au toucher',async({page})=>{
  await demo(page);
  await page.click('[data-blvl="Y"]');
  await expect(page.locator('.mois h2')).toHaveText(/^\d{4}$/);
  const parts=await page.locator('.anneau-bilan circle.part').count();
  expect(parts).toBeLessThanOrEqual(7);
  await expect(page.locator('.leg').last()).toBeVisible();
  const leg=page.locator('.legende > .leg');
  await expect(leg.filter({hasText:'Autres ('})).toHaveCount(1);
  const am=(await page.locator('.legende > .leg:not(:has(.pastille.vide)) .leg-amt').allTextContents()).map(n);
  expect(am.slice(0,-1)).toEqual([...am.slice(0,-1)].sort((a,b)=>b-a));
  await expect(leg.first().locator('.leg-pc')).toHaveText(/\d+ %/);
  await leg.first().click();
  const f=page.locator('.fiche');
  await expect(f).toContainText('En moyenne par mois');
  await expect(f).toContainText('Par rapport à l’année précédente');
  await expect(f.locator('.col')).toHaveCount(12);
  expect(await f.locator('.op').count()).toBeGreaterThan(0);
  await page.click('.fiche .fermer');
  // Toucher l'anneau lui-même, juste à droite de midi : c'est la première part (la plus grosse)
  const b=await page.locator('.anneau-bilan').boundingBox(), k=b.width/200;
  await page.mouse.click(b.x+(100+80*Math.sin(.15))*k,b.y+(100-80*Math.cos(.15))*k);
  await expect(page.locator('.fiche .f-m')).toHaveText(await page.locator('.legende > .leg').first().locator('.leg-nom').textContent());
  await expect(page.locator('.fiche')).toBeVisible();
});

test('évolution : 6 barres en Mois, 3 en Trimestre, 12 en Année, moyenne en pointillés ; toucher une barre ouvre ce mois',async({page})=>{
  await demo(page);
  const cols=page.locator('.carte:has(h3:text("Évolution")) .col');
  await expect(cols).toHaveCount(6);
  await expect(page.locator('.carte:has(h3:text("Évolution")) .moyenne')).toHaveCount(1);
  await expect(page.locator('.legende-moy')).toContainText('En moyenne :');
  await page.click('[data-blvl="Q"]'); await expect(page.locator('.mois h2')).toHaveText(/trimestre/); await expect(cols).toHaveCount(3);
  await page.click('[data-blvl="Y"]'); await expect(cols).toHaveCount(12);
  await cols.nth(2).click();
  await expect(page.locator('[data-blvl="M"]')).toHaveAttribute('aria-pressed','true');
  const mois=await page.evaluate(()=>PB);
  expect(mois).toMatchObject({lvl:'M',m:3});
  await page.click('[data-bshift="-1"]');
  expect(await page.evaluate(()=>PB.m)).toBe(2);
});

test('par rapport à la période précédente : 5 plus gros écarts, voir tout, dérapage en orange',async({page})=>{
  await demo(page);
  const e=page.locator('.ecart');
  await expect(e).toHaveCount(5);
  await expect(page.locator('.ecart.derape',{hasText:'Restaurants et cafés'})).toHaveCount(1);
  await expect(page.locator('.ecart',{hasText:'Restaurants et cafés'}).locator('.e-val')).toHaveText(/^\+\d[\d\s]*\s€, \+\d+\s%$/);
  await page.click('[data-btout]');
  expect(await e.count()).toBeGreaterThan(5);
  const d=(await page.locator('.e-val').allTextContents()).map(t=>Math.abs(n(t.split(',')[0])));
  expect(d).toEqual([...d].sort((a,b)=>b-a));
});

test('choix Perso / Activité : absent sans frais d’activité ; en Activité, total = frais de l’activité',async({page})=>{
  await demo(page);
  await page.click('[data-bu="pro"]');
  const r=await page.evaluate(()=>({t:bilan(PB,'pro').total,f:agg(PB,'pro').fraisExpl}));
  expect(n(await page.locator('.anneau-bilan text').first().textContent())).toBe(Math.round(r.f));
  await openWith(page,{schemaVersion:4,onboarded:true,accounts:[{id:'a',name:'A',type:'perso',confirmed:true}],ops:[{id:'1',date:'2026-06-03',label:'CB CARREFOUR',amount:-50,merchant:'CARREFOUR',acct:'a'}],rules:{CARREFOUR:'courses'}});
  await page.click('nav.tabs [data-tab="bilan"]');
  await expect(page.locator('[data-bu]')).toHaveCount(0);
});
