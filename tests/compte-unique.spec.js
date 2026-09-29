import {test,expect,openWith} from './helpers.js';
/* Mêmes opérations, avec deux comptes (pro et perso) ou un seul compte qui sert à tout : mêmes résultats */
const OPS=[['2026-06-03','VIR CLIENT ALPHA',3000,'pr'],['2026-06-18','VIR CLIENT BETA',1200,'pr'],['2026-06-08','CB ADOBE',-60,'pr'],['2026-06-12','CB LDLC',-240,'pr'],
  ['2026-06-05','CB CARREFOUR',-320,'pe'],['2026-06-10','CB RESTO DU PORT',-90,'pe'],['2026-06-15','VIR CAF',150,'pe'],['2026-06-29','CB BOULANGERIE',-5,'pe']];
const RULES={'CLIENT ALPHA':'revenus','CLIENT BETA':'revenus',ADOBE:'logiciels',LDLC:'materiel',CARREFOUR:'courses','RESTO PORT':'resto',CAF:'rentrees',BOULANGERIE:'resto'};
function etat(unique){
  return {schemaVersion:9,onboarded:true,settings:{taux:22},
    accounts:unique?[{id:'m',name:'Ma banque',type:'mixte',confirmed:true}]:[{id:'pr',name:'Pro',type:'pro',confirmed:true},{id:'pe',name:'Perso',type:'perso',confirmed:true}],
    ops:OPS.map(([d,l,a,acc],i)=>({id:'o'+i,date:d,label:l,amount:a,merchant:l.replace(/^(VIR|CB) /,'').replace(' DU ',' '),acct:unique?'m':acc})),rules:RULES};
}
const mesure=page=>page.evaluate(()=>{const p={lvl:'M',y:2026,m:6},X=agg(p,'pro'),Pe=agg(p,'perso'),s=vraiSalaire(p),j=justePrix();
  return {ca:X.ca,frais:X.fraisExpl,net:X.revenuNet,vrai:+s.vrai.toFixed(4),prix:+j.heure.toFixed(4),perso:Pe.net,rentrees:Pe.inc.rentrees||0,
    heures:S.ops.filter(estEncaissementPro).map(o=>Math.round(o.amount/heuresPrix()))}});
test('un seul compte qui sert à tout : mêmes chiffres qu’avec un compte pro et un compte perso',async({page})=>{
  await openWith(page,etat(false)); const deux=await mesure(page);
  await page.evaluate(e=>{localStorage.setItem('mes-comptes-v1',JSON.stringify(e))},etat(true)); await page.reload(); await page.waitForSelector('#view');
  const un=await mesure(page);
  expect(un).toEqual(deux);
  expect(un).toMatchObject({ca:4200,frais:300,rentrees:150});
  expect(un.heures).toHaveLength(2);
});
test('compte sans compte pro : pour une rentrée d’argent inconnue, « Cet argent vient-il d’un client ? »',async({page})=>{
  const e=etat(true); e.rules={}; await openWith(page,e);
  await page.click('nav.tabs [data-tab="operations"]');
  const q=page.locator('.client-q',{hasText:'CLIENT ALPHA'});
  await expect(q.locator('.q-question')).toHaveText('Cet argent vient-il d’un client ?');
  await expect(q.locator('.choix-btn')).toHaveText(['Oui, c’est un client','Non (CAF, vente, remboursement, virement perso…)']);
  await q.locator('.choix-btn',{hasText:'Oui'}).click();
  await page.locator('.client-q').filter({has:page.locator('.q-t',{hasText:/^CAF$/})}).locator('.choix-btn',{hasText:'Non'}).click();
  const r=await page.evaluate(()=>{const p={lvl:'M',y:2026,m:6};return [agg(p,'pro').ca,agg(p,'perso').inc.rentrees]});
  expect(r).toEqual([3000,150]);
});
test('démarrage : « Avez-vous un compte bancaire réservé à votre activité ? » ; « Non » fait supposer un compte qui sert à tout',async({page})=>{
  await openWith(page,'vierge');
  await page.click('[data-onb="1"]'); await page.click('[data-onb="2"]');
  await expect(page.locator('.demarrage')).toContainText('Avez-vous un compte bancaire réservé à votre activité ?');
  await page.click('[data-cu="1"]');
  await expect(page.locator('.demarrage')).toContainText('vous aurez simplement à nous dire, pour chaque personne qui vous paie, s’il s’agit d’un client');
  expect(await page.evaluate(()=>[S.settings.compteUnique,guessType('Crédit Agricole','','Crédit Agricole')])).toEqual([true,'mixte']);
});
test('plus de comptable : ni rubrique, ni ligne dans la démo ; ancienne rubrique reprise dans « Autres frais de l’activité »',async({page})=>{
  await openWith(page,{schemaVersion:8,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],
    categories:[{id:'conseils',name:'Conseils et services',icon:'messages-square',type:'expense',univers:'pro'}],rules:{'CABINET DUPONT':'conseils'},
    ops:[{id:'1',date:'2026-06-10',label:'PRLV CABINET DUPONT',amount:-80,merchant:'CABINET DUPONT',acct:'pr'}]});
  expect(await page.evaluate(()=>[!!catById('conseils'),S.rules['CABINET DUPONT'],S.schemaVersion])).toEqual([false,'pro',10]);
  const d=await page.evaluate(()=>demoData().ops.some(o=>/COMPTAB|INDY/.test(o.label)));
  expect(d).toBe(false);
  const h=(await import('fs')).readFileSync(new URL('../dist/mes-comptes.html',import.meta.url),'utf8');
  expect(/comptable/i.test(h)).toBe(false);
});
test('heures par jour facturé : question claire, avec un exemple chiffré',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('nav.tabs [data-tab="objectifs"]');
  await page.locator('.affiner summary').click();
  const c=page.locator('label.champ',{hasText:'combien d’heures compte une journée'});
  await expect(c).toContainText('Si vous facturez à la journée : combien d’heures compte une journée ?');
  await expect(c.locator('+ .sous-champ')).toContainText(/Sert seulement à calculer votre prix à la journée, à partir de votre prix à l’heure \(par exemple \d+\s€ × 7 h = \d[\d\s]*\s€ la journée\)\./);
});
