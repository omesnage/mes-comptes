import {test,expect,openWith} from './helpers.js';
/* Données sur 2026 : perso (courses, restos, shopping, rémunération) et pro (chiffre d'affaires, frais, URSSAF) */
function etat(extra={}){
  const ops=[]; let n=0; const add=(d,a,m,acct='pe')=>ops.push({id:'o'+n++,date:d,label:m,amount:a,merchant:m,acct});
  for(let m=1;m<=6;m++){const mm=String(m).padStart(2,'0');
    add(`2026-${mm}-02`,2000,'QONTO');add(`2026-${mm}-01`,-2000,'VIR PERSO','pr');
    add(`2026-${mm}-05`,-300,'CARREFOUR');add(`2026-${mm}-12`,m===6?-40:-120,'RESTO');add(`2026-${mm}-20`,m===5?0.01:-60,'AMAZON');
    add(`2026-${mm}-08`,m===4?1500:3500,'CLIENT','pr');add(`2026-${mm}-15`,-600,'URSSAF','pr');add(`2026-${mm}-28`,-50,'ADOBE','pr');}
  return {schemaVersion:3,since:Date.now(),lastBackup:Date.now(),accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true},{id:'pr',name:'Pro',type:'pro',confirmed:true}],
    ops:ops.filter(o=>o.amount!==0.01),rules:{CARREFOUR:'courses',RESTO:'resto',AMAZON:'shopping',CLIENT:'revenus',URSSAF:'cotisations',ADOBE:'logiciels','VIR PERSO':'remu',QONTO:'remu'},
    settings:{taux:20,epargne:6000},challenges:[],...extra};
}
const ev=(page,c)=>page.evaluate(c=>{render();const x=evalDefi({key:'t',...c});return {status:x.status,v:x.v,target:x.target,economie:x.economie,txt:x.txt,prog:x.prog}},c);

test('défis mensuels : zéro, pourcentage, lisse, épargne, budgets, abonnements',async({page})=>{
  await openWith(page,etat());
  expect(await ev(page,{id:'noshop',month:'2026-05'})).toMatchObject({status:'réussi',v:0});
  expect(await ev(page,{id:'noshop',month:'2026-04'})).toMatchObject({status:'manqué',v:60});
  const r=await ev(page,{id:'auto',month:'2026-06',cat:'resto',pct:.25});
  expect(r).toMatchObject({status:'réussi',v:40,target:90,economie:80});
  expect((await ev(page,{id:'courses10',month:'2026-06'})).status).toBe('manqué');
  expect((await ev(page,{id:'epargne10',month:'2026-06'})).status).toBe('réussi');
  expect((await ev(page,{id:'noabo',month:'2026-06'})).status).toBe('réussi');
  expect((await ev(page,{id:'noabo',month:'2026-01'})).status).toBe('manqué');
  expect((await ev(page,{id:'budgets',month:'2026-06'})).txt).toContain('Fixez d’abord');
  await page.evaluate(()=>{catById('courses').budget=350});
  expect((await ev(page,{id:'budgets',month:'2026-06'})).status).toBe('réussi');
});

test('défis pro, hebdomadaires et séries',async({page})=>{
  await openWith(page,etat());
  expect((await ev(page,{id:'p-taux',month:'2026-03'})).status).toBe('réussi');
  expect((await ev(page,{id:'p-taux',month:'2026-04'})).status).toBe('manqué');
  expect(await ev(page,{id:'p-encaisser',month:'2026-03',montant:3000})).toMatchObject({status:'réussi',v:3500});
  expect((await ev(page,{id:'h-enligne',week:'2026-05-18'})).status).toBe('réussi');
  expect((await ev(page,{id:'h-enligne',week:'2026-04-20'})).status).toBe('manqué');
  expect((await ev(page,{id:'h-courses',week:'2026-06-01'})).status).toBe('manqué');
  expect(await ev(page,{id:'s-budget3',month:'2026-01'})).toMatchObject({status:'réussi',v:3});
  const s=await ev(page,{id:'s-seuil3',month:'2026-02'});
  expect(s).toMatchObject({status:'manqué',v:2});
  expect(await ev(page,{id:'s-seuil6',month:'2026-05'})).toMatchObject({status:'en cours',v:2});
});

test('relevés en décalage : défi du mois en cours « en cours », mois fini sans relevé « en attente »',async({page})=>{
  await openWith(page,etat());
  const cur=await page.evaluate(()=>{render();return evalDefi({key:'a',id:'noresto',month:thisMonth()})});
  expect(cur.status).toBe('en cours'); expect(cur.jours).toBeGreaterThan(0);
  const att=await ev(page,{id:'courses10',month:'2026-07'});
  expect(att.status).toBe('en attente'); expect(att.txt).toContain('En attente de votre relevé de juillet');
});

