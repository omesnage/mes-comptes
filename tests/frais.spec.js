import {test,expect,openWith,importer} from './helpers.js';
import fs from 'fs';
/* Compte pro « pr » et compte perso « pe » ; essence payée en perso, remboursée par l'activité */
function etat(label,extra={}){
  const ops=[
    {id:'c',date:'2026-05-03',label:'VIR CLIENT',amount:3000,merchant:'CLIENT',acct:'pr'},
    {id:'e',date:'2026-05-06',label:'CB TOTALENERGIES',amount:-120,merchant:'TOTALENERGIES',acct:'pe'},
    {id:'d',date:'2026-05-20',label:'VIR SEPA EMIS '+label,amount:-120,merchant:label,acct:'pr'},
    {id:'k',date:'2026-05-21',label:'VIR SEPA RECU DE QONTO',amount:120,merchant:'QONTO',acct:'pe'}];
  return {schemaVersion:4,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true},{id:'pr',name:'Pro',type:'pro',confirmed:true}],ops,
    rules:{CLIENT:'revenus',TOTALENERGIES:'transport'},settings:{taux:20},...extra};
}
const mai=page=>page.evaluate(()=>{render();const p={lvl:'M',y:2026,m:5},X=agg(p,'pro'),Pe=agg(p,'perso');return {frais:X.fraisExpl,net:X.revenuNet,remu:X.remu,transport:Pe.by.transport?.net??0,perso:Pe.income,nv:virementsInconnus().length}});

test('indemnités kilométriques reconnues : frais de l’activité côté pro, déduites côté perso, jamais une rémunération',async({page})=>{
  for(const l of ['IK MAI','INDEMNITES KM','INDEMNITES KILOMETRIQUES','FRAIS KM','NOTE DE FRAIS','NDF 05','REMBOURSEMENT FRAIS']){
    await openWith(page,etat(l));
    const r=await mai(page);
    expect(r,l).toEqual({frais:120,net:3000-120-600,remu:0,transport:0,perso:0,nv:0});
  }
});

test('virement pro → perso inconnu : compté comme rémunération, question posée une fois, la réponse change le calcul',async({page})=>{
  await openWith(page,etat('VERS O MARTIN'));
  let r=await mai(page);
  expect(r).toMatchObject({frais:0,remu:120,transport:120,perso:120,nv:1});
  await page.click('nav.tabs [data-tab="operations"]');
  await page.click('.verifier [data-k="ndf"]');
  r=await mai(page);
  expect(r).toMatchObject({frais:120,remu:0,transport:0,perso:0,nv:0});
  // La réponse vaut pour les virements suivants du même libellé
  await page.evaluate(()=>{S.ops.push({id:'d2',date:'2026-06-20',label:'VIR SEPA EMIS VERS O MARTIN',amount:-80,merchant:merchantOf('VIR SEPA EMIS VERS O MARTIN'),acct:'pr'},{id:'k2',date:'2026-06-20',label:'VIR SEPA RECU DE QONTO',amount:80,merchant:'QONTO',acct:'pe'});render()});
  expect(await page.evaluate(()=>agg({lvl:'M',y:2026,m:6},'pro').fraisExpl)).toBe(80);
});

test('compte mélangé : une dépense classée « Frais remboursés par l’activité » compte côté activité',async({page})=>{
  await openWith(page,{schemaVersion:4,onboarded:true,accounts:[{id:'m',name:'Banque',type:'mixte',confirmed:true}],
    ops:[{id:'1',date:'2026-05-02',label:'VIR HONORAIRES',amount:2500,merchant:'HONORAIRES',acct:'m'},{id:'2',date:'2026-05-05',label:'CB TOTAL',amount:-90,merchant:'TOTAL',acct:'m',cat:'fraisrembourses'},{id:'3',date:'2026-05-06',label:'CB TOTAL',amount:-40,merchant:'TOTAL',acct:'m'}],
    rules:{HONORAIRES:'revenus',TOTAL:'transport'}});
  const r=await page.evaluate(()=>{const p={lvl:'M',y:2026,m:5};return [agg(p,'pro').fraisExpl,agg(p,'perso').by.transport.net]});
  expect(r).toEqual([90,40]);
});

test('compte perso seul : un virement « indemnités kilométriques » reçu est reconnu à l’import',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('releve.csv');
  fs.writeFileSync(f,'Date;Libellé;Montant\n05/05/2026;CB TOTALENERGIES;-120,00\n25/05/2026;VIR INDEMNITES KILOMETRIQUES MAI;120,00\n28/05/2026;CB CARREFOUR;-40,00\n');
  await importer(page,f);
  await expect(page.locator('.releve')).toContainText('3 opérations ajoutées');
  const r=await page.evaluate(()=>{pendingGroups().forEach(g=>{const s=S.sugg[g.m];if(s)setRule(g.m,s.c)});render();const p={lvl:'M',y:2026,m:5};return {rule:Object.values(S.rules).includes('fraisrembourses'),transport:agg(p,'perso').by.transport.net,frais:agg(p,'pro').fraisExpl,income:agg(p,'perso').income}});
  expect(r).toEqual({rule:true,transport:0,frais:120,income:0});
});
