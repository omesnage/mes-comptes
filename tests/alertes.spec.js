import {test,expect,openWith} from './helpers.js';
/* État de test : compte perso « pe » et compte pro « pr ». Opérations : [date, montant, marchand, compte] ; règles à part. */
function etat(ops,rules={},extra={}){
  return {schemaVersion:3,since:Date.now(),lastBackup:Date.now(),accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true},{id:'pr',name:'Pro',type:'pro',confirmed:true}],
    ops:ops.map(([date,amount,merchant,acct,x],i)=>({id:'o'+i,date,label:merchant,amount,merchant,acct:acct||'pe',...(x||{})})),
    rules:{CAF:'rentrees',CLIENT:'revenus',CARREFOUR:'courses',RESTO:'resto',NETFLIX:'abonnements',URSSAF:'cotisations',...rules},settings:{taux:20,...extra.settings},...extra,settings:{taux:20,...(extra.settings||{})}};
}
const mois=(m,j=15)=>`2026-${String(m).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
async function ids(page,U,m){return page.evaluate(([U,m])=>{P={lvl:'M',y:2026,m};render();return computeAlerts(U).map(a=>a.id+':'+a.level)},[U,m])}
/* Mois complet : une petite opération le 28 */
const fin=m=>[mois(m,28),-1,'CARREFOUR'];

test('revenu sous l’objectif (critique) ou atteint (bonne nouvelle)',async({page})=>{
  await openWith(page,etat([[mois(5),2000,'CLIENT','pr'],[mois(6),3000,'CLIENT','pr'],fin(5),fin(6)]));
  expect(await ids(page,'pro',5)).toContain('revenu:crit');
  expect(await ids(page,'pro',6)).toContain('revenu-ok:good');
  expect(await ids(page,'perso',5)).not.toContain('revenu:crit');
});

test('solde négatif',async({page})=>{
  await openWith(page,etat([[mois(6),1000,'CAF'],[mois(6),-1500,'CARREFOUR'],fin(6)]));
  expect(await ids(page,'perso',6)).toContain('solde:crit');
  expect(await ids(page,'all',6)).toContain('solde:crit');
});

test('matelas sous 1 mois (critique), sous 3 mois (attention)',async({page})=>{
  const ops=[4,5,6].map(m=>[mois(m),-1500,'CARREFOUR']);
  await openWith(page,etat(ops,{},{settings:{epargne:500}}));
  expect(await ids(page,'all',6)).toContain('matelas:crit');
  await page.evaluate(()=>{S.settings.epargne=3000});
  expect(await ids(page,'all',6)).toContain('matelas:warn');
  await page.evaluate(()=>{S.settings.epargne=6000});
  expect((await ids(page,'all',6)).filter(x=>x.startsWith('matelas'))).toEqual([]);
});

test('trésorerie pro inférieure à la provision',async({page})=>{
  const e=etat([[mois(1,10),5000,'CLIENT','pr'],[mois(1,20),-4500,'FOURNISSEUR','pr']],{FOURNISSEUR:'materiel'},{settings:{taux:25}});
  e.accounts[1].solde=0; e.accounts[1].soldeDate='2026-01-01';
  await openWith(page,e);
  // Solde 500 €, provision 1 250 €
  expect(await ids(page,'pro',1)).toContain('tresorerie:crit');
});

test('budget dépassé : de plus de 20 % (critique), de moins (attention)',async({page})=>{
  const e=etat([[mois(6),-400,'CARREFOUR']]); e.categories=undefined;
  await openWith(page,e);
  await page.evaluate(()=>{catById('courses').budget=300});
  expect(await ids(page,'perso',6)).toContain('budget:courses:crit');
  await page.evaluate(()=>{catById('courses').budget=380});
  expect(await ids(page,'perso',6)).toContain('budget:courses:warn');
});

test('poste en hausse (attention) ou en forte baisse (bonne nouvelle)',async({page})=>{
  const base=[3,4,5].map(m=>[mois(m),-100,'RESTO']);
  await openWith(page,etat([...base,[mois(6),-160,'RESTO'],fin(6)]));
  expect(await ids(page,'perso',6)).toContain('hausse:resto:warn');
  await page.evaluate(()=>{S.ops.find(o=>o.amount===-160).amount=-50});
  expect(await ids(page,'perso',6)).toContain('baisse:resto:good');
});

test('nouvel abonnement et abonnement dont le prix augmente',async({page})=>{
  await openWith(page,etat([[mois(6),-13.49,'NETFLIX'],[mois(6),-10,'SPOTIFY']],{SPOTIFY:'abonnements'}));
  expect(await ids(page,'all',6)).toEqual(expect.arrayContaining(['abo-nouveau:NETFLIX:warn','abo-nouveau:SPOTIFY:warn']));
  await page.evaluate(()=>{S.ops.push({id:'n1',date:'2026-07-05',label:'NETFLIX',amount:-15.99,merchant:'NETFLIX',acct:'pe'});S.ops.sort((a,b)=>a.date<b.date?1:-1)});
  const x=await ids(page,'all',7);
  expect(x).toContain('abo-hausse:NETFLIX:warn');
  expect(x).not.toContain('abo-nouveau:NETFLIX:warn');
});

test('retour en attente depuis plus de 30 jours',async({page})=>{
  await openWith(page,etat([[mois(6),-89,'AMAZON',null,{awaiting:true}]],{AMAZON:'shopping'}));
  expect(await ids(page,'perso',6)).toContain('retours:warn');
});

test('trois mois de baisse du chiffre d’affaires',async({page})=>{
  await openWith(page,etat([[mois(3),4000,'CLIENT','pr'],[mois(4),3500,'CLIENT','pr'],[mois(5),3000,'CLIENT','pr'],[mois(6),2500,'CLIENT','pr'],fin(6)]));
  expect(await ids(page,'pro',6)).toContain('ca-baisse:warn');
  expect(await ids(page,'pro',5)).not.toContain('ca-baisse:warn');
});

test('opérations non classées',async({page})=>{
  await openWith(page,etat([[mois(6),-30,'INCONNU']]));
  expect(await ids(page,'all',6)).toContain('non-classees:warn');
});

test('rappel de sauvegarde après 30 jours',async({page})=>{
  const e=etat([[mois(6),-30,'CARREFOUR']]); e.lastBackup=Date.now()-40*864e5;
  await openWith(page,e);
  expect(await ids(page,'all',6)).toContain('sauvegarde:warn');
  await page.evaluate(()=>{S.lastBackup=Date.now()});
  expect(await ids(page,'all',6)).not.toContain('sauvegarde:warn');
});

test('meilleur mois de l’année et mois exceptionnel',async({page})=>{
  await openWith(page,etat([[mois(3),2000,'CLIENT','pr'],[mois(4),2100,'CLIENT','pr'],[mois(5),1900,'CLIENT','pr'],[mois(6),4500,'CLIENT','pr'],fin(6)]));
  expect(await ids(page,'pro',6)).toEqual(expect.arrayContaining(['record:good','gros-mois:good']));
});

test('défi réussi',async({page})=>{
  const e=etat([[mois(5,3),-50,'CARREFOUR'],[mois(5,29),-20,'CARREFOUR'],fin(6)]); e.challenges=[{id:'noresto',month:'2026-05'}];
  await openWith(page,e);
  expect(await ids(page,'all',6)).toContain('defi:noresto:2026-05:good');
});

test('palier de matelas franchi',async({page})=>{
  const ops=[1,2,3,4,5].map(m=>[mois(m),-2000,'CARREFOUR']);
  await openWith(page,etat([...ops,[mois(6),-500,'CARREFOUR']],{},{settings:{epargne:5500}}));
  expect(await ids(page,'all',6)).toContain('palier:3:good');
});

test('bandeau : 3 alertes au plus, les autres repliées, pastille rouge sur l’onglet concerné',async({page})=>{
  const ops=[[mois(6),1000,'CAF'],[mois(6),-1500,'CARREFOUR'],[mois(6),-30,'INCONNU'],[mois(6),-13.49,'NETFLIX'],[mois(6),-89,'AMAZON',null,{awaiting:true}]];
  await openWith(page,etat(ops,{AMAZON:'shopping'},{settings:{epargne:300}}));
  await page.click('[data-univ="perso"]');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:6};render()});
  const n=await page.evaluate(()=>visibleAlerts('perso').length);
  expect(n).toBeGreaterThan(3);
  await expect(page.locator('.alertes > .alerte')).toHaveCount(3);
  await expect(page.locator('.alertes details.plus summary')).toHaveText(`Voir les ${n-3} autres`);
  // Les critiques passent en premier
  await expect(page.locator('.alertes > .alerte').first()).toHaveClass(/crit/);
  // Pastille rouge : matelas critique → onglet Objectifs ; les non classées (attention) n'en ont pas
  await expect(page.locator('nav.tabs [data-tab="objectifs"] .dot')).toHaveCount(1);
  await expect(page.locator('nav.tabs [data-tab="valider"] .dot')).toHaveCount(0);
  // L'action mène au bon endroit
  await page.locator('.alerte[data-alert="matelas"] [data-tab="objectifs"]').click();
  await expect(page.locator('nav.tabs [data-tab="objectifs"]')).toHaveAttribute('aria-current','true');
});

test('masquer une alerte pour le mois ; elle revient si la situation s’aggrave',async({page})=>{
  await openWith(page,etat([[mois(6),1000,'CAF'],[mois(6),-1500,'CARREFOUR']]));
  await page.click('[data-univ="perso"]');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:6};render()});
  await page.locator('.alerte[data-alert="solde"] [data-mask]').click();
  await expect(page.locator('.alerte[data-alert="solde"]')).toHaveCount(0);
  await page.reload(); await page.waitForSelector('.univ');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:6};render()});
  await expect(page.locator('.alerte[data-alert="solde"]')).toHaveCount(0);
  // Un autre mois : l'alerte n'est pas masquée
  await page.evaluate(()=>{S.ops.push({id:'j1',date:'2026-07-02',label:'CB',amount:-200,merchant:'CARREFOUR',acct:'pe'});P={lvl:'M',y:2026,m:7};render()});
  await expect(page.locator('.alerte[data-alert="solde"]')).toHaveCount(1);
  // Juin s'aggrave : elle revient
  await page.evaluate(()=>{S.ops.push({id:'j2',date:'2026-06-20',label:'CB',amount:-300,merchant:'CARREFOUR',acct:'pe'});P={lvl:'M',y:2026,m:6};render()});
  await expect(page.locator('.alerte[data-alert="solde"]')).toHaveCount(1);
});