test('défi du mois proposé sur le poste variable le plus lourd',async({page})=>{
  await openWith(page,etat());
  const p=await page.evaluate(()=>{render();return defiPropose()});
  expect(p.cat).toBe('courses'); expect(p.pct).toBe(.25);
  expect(p.texte.replace(/\s/g,' ')).toContain('défi −25 % ce mois-ci, soit 75 € d’économie');
});

test('score de santé : six critères, total sur 100, expliqué',async({page})=>{
  await openWith(page,etat());
  const s=await page.evaluate(()=>{render();return scoreSante({lvl:'M',y:2026,m:6})});
  expect(s.parts.map(p=>p.id)).toEqual(['taux','matelas','provision','solde','imports','classees']);
  const tot=s.parts.reduce((a,p)=>a+p.pts,0)/s.parts.reduce((a,p)=>a+p.max,0)*100;
  expect(s.score).toBe(Math.round(tot));
  expect(s.parts.find(p=>p.id==='taux').pts).toBe(25);
  expect(s.parts.find(p=>p.id==='classees').pts).toBe(15);
  await page.click('nav.tabs [data-tab="objectifs"]');
  await expect(page.locator('.jauge')).toBeVisible();
  await expect(page.locator('#view')).toContainText('Ce qui fait monter votre score');
});

test('niveaux, médailles, série, cagnotte',async({page})=>{
  await openWith(page,etat());
  const r=await page.evaluate(()=>{render();return {xp:experience(),med:medailles(),serie:serie(),cag:cagnotte()}});
  expect(r.med).toHaveLength(30);
  expect(new Set(r.med.map(m=>m.fam)).size).toBe(6);
  expect(r.xp.lignes[0]).toMatchObject({n:6,xp:300});
  expect(r.xp.nom).toBe(r.xp.total>=800?'Artisan':'Compagnon');
  expect(r.serie.n).toBe(0); // données de 2026-06 : série trop ancienne pour être en cours
  expect(r.serie.best).toBe(6);
  expect(r.cag.tot).toBeGreaterThan(0);
  const suivis=r.med.find(m=>m.id==='suivis');
  expect(suivis).toMatchObject({tier:2,txt:'6 mois suivis',nextTxt:'12 mois suivis'});
});

test('passage de niveau célébré une fois, puis fermé',async({page})=>{
  const e=etat(); e.game={seenLevel:0};
  await openWith(page,e);
  await expect(page.locator('#celebre')).toBeVisible();
  await expect(page.locator('#celebre h2')).not.toBeEmpty();
  await page.click('[data-act="closecelebre"]');
  await expect(page.locator('#celebre')).toHaveCount(0);
  await page.reload(); await page.waitForSelector('#view');
  await expect(page.locator('#celebre')).toHaveCount(0);
});

test('relever, suivre et abandonner un défi dans l’onglet Défis',async({page})=>{
  await openWith(page,etat());
  await page.click('nav.tabs [data-tab="defis"]');
  await expect(page.locator('.propose')).toContainText('Le défi du mois');
  await page.click('.propose [data-defi="auto"]');
  await expect(page.locator('.defi-card')).toHaveCount(1);
  await page.locator('.defi [data-defi="h-resto"]').click();
  await expect(page.locator('.defi-card')).toHaveCount(2);
  await expect(page.locator('.defi-card').first()).toContainText('jour');
  await page.locator('.defi-card [data-undefi]').first().click();
  await expect(page.locator('.defi-card')).toHaveCount(1);
  await expect(page.locator('.medal')).toHaveCount(30);
});

test('démo : défis réussis, manqués et en cours, célébration à l’ouverture de l’onglet Défis',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  await expect(page.locator('#celebre')).toHaveCount(0);
  await page.click('nav.tabs [data-tab="defis"]');
  await expect(page.locator('#celebre')).toBeVisible();
  await page.click('[data-act="closecelebre"]');
  const st=await page.evaluate(()=>GAME.defis.map(x=>x.id+':'+x.status));
  expect(st).toEqual(expect.arrayContaining(['noshop:réussi','p-taux:réussi','h-enligne:réussi','noresto:manqué','p-encaisser:en cours']));
  await expect(page.locator('.defi-card.good').first()).toBeVisible();
  await page.click('nav.tabs [data-tab="objectifs"]');
  await expect(page.locator('#view')).toContainText('Voyage au Japon');
  await page.click('nav.tabs [data-tab="synthese"]');
  await page.click('[data-lvl="Y"]');
  await page.click('[data-act="review"]');
  await expect(page.locator('#review')).toContainText('Votre heure de travail vous a rapporté');
  await expect(page.locator('#review')).toContainText('Défis réussis');
  await expect(page.locator('#review')).toContainText('Votre niveau');
});
